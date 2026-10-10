export type BillingInterval = "month" | "year";

export type Plan = {
  id: string;
  priceCents: number;
  interval?: BillingInterval;
};

export type Subscription = {
  id: string;
  planId: string;
  status: "trialing" | "active" | "canceled";
  /** Beginning of the first billable period; for a trial, set this to trial end. */
  anchor: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  canceledAt?: Date;
};

export type UsageItem = {
  description: string;
  quantity: number;
  unitAmountCents: number;
  /** When provided, usage is charged only in the period containing this timestamp. */
  recordedAt?: Date;
};

export type InvoiceLine = {
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
};

export type Invoice = {
  id: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  lines: InvoiceLine[];
  subtotalCents: number;
  totalCents: number;
  status: "paid";
  idempotencyKey: string;
  paymentReference?: string;
};

function assertCents(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative whole number of cents`);
  }
}

/** Convert item quantities and integer-cent prices into a safe subtotal. */
export function calculateInvoice(lines: Array<Pick<UsageItem, "description" | "quantity" | "unitAmountCents">>): {
  lines: InvoiceLine[];
  subtotalCents: number;
  totalCents: number;
} {
  const invoiceLines = lines.map((line) => {
    assertCents(line.unitAmountCents, "unitAmountCents");
    if (!Number.isFinite(line.quantity) || line.quantity < 0) throw new RangeError("quantity must be non-negative");
    const amountCents = Math.round(line.quantity * line.unitAmountCents);
    assertCents(amountCents, "line amount");
    return { ...line, amountCents };
  });
  const subtotalCents = invoiceLines.reduce((sum, line) => sum + line.amountCents, 0);
  assertCents(subtotalCents, "subtotalCents");
  return { lines: invoiceLines, subtotalCents, totalCents: subtotalCents };
}

/** Add a metered usage event with an explicit timestamp for period attribution. */
export function recordUsage(item: UsageItem, recordedAt = new Date()): UsageItem & { recordedAt: Date } {
  if (!item.description.trim()) throw new RangeError("description is required");
  if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new RangeError("quantity must be a positive whole number");
  assertCents(item.unitAmountCents, "unitAmountCents");
  if (!Number.isFinite(recordedAt.getTime())) throw new RangeError("recordedAt must be a valid date");
  return { ...item, recordedAt: new Date(recordedAt) };
}

/** A mock payment adapter for the demo: it marks a valid whole-cent invoice paid. */
export function simulatePayment(invoice: Pick<Invoice, "id" | "totalCents">): { status: "paid"; paymentReference: string } {
  assertCents(invoice.totalCents, "totalCents");
  if (!invoice.id) throw new RangeError("invoice id is required");
  return { status: "paid", paymentReference: `sim_${invoice.id}` };
}

/** Return the next monthly/yearly boundary, clamping month-end dates (Jan 31 -> Feb 28/29). */
export function addBillingInterval(date: Date, interval: BillingInterval = "month"): Date {
  if (!Number.isFinite(date.getTime())) throw new RangeError("date must be valid");
  const result = new Date(date);
  if (interval === "year") {
    const day = result.getUTCDate();
    result.setUTCDate(1);
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
    return result;
  }
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function getBillingPeriod(start: Date, interval: BillingInterval = "month") {
  return { start: new Date(start), end: addBillingInterval(start, interval) };
}

/** Close all ended periods. Persist returned invoices and subscription together in one DB transaction. */
export function closeDuePeriods(input: {
  sub: Subscription;
  plan: Plan;
  usage: UsageItem[];
  now: Date;
}): { invoices: Invoice[]; sub: Subscription } {
  const { sub, plan, usage, now } = input;
  if (sub.planId !== plan.id) throw new Error("Plan does not match subscription");
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(sub.anchor.getTime())) throw new RangeError("now and anchor must be valid dates");
  if (sub.status === "canceled" || now < sub.anchor) return { invoices: [], sub: { ...sub } };

  const interval = plan.interval ?? "month";
  const invoices: Invoice[] = [];
  let periodStart = new Date(sub.currentPeriodStart ?? sub.anchor);
  let periodEnd = new Date(sub.currentPeriodEnd ?? addBillingInterval(periodStart, interval));

  while (periodEnd <= now) {
    const periodUsage = usage.filter((item) =>
      !item.recordedAt || (item.recordedAt >= periodStart && item.recordedAt < periodEnd),
    );
    const calculated = calculateInvoice([
      { description: `${plan.id} subscription`, quantity: 1, unitAmountCents: plan.priceCents },
      ...periodUsage,
    ]);
    const idempotencyKey = `${sub.id}:${periodEnd.toISOString()}`;
    const invoiceId = idempotencyKey;
    const payment = simulatePayment({ id: invoiceId, totalCents: calculated.totalCents });
    invoices.push({
      id: invoiceId,
      subscriptionId: sub.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      ...calculated,
      ...payment,
      idempotencyKey,
    });
    periodStart = new Date(periodEnd);
    periodEnd = addBillingInterval(periodStart, interval);
  }

  const updatedSub: Subscription = {
    ...sub,
    status: sub.status === "trialing" ? "active" : sub.status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  };
  return { invoices, sub: updatedSub };
}

/** Calculate the unused fraction of a period, rounded to the nearest cent. */
export function calculateProrationCredit(priceCents: number, periodStart: Date, periodEnd: Date, at: Date): number {
  assertCents(priceCents, "priceCents");
  const total = periodEnd.getTime() - periodStart.getTime();
  if (total <= 0) throw new RangeError("periodEnd must be after periodStart");
  const remaining = Math.max(0, Math.min(total, periodEnd.getTime() - at.getTime()));
  return Math.round((priceCents * remaining) / total);
}

/** Mark a subscription canceled and return its unused-period credit, if its period is known. */
export function cancelSubscription(sub: Subscription, at: Date, plan: Plan): { sub: Subscription; creditCents: number } {
  const creditCents = sub.currentPeriodStart && sub.currentPeriodEnd
    ? calculateProrationCredit(plan.priceCents, sub.currentPeriodStart, sub.currentPeriodEnd, at)
    : 0;
  return { sub: { ...sub, status: "canceled", canceledAt: new Date(at) }, creditCents };
}
