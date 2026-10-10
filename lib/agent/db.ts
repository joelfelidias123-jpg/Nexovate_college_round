// ============================================================================
// FILE: lib/agent/db.ts — DB Access Layer (swap in real client from P1)
// ============================================================================
// This file isolates all database calls behind simple functions.
// Replace the internals with actual Supabase/Postgres calls once
// P1 shares the real client — nothing else in your code needs to change.

import crypto from "node:crypto";
import { Plan, PlanStep } from "./schemas";

export type RunStatus =
  | "PLANNED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "COMPLETED"
  | "FAILED";

export type StepStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface AgentRun {
  id: string;
  prompt: string;
  plan: Plan;
  status: RunStatus;
  created_by: string;
  created_at: string;
}

export interface AgentStep {
  id: string;
  run_id: string;
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: StepStatus;
  started_at: string | null;
  completed_at: string | null;
}

// --- TEMPORARY in-memory store so you can build/test before P1's DB
// --- is wired up. Stored on globalThis so Next.js dev hot-reloads
// --- don't wipe active runs between API route invocations.

const globalDb = globalThis as unknown as {
  __nexusRuns?: Map<string, AgentRun>;
  __nexusSteps?: Map<string, AgentStep[]>;
};

const runs = globalDb.__nexusRuns ?? (globalDb.__nexusRuns = new Map<string, AgentRun>());
const steps = globalDb.__nexusSteps ?? (globalDb.__nexusSteps = new Map<string, AgentStep[]>());

export async function createRun(
  prompt: string,
  plan: Plan,
  userId: string
): Promise<AgentRun> {
  const run: AgentRun = {
    id: crypto.randomUUID(),
    prompt,
    plan,
    status: "AWAITING_APPROVAL",
    created_by: userId,
    created_at: new Date().toISOString(),
  };
  runs.set(run.id, run);

  // Create one step record per plan step, all starting as PENDING
  const runSteps: AgentStep[] = plan.map((step: PlanStep) => ({
    id: crypto.randomUUID(),
    run_id: run.id,
    tool_name: step.tool,
    input: step.params,
    output: null,
    status: "PENDING",
    started_at: null,
    completed_at: null,
  }));
  steps.set(run.id, runSteps);

  return run;
}

export async function getRun(runId: string): Promise<AgentRun | undefined> {
  return runs.get(runId);
}

export async function getAllRuns(): Promise<AgentRun[]> {
  return Array.from(runs.values()).reverse();
}

export async function getSteps(runId: string): Promise<AgentStep[]> {
  return steps.get(runId) ?? [];
}

export async function updateRunStatus(
  runId: string,
  status: RunStatus
): Promise<void> {
  const run = runs.get(runId);
  if (run) run.status = status;
}

export async function updateStepStatus(
  stepId: string,
  runId: string,
  status: StepStatus,
  output: Record<string, unknown> | null = null
): Promise<void> {
  const runSteps = steps.get(runId) ?? [];
  const step = runSteps.find((s) => s.id === stepId);
  if (!step) return;

  step.status = status;
  step.output = output;
  if (status === "RUNNING") step.started_at = new Date().toISOString();
  if (status === "SUCCESS" || status === "FAILED") {
    step.completed_at = new Date().toISOString();
  }
}
