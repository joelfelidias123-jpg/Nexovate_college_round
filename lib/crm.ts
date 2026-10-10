import { db } from "@/lib/db";
import { LeadSource, LeadStatus } from "@prisma/client";

const WORKSPACE_ID = "ws_demo";

export async function createLead(input: { name: string; email: string; source: LeadSource }) {
  const email = input.email.trim().toLowerCase();

  const existing = await db.lead.findUnique({
    where: { workspaceId_email: { workspaceId: WORKSPACE_ID, email } },
  });

  if (existing) {
    await db.leadEvent.create({
      data: { leadId: existing.id, type: "returning", note: `Came back via ${input.source.toLowerCase()}` },
    });
    return { lead: existing, created: false };
  }

  const lead = await db.lead.create({
    data: {
      workspaceId: WORKSPACE_ID,
      name: input.name.trim(),
      email,
      source: input.source,
      events: { create: { type: "created", note: `Added from ${input.source.toLowerCase()}` } },
    },
  });
  return { lead, created: true };
}

export async function listLeads(filter?: { status?: LeadStatus; source?: LeadSource }) {
  return db.lead.findMany({
    where: { workspaceId: WORKSPACE_ID, ...filter },
    orderBy: { createdAt: "desc" },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const lead = await db.lead.update({ where: { id }, data: { status } });
  await db.leadEvent.create({
    data: { leadId: id, type: "status", note: `Status changed to ${status.toLowerCase()}` },
  });
  return lead;
}