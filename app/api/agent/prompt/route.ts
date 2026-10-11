import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { submitPrompt } from "@/lib/agent/orchestrator";
import { getAllRuns, getSteps } from "@/lib/agent/db";
import { SecurityError, UnauthorizedError } from "@/lib/agent/security";

export async function GET() {
  const { error } = await requireRole();
  if (error) return error;
  const runs = await getAllRuns();
  return NextResponse.json({ runs }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole();
  if (error) return error;

  try {
    const body = await req.json();
    const run = await submitPrompt(body.prompt ?? "", { id: user.id, role: user.role.toLowerCase() as "admin" | "member" });
    const steps = await getSteps(run.id);
    return NextResponse.json({ run, steps }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 403 });
    const status = err instanceof SecurityError ? 400 : 500;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
