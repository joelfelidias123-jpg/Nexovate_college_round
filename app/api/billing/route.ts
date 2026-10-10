import { calculateInvoice, calculateProrationCredit, cancelSubscription, closeDuePeriods, recordUsage } from "@/lib/billing";
import { getStore, updateStore, makeId } from "@/lib/store";

export async function GET() {
  const state = await getStore();
  const currentPlan = state.plans.find((plan) => plan.id === state.subscription.planId);
  return Response.json({ ...state, currentPlan });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  if (body.action === "record_usage") {
    const description = String(body.description ?? "").trim();
    const quantity = Number(body.quantity);
    const unitAmountCents = Number(body.unitAmountCents);
    if (!description || !Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(unitAmountCents) || unitAmountCents < 0) {
      return Response.json({ error: "Provide a description, positive whole quantity, and non-negative unit cents" }, { status: 400 });
    }
    const { result } = await updateStore((state) => {
      const item = { id: makeId("usage"), ...recordUsage({ description, quantity, unitAmountCents }) };
      state.usage.unshift(item);
      return item;
    });
    return Response.json({ usage: result }, { status: 201 });
  }

  if (body.action === "quote") {
    const state = await getStore();
    const plan = state.plans.find((item) => item.id === body.planId);
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });
    const usageQty = Number(body.usageQty ?? 0);
    const unitAmountCents = Number(body.unitAmountCents ?? 0);
    if (!Number.isSafeInteger(usageQty) || usageQty < 0 || !Number.isSafeInteger(unitAmountCents) || unitAmountCents < 0) {
      return Response.json({ error: "Usage quantity and cents must be non-negative whole numbers" }, { status: 400 });
    }
    return Response.json(calculateInvoice([
      { description: `${plan.name} subscription`, quantity: 1, unitAmountCents: plan.priceCents },
      ...(usageQty ? [{ description: String(body.usageDescription ?? "Usage"), quantity: usageQty, unitAmountCents }] : []),
    ]));
  }

  if (body.action === "close_periods") {
    const now = body.now === undefined ? new Date() : new Date(String(body.now));
    if (!Number.isFinite(now.getTime())) return Response.json({ error: "now must be a valid date" }, { status: 400 });
    const { result } = await updateStore((state) => {
      const plan = state.plans.find((item) => item.id === state.subscription.planId);
      if (!plan) throw new Error("The subscription plan is missing");
      const closed = closeDuePeriods({ sub: state.subscription, plan, usage: state.usage, now });
      const existingKeys = new Set(state.invoices.map((invoice) => invoice.idempotencyKey));
      const freshInvoices = closed.invoices.filter((invoice) => !existingKeys.has(invoice.idempotencyKey));
      state.invoices.unshift(...freshInvoices.map((invoice) => ({ ...invoice, createdAt: new Date() })));
      state.subscription = closed.sub;
      return { invoices: freshInvoices, sub: state.subscription };
    });
    return Response.json(result);
  }

  if (body.action === "change_plan") {
    const { result } = await updateStore((state) => {
      const next = state.plans.find((item) => item.id === body.planId);
      const current = state.plans.find((item) => item.id === state.subscription.planId);
      if (!next || !current) return { error: "Plan not found" as const };
      const creditCents = state.subscription.currentPeriodStart && state.subscription.currentPeriodEnd
        ? calculateProrationCredit(current.priceCents, state.subscription.currentPeriodStart, state.subscription.currentPeriodEnd, new Date())
        : 0;
      const chargeCents = state.subscription.currentPeriodStart && state.subscription.currentPeriodEnd
        ? calculateProrationCredit(next.priceCents, state.subscription.currentPeriodStart, state.subscription.currentPeriodEnd, new Date())
        : next.priceCents;
      state.subscription.planId = next.id;
      return { subscription: state.subscription, creditCents, chargeCents, prorationNetCents: chargeCents - creditCents };
    });
    return "error" in result ? Response.json({ error: result.error }, { status: 404 }) : Response.json(result);
  }

  if (body.action === "cancel") {
    const { result } = await updateStore((state) => {
      const plan = state.plans.find((item) => item.id === state.subscription.planId);
      if (!plan) throw new Error("The subscription plan is missing");
      const canceled = cancelSubscription(state.subscription, new Date(), plan);
      state.subscription = canceled.sub;
      return canceled;
    });
    return Response.json(result);
  }

  return Response.json({ error: "Unknown billing action" }, { status: 400 });
}
