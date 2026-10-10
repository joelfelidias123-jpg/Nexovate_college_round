import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import initSqlJs from "sql.js";
import type { BillingInterval, Invoice, InvoiceLine, Plan, Subscription, UsageItem } from "@/lib/billing";

export type PlanRecord = Plan & { name: string; description: string };
export type UsageRecord = UsageItem & { id: string; recordedAt: Date };
export type InvoiceRecord = Invoice & { createdAt: Date };
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type Campaign = {
  id: string; name: string; subject: string; preview: string; text: string;
  status: CampaignStatus; audience: string; recipients: string[]; createdAt: Date;
  scheduledAt?: Date; sentAt?: Date; opens: number; clicks: number;
  sendError?: string; generatedBy?: "gemini" | "starter";
};
export type CampaignEvent = { id: string; campaignId: string; kind: "open" | "click"; targetUrl?: string; createdAt: Date };
export type SiteStatus = "draft" | "published";
export type Site = {
  id: string; slug: string; title: string; status: SiteStatus; templateId: string;
  content: Record<string, unknown>; createdAt: Date; updatedAt: Date; publishedAt?: Date;
};
export type WebinarStatus = "draft" | "published" | "completed" | "canceled";
export type Webinar = {
  id: string; siteId?: string; title: string; slug: string; description: string;
  status: WebinarStatus; startsAt: Date; endsAt: Date; joinUrl?: string; createdAt: Date;
};
export type RegistrationStatus = "registered" | "attended" | "canceled";
export type Registration = { id: string; webinarId: string; name: string; email: string; status: RegistrationStatus; registeredAt: Date };
export type Attendance = { id: string; webinarId: string; registrationId: string; checkedInAt: Date; source: string };

export type StoreState = {
  plans: PlanRecord[]; subscription: Subscription; usage: UsageRecord[]; invoices: InvoiceRecord[];
  campaigns: Campaign[]; campaignEvents: CampaignEvent[]; sites: Site[]; webinars: Webinar[];
  registrations: Registration[]; attendance: Attendance[];
};

type Row = Record<string, string | number | Uint8Array | null>;
type SqlValue = string | number | Uint8Array | null;
type SqlDatabase = initSqlJs.Database;
type GlobalWithDb = typeof globalThis & { __nexovateDatabase?: Promise<SqlDatabase> };
const globalWithDb = globalThis as GlobalWithDb;
let queue: Promise<unknown> = Promise.resolve();

function databaseFile(): string {
  const configured = process.env.DATABASE_PATH ?? ".data/nexus.sqlite";
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

async function persistDatabase(database: SqlDatabase): Promise<void> {
  const file = databaseFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, Buffer.from(database.export()));
  await rename(temporary, file);
}

