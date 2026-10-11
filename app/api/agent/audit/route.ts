import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAuditLog } from "@/lib/agent/audit";

export async function GET(req: Request) {
  const { error } = await requireRole();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId") ?? undefined;
  const log = await getAuditLog(runId);
  return NextResponse.json({ log }, { status: 200 });
}
