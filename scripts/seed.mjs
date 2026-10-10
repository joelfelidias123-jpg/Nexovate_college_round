import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { buildSeedState } from "../lib/seed-data.mjs";

// Node does not load Next.js .env.local automatically. Read only the database
// URL into the environment; never print it.
if (!process.env.DATABASE_URL) {
  try {
    const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    const line = env.split(/\r?\n/).find((item) => /^\s*DATABASE_URL\s*=/.test(item));
    if (line) process.env.DATABASE_URL = line.replace(/^\s*DATABASE_URL\s*=\s*/, "").replace(/^['"]|['"]$/g, "").trim();
  } catch { /* use DATABASE_URL supplied by the shell */ }
}
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local or the shell environment.");

const db = new PrismaClient();
try {
  const state = buildSeedState();
  const existing = await db.p4Store.findUnique({ where: { id: "nexovate-p4-demo" } });
  if (existing) {
    await db.p4InvoiceIdempotency.createMany({
      data: existing.state.invoices.map((invoice) => ({ idempotencyKey: invoice.idempotencyKey, invoiceId: invoice.id })),
      skipDuplicates: true,
    });
    console.log("P4 demo data already exists; it was left unchanged.");
  } else {
    await db.$transaction(async (tx) => {
      await tx.p4Store.create({ data: { id: "nexovate-p4-demo", state } });
      await tx.p4InvoiceIdempotency.createMany({
        data: state.invoices.map((invoice) => ({ idempotencyKey: invoice.idempotencyKey, invoiceId: invoice.id })),
      });
    });
    console.log("P4 demo data seeded into PostgreSQL.");
  }
} finally {
  await db.$disconnect();
}
