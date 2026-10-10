import { NextResponse } from "next/server";
import { updateLeadStatus } from "@/lib/crm";


const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const lead = await updateLeadStatus(id, status);
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}