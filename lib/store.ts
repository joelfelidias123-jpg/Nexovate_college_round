import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildSeedState } from "@/lib/seed-data.mjs";
import type { Invoice, Plan, Subscription, UsageItem } from "@/lib/billing";

export type PlanRecord = Plan & { name: string; description: string };
export type UsageRecord = UsageItem & { id: string; recordedAt: Date };
export type InvoiceRecord = Invoice & { createdAt: Date };
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type Campaign = { id: string; name: string; subject: string; preview: string; text: string; status: CampaignStatus; audience: string; recipients: string[]; createdAt: Date; scheduledAt?: Date; sentAt?: Date; opens: number; clicks: number; sendError?: string; generatedBy?: "gemini" | "starter" };
export type CampaignEvent = { id: string; campaignId: string; kind: "open" | "click"; targetUrl?: string; createdAt: Date };
export type SiteStatus = "draft" | "published";
export type Site = { id: string; slug: string; title: string; status: SiteStatus; templateId: string; content: Record<string, unknown>; createdAt: Date; updatedAt: Date; publishedAt?: Date };
export type WebinarStatus = "draft" | "published" | "completed" | "canceled";
export type Webinar = { id: string; siteId?: string; title: string; slug: string; description: string; status: WebinarStatus; startsAt: Date; endsAt: Date; joinUrl?: string; createdAt: Date };
export type RegistrationStatus = "registered" | "attended" | "canceled";
export type Registration = { id: string; webinarId: string; name: string; email: string; status: RegistrationStatus; registeredAt: Date };
export type Attendance = { id: string; webinarId: string; registrationId: string; checkedInAt: Date; source: string };
export type StoreState = { plans: PlanRecord[]; subscription: Subscription; usage: UsageRecord[]; invoices: InvoiceRecord[]; campaigns: Campaign[]; campaignEvents: CampaignEvent[]; sites: Site[]; webinars: Webinar[]; registrations: Registration[]; attendance: Attendance[] };

const STORE_ID = "nexovate-p4-demo";
let queue: Promise<unknown> = Promise.resolve();

// JSONB stores dates as strings; restore them before application code uses them.
const DATE_FIELDS = new Set(["recordedAt", "createdAt", "scheduledAt", "sentAt", "updatedAt", "publishedAt", "anchor", "currentPeriodStart", "currentPeriodEnd", "canceledAt", "periodStart", "periodEnd", "startsAt", "endsAt", "registeredAt", "checkedInAt"]);
function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, DATE_FIELDS.has(key) && typeof item === "string" ? new Date(item) : revive(item)]));
  return value;
}
function serialize(state: StoreState): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(state)) as Prisma.InputJsonValue;
}
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}
async function ensureStore(): Promise<void> {
  const seeded = buildSeedState() as StoreState;
  await db.$transaction(async (tx) => {
    await tx.p4Store.upsert({
      where: { id: STORE_ID },
      create: { id: STORE_ID, state: serialize(seeded) },
      update: {},
    });
    // A row lock also protects first-use initialization if two requests arrive
    // before either has populated an empty state document.
    await tx.$queryRaw`SELECT "id" FROM "P4Store" WHERE "id" = ${STORE_ID} FOR UPDATE`;
    const row = await tx.p4Store.findUniqueOrThrow({ where: { id: STORE_ID } });
    const document = revive(row.state) as Partial<StoreState> | null;
    const initialized = Boolean(document && Array.isArray(document.plans) && document.subscription
      && Array.isArray(document.usage) && Array.isArray(document.invoices) && Array.isArray(document.campaigns)
      && Array.isArray(document.campaignEvents) && Array.isArray(document.sites) && Array.isArray(document.webinars)
      && Array.isArray(document.registrations) && Array.isArray(document.attendance));
    const state = initialized ? document as StoreState : seeded;
    if (!initialized) {
      await tx.p4Store.update({ where: { id: STORE_ID }, data: { state: serialize(seeded) } });
    }
    await tx.p4InvoiceIdempotency.createMany({
      data: state.invoices.map((invoice) => ({ idempotencyKey: invoice.idempotencyKey, invoiceId: invoice.id })),
      skipDuplicates: true,
    });
  });
}

export function getStore(): Promise<StoreState> {
  return enqueue(async () => {
    await ensureStore();
    const row = await db.p4Store.findUniqueOrThrow({ where: { id: STORE_ID } });
    return revive(row.state) as StoreState;
  });
}

export function updateStore<T>(update: (state: StoreState) => T | Promise<T>): Promise<{ state: StoreState; result: T }> {
  return enqueue(async () => {
    await ensureStore();
    return db.$transaction(async (tx) => {
      // Serialize writers across server instances, so concurrent API requests
      // cannot overwrite each other's changes to the shared state document.
      await tx.$queryRaw`SELECT "id" FROM "P4Store" WHERE "id" = ${STORE_ID} FOR UPDATE`;
      const row = await tx.p4Store.findUniqueOrThrow({ where: { id: STORE_ID } });
      const state = revive(row.state) as StoreState;
      const result = await update(state);
      await tx.p4InvoiceIdempotency.deleteMany();
      await tx.p4InvoiceIdempotency.createMany({
        data: state.invoices.map((invoice) => ({ idempotencyKey: invoice.idempotencyKey, invoiceId: invoice.id })),
      });
      await tx.p4Store.update({ where: { id: STORE_ID }, data: { state: serialize(state) } });
      return { state, result };
    }, { maxWait: 10000, timeout: 20000 });
  });
}

export function makeId(prefix: string): string { return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`; }
