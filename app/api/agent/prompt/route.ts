import { NextRequest, NextResponse } from "next/server";
import { submitPrompt } from "@/lib/agent/orchestrator";
import { getAllRuns, getSteps } from "@/lib/agent/db";
import { UnauthorizedError } from "@/lib/agent/security";

export async function GET() {
  const runs = await getAllRuns();
  return NextResponse.json({ runs }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, user } = await req.json();
    if (!prompt || !user?.id || !user?.role) {
      return NextResponse.json({ error: "Missing prompt or user" }, { status: 400 });
    }
    const run = await submitPrompt(prompt, user);
    const steps = await getSteps(run.id);
    return NextResponse.json({ run, steps }, { status: 200 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
