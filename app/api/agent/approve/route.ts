import { NextRequest, NextResponse } from "next/server";
import { approveRun } from "@/lib/agent/orchestrator";
import { getRun, getSteps } from "@/lib/agent/db";
import { UnauthorizedError } from "@/lib/agent/security";

export async function POST(req: NextRequest) {
  try {
    const { runId, user } = await req.json();
    await approveRun(runId, user);
    const run = await getRun(runId);
    const steps = await getSteps(runId);
    return NextResponse.json({ status: run?.status ?? "APPROVED", run, steps }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
