import { NextResponse } from "next/server";
import { LeadSource, LeadStatus } from "@prisma/client";
import { createLead, listLeads } from "@/lib/crm";



const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const source = body?.source;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  if (source !== "SITE" && source !== "WEBINAR") {
    return NextResponse.json({ error: "Source must be SITE or WEBINAR" }, { status: 400 });
  }

  const { lead, created } = await createLead({ name, email, source: source as LeadSource });
  return NextResponse.json({ id: lead.id, created }, { status: created ? 201 : 200 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as LeadStatus | null;
  const source = searchParams.get("source") as LeadSource | null;

  const leads = await listLeads({
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
  });
  return NextResponse.json({ leads });
}
