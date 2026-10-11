import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { approveRun } from "@/lib/agent/orchestrator";
import { getRun, getSteps } from "@/lib/agent/db";
import { UnauthorizedError, SecurityError } from "@/lib/agent/security";

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole("ADMIN");
  if (error) return error;

  try {
    const body = await req.json();
    await approveRun(body.runId, { id: user.id, role: user.role.toLowerCase() as "admin" | "member" });
    const run = await getRun(body.runId);
    const steps = await getSteps(body.runId);
    return NextResponse.json({ status: run?.status ?? "COMPLETED", run, steps });
  } catch (err) {
    const status = err instanceof UnauthorizedError ? 403 : err instanceof SecurityError ? 400 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
