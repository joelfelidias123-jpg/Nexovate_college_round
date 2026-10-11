import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { rejectRun } from "@/lib/agent/orchestrator";
import { getRun, getSteps } from "@/lib/agent/db";
import { UnauthorizedError } from "@/lib/agent/security";

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole("ADMIN");
  if (error) return error;

  try {
    const body = await req.json();
    await rejectRun(body.runId, { id: user.id, role: user.role.toLowerCase() as "admin" | "member" });
    const run = await getRun(body.runId);
    const steps = await getSteps(body.runId);
    return NextResponse.json({ status: "REJECTED", run, steps });
  } catch (err) {
    const status = err instanceof UnauthorizedError ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
