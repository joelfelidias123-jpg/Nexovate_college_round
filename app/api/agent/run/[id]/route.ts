import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getRun, getSteps } from "@/lib/agent/db";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const { error } = await requireRole();
  if (error) return error;
  const { id } = await context.params;
  const run = await getRun(id);
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  const steps = await getSteps(id);
  return NextResponse.json({ run, steps });
}