async function initializeDatabase(): Promise<SqlDatabase> {
  const file = databaseFile();
  await mkdir(path.dirname(file), { recursive: true });
  let existing: Buffer | undefined;
  try { existing = await readFile(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }

  const SQL = await initSqlJs({ locateFile: (asset) => path.join(process.cwd(), "node_modules", "sql.js", "dist", asset) });
  const database = new SQL.Database(existing ? new Uint8Array(existing) : undefined);
  database.run("PRAGMA foreign_keys = ON;");
  database.run(await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
  const plans = database.exec("SELECT COUNT(*) AS count FROM plans")[0]?.values[0]?.[0] ?? 0;
  if (Number(plans) === 0) {
    database.run("BEGIN");
    try {
      database.run(await readFile(path.join(process.cwd(), "db", "seed.sql"), "utf8"));
      database.run("COMMIT");
    } catch (error) { database.run("ROLLBACK"); throw error; }
    await persistDatabase(database);
  } else if (!existing) {
    await persistDatabase(database);
  }
  return database;
}

function getDatabase(): Promise<SqlDatabase> {
  globalWithDb.__nexovateDatabase ??= initializeDatabase();
  return globalWithDb.__nexovateDatabase;
}

function query(database: SqlDatabase, sql: string): Row[] {
  const statement = database.prepare(sql);
  const result: Row[] = [];
  try { while (statement.step()) result.push(statement.getAsObject() as Row); }
  finally { statement.free(); }
  return result;
}

function run(database: SqlDatabase, sql: string, values: SqlValue[] = []): void {
  database.run(sql, values);
}

function requiredString(row: Row, key: string): string { return String(row[key] ?? ""); }
function optionalString(row: Row, key: string): string | undefined { const value = row[key]; return value == null ? undefined : String(value); }
function numberValue(row: Row, key: string): number { return Number(row[key] ?? 0); }
function dateValue(row: Row, key: string): Date { return new Date(requiredString(row, key)); }
function optionalDate(row: Row, key: string): Date | undefined { const value = row[key]; return value == null ? undefined : new Date(String(value)); }
function parseJson<T>(row: Row, key: string, fallback: T): T {
  const value = row[key];
  return typeof value === "string" ? JSON.parse(value) as T : fallback;
}
function iso(value?: Date): string | null { return value ? value.toISOString() : null; }

function readState(database: SqlDatabase): StoreState {
  const plans: PlanRecord[] = query(database, "SELECT * FROM plans ORDER BY price_cents").map((row) => ({
    id: requiredString(row, "id"), name: requiredString(row, "name"), description: requiredString(row, "description"),
    priceCents: numberValue(row, "price_cents"), interval: requiredString(row, "interval") as BillingInterval,
  }));
  const subscriptionRow = query(database, "SELECT * FROM subscriptions LIMIT 1")[0];
  if (!subscriptionRow) throw new Error("No subscription seed row exists. Run npm run db:seed.");
  const subscription: Subscription = {
    id: requiredString(subscriptionRow, "id"), planId: requiredString(subscriptionRow, "plan_id"),
    status: requiredString(subscriptionRow, "status") as Subscription["status"], anchor: dateValue(subscriptionRow, "anchor"),
    currentPeriodStart: optionalDate(subscriptionRow, "current_period_start"),
    currentPeriodEnd: optionalDate(subscriptionRow, "current_period_end"), canceledAt: optionalDate(subscriptionRow, "canceled_at"),
  };
  const usage: UsageRecord[] = query(database, "SELECT * FROM usage_records ORDER BY recorded_at DESC").map((row) => ({
    id: requiredString(row, "id"), description: requiredString(row, "description"), quantity: numberValue(row, "quantity"),
    unitAmountCents: numberValue(row, "unit_amount_cents"), recordedAt: dateValue(row, "recorded_at"),
  }));
  const invoices: InvoiceRecord[] = query(database, "SELECT * FROM invoices ORDER BY created_at DESC").map((row) => ({
    id: requiredString(row, "id"), subscriptionId: requiredString(row, "subscription_id"), periodStart: dateValue(row, "period_start"),
    periodEnd: dateValue(row, "period_end"), lines: parseJson<InvoiceLine[]>(row, "lines_json", []),
    subtotalCents: numberValue(row, "subtotal_cents"), totalCents: numberValue(row, "total_cents"),
    status: requiredString(row, "status") as Invoice["status"], idempotencyKey: requiredString(row, "idempotency_key"),
    paymentReference: optionalString(row, "payment_reference"), createdAt: dateValue(row, "created_at"),
  }));
  const campaigns: Campaign[] = query(database, "SELECT * FROM campaigns ORDER BY created_at DESC").map((row) => ({
    id: requiredString(row, "id"), name: requiredString(row, "name"), subject: requiredString(row, "subject"),
    preview: requiredString(row, "preview"), text: requiredString(row, "body_text"), status: requiredString(row, "status") as CampaignStatus,
    audience: requiredString(row, "audience"), recipients: parseJson<string[]>(row, "recipients_json", []),
    createdAt: dateValue(row, "created_at"), scheduledAt: optionalDate(row, "scheduled_at"), sentAt: optionalDate(row, "sent_at"),
    opens: numberValue(row, "opens"), clicks: numberValue(row, "clicks"), sendError: optionalString(row, "send_error"),
    generatedBy: optionalString(row, "generated_by") as Campaign["generatedBy"],
  }));
  const campaignEvents: CampaignEvent[] = query(database, "SELECT * FROM campaign_events ORDER BY created_at DESC").map((row) => ({
    id: requiredString(row, "id"), campaignId: requiredString(row, "campaign_id"), kind: requiredString(row, "kind") as CampaignEvent["kind"],
    targetUrl: optionalString(row, "target_url"), createdAt: dateValue(row, "created_at"),
  }));
  const sites: Site[] = query(database, "SELECT * FROM sites ORDER BY created_at DESC").map((row) => ({
    id: requiredString(row, "id"), slug: requiredString(row, "slug"), title: requiredString(row, "title"),
    status: requiredString(row, "status") as SiteStatus, templateId: requiredString(row, "template_id"),
    content: parseJson<Record<string, unknown>>(row, "content_json", {}), createdAt: dateValue(row, "created_at"),
    updatedAt: dateValue(row, "updated_at"), publishedAt: optionalDate(row, "published_at"),
  }));
  const webinars: Webinar[] = query(database, "SELECT * FROM webinars ORDER BY starts_at").map((row) => ({
    id: requiredString(row, "id"), siteId: optionalString(row, "site_id"), title: requiredString(row, "title"),
    slug: requiredString(row, "slug"), description: requiredString(row, "description"), status: requiredString(row, "status") as WebinarStatus,
    startsAt: dateValue(row, "starts_at"), endsAt: dateValue(row, "ends_at"), joinUrl: optionalString(row, "join_url"), createdAt: dateValue(row, "created_at"),
  }));
  const registrations: Registration[] = query(database, "SELECT * FROM registrations ORDER BY registered_at DESC").map((row) => ({
    id: requiredString(row, "id"), webinarId: requiredString(row, "webinar_id"), name: requiredString(row, "name"),
    email: requiredString(row, "email"), status: requiredString(row, "status") as RegistrationStatus, registeredAt: dateValue(row, "registered_at"),
  }));
  const attendance: Attendance[] = query(database, "SELECT * FROM attendance ORDER BY checked_in_at DESC").map((row) => ({
    id: requiredString(row, "id"), webinarId: requiredString(row, "webinar_id"), registrationId: requiredString(row, "registration_id"),
    checkedInAt: dateValue(row, "checked_in_at"), source: requiredString(row, "source"),
  }));
  return { plans, subscription, usage, invoices, campaigns, campaignEvents, sites, webinars, registrations, attendance };
}

function replaceState(database: SqlDatabase, state: StoreState): void {
  database.run(`
    DELETE FROM attendance; DELETE FROM registrations; DELETE FROM webinars; DELETE FROM sites;
    DELETE FROM campaign_events; DELETE FROM campaigns; DELETE FROM invoices; DELETE FROM usage_records;
    DELETE FROM subscriptions; DELETE FROM plans;
  `);
  for (const plan of state.plans) run(database, "INSERT INTO plans (id,name,description,price_cents,interval) VALUES (?,?,?,?,?)", [plan.id, plan.name, plan.description, plan.priceCents, String(plan.interval)]);
  const sub = state.subscription;
  run(database, "INSERT INTO subscriptions (id,plan_id,status,anchor,current_period_start,current_period_end,canceled_at) VALUES (?,?,?,?,?,?,?)", [sub.id, sub.planId, sub.status, sub.anchor.toISOString(), iso(sub.currentPeriodStart) as SqlValue, iso(sub.currentPeriodEnd) as SqlValue, iso(sub.canceledAt) as SqlValue]);
  for (const item of state.usage) run(database, "INSERT INTO usage_records (id,subscription_id,description,quantity,unit_amount_cents,recorded_at) VALUES (?,?,?,?,?,?)", [item.id, sub.id, item.description, item.quantity, item.unitAmountCents, item.recordedAt.toISOString()]);
  for (const invoice of state.invoices) run(database, "INSERT INTO invoices (id,subscription_id,period_start,period_end,lines_json,subtotal_cents,total_cents,status,idempotency_key,payment_reference,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [invoice.id, invoice.subscriptionId, invoice.periodStart.toISOString(), invoice.periodEnd.toISOString(), JSON.stringify(invoice.lines), invoice.subtotalCents, invoice.totalCents, invoice.status, invoice.idempotencyKey, invoice.paymentReference ?? null, invoice.createdAt.toISOString()]);
  for (const campaign of state.campaigns) run(database, "INSERT INTO campaigns (id,name,subject,preview,body_text,status,audience,recipients_json,created_at,scheduled_at,sent_at,opens,clicks,send_error,generated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", [campaign.id,campaign.name,campaign.subject,campaign.preview,campaign.text,campaign.status,campaign.audience,JSON.stringify(campaign.recipients),campaign.createdAt.toISOString(),iso(campaign.scheduledAt),iso(campaign.sentAt),campaign.opens,campaign.clicks,campaign.sendError ?? null,campaign.generatedBy ?? null]);
  for (const event of state.campaignEvents) run(database, "INSERT INTO campaign_events (id,campaign_id,kind,target_url,created_at) VALUES (?,?,?,?,?)", [event.id,event.campaignId,event.kind,event.targetUrl ?? null,event.createdAt.toISOString()]);
  for (const site of state.sites) run(database, "INSERT INTO sites (id,slug,title,status,template_id,content_json,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?)", [site.id,site.slug,site.title,site.status,site.templateId,JSON.stringify(site.content),site.createdAt.toISOString(),site.updatedAt.toISOString(),iso(site.publishedAt)]);
  for (const webinar of state.webinars) run(database, "INSERT INTO webinars (id,site_id,title,slug,description,status,starts_at,ends_at,join_url,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", [webinar.id,webinar.siteId ?? null,webinar.title,webinar.slug,webinar.description,webinar.status,webinar.startsAt.toISOString(),webinar.endsAt.toISOString(),webinar.joinUrl ?? null,webinar.createdAt.toISOString()]);
  for (const registration of state.registrations) run(database, "INSERT INTO registrations (id,webinar_id,name,email,status,registered_at) VALUES (?,?,?,?,?,?)", [registration.id,registration.webinarId,registration.name,registration.email,registration.status,registration.registeredAt.toISOString()]);
  for (const record of state.attendance) run(database, "INSERT INTO attendance (id,webinar_id,registration_id,checked_in_at,source) VALUES (?,?,?,?,?)", [record.id,record.webinarId,record.registrationId,record.checkedInAt.toISOString(),record.source]);
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

export function getStore(): Promise<StoreState> {
  return enqueue(async () => readState(await getDatabase()));
}

export function updateStore<T>(update: (state: StoreState) => T | Promise<T>): Promise<{ state: StoreState; result: T }> {
  return enqueue(async () => {
    const database = await getDatabase();
    database.run("BEGIN IMMEDIATE");
    try {
      const state = readState(database);
      const result = await update(state);
      replaceState(database, state);
      database.run("COMMIT");
      await persistDatabase(database);
      return { state, result };
    } catch (error) {
      try { database.run("ROLLBACK"); } catch { /* transaction may already be committed */ }
      throw error;
    }
  });
}

export function makeId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}
