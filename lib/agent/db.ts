import { Plan } from "./schemas";
import { neonQuery, DEFAULT_WORKSPACE_ID, resolveNeonUserId } from "./neonSql";

export type RunStatus = "PLANNED" | "AWAITING_APPROVAL" | "APPROVED" | "EXECUTING" | "COMPLETED" | "REJECTED" | "FAILED";
export type StepStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

export interface AgentRun {
  id: string;
  prompt: string;
  status: RunStatus;
  created_by: string;
  created_at: string;
}

export interface AgentStep {
  id: string;
  run_id: string;
  step_index: number;
  tool_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: StepStatus;
}

const SEED_RUN_ID = "seed-run-saas-01";
const runsStore = new Map<string, AgentRun>([
  [SEED_RUN_ID, { id: SEED_RUN_ID, prompt: "Publish the SaaS landing page", status: "COMPLETED", created_by: "user-admin-1", created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString() }]
]);
const stepsStore = new Map<string, AgentStep[]>([
  [SEED_RUN_ID, [{ id: "seed-step-01", run_id: SEED_RUN_ID, step_index: 0, tool_name: "publishSite", input: { siteId: "saas-site-default-1" }, output: { published: true, url: "/s/nexus-saas", siteId: "saas-site-default-1" }, status: "SUCCESS" }]]
]);

function toNeonRunStatus(status: RunStatus): string {
  if (status === "PLANNED" || status === "APPROVED" || status === "EXECUTING") return "RUNNING";
  return status;
}

export async function createRun(prompt: string, plan: Plan, userId: string): Promise<AgentRun> {
  const runId = crypto.randomUUID();
  const now = new Date().toISOString();
  const run: AgentRun = { id: runId, prompt, status: "AWAITING_APPROVAL", created_by: userId, created_at: now };
  const steps: AgentStep[] = plan.map((step, index) => ({
    id: crypto.randomUUID(),
    run_id: runId,
    step_index: index,
    tool_name: step.tool,
    input: step.params,
    output: null,
    status: "PENDING",
  }));

  runsStore.set(runId, run);
  stepsStore.set(runId, steps);

  await neonQuery(
    `INSERT INTO "AgentRun" ("id", "workspaceId", "userId", "prompt", "plan", "status", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::"RunStatus", NOW(), NOW()) ON CONFLICT ("id") DO NOTHING`,
    [runId, DEFAULT_WORKSPACE_ID, resolveNeonUserId(userId), prompt, JSON.stringify(steps), toNeonRunStatus(run.status)]
  );

  return run;
}

export async function getRun(runId: string): Promise<AgentRun | null> {
  const mem = runsStore.get(runId);
  if (mem) return mem;

  const rows = await neonQuery<any>(`SELECT * FROM "AgentRun" WHERE "id" = $1 LIMIT 1`, [runId]);
  if (rows && rows.length > 0) {
    const r = rows[0];
    const hydrated: AgentRun = { id: r.id, prompt: r.prompt, status: r.status, created_by: r.userId, created_at: r.createdAt };
    runsStore.set(r.id, hydrated);
    if (Array.isArray(r.plan)) stepsStore.set(r.id, r.plan);
    return hydrated;
  }
  return null;
}

export async function getSteps(runId: string): Promise<AgentStep[]> {
  const mem = stepsStore.get(runId);
  if (mem) return mem;
  await getRun(runId);
  return stepsStore.get(runId) ?? [];
}

export async function updateRunStatus(runId: string, status: RunStatus): Promise<void> {
  const run = runsStore.get(runId);
  if (run) { run.status = status; runsStore.set(runId, run); }
  const steps = stepsStore.get(runId);
  await neonQuery(
    `UPDATE "AgentRun" SET "status" = $2::"RunStatus", "plan" = COALESCE($3::jsonb, "plan"), "updatedAt" = NOW() WHERE "id" = $1`,
    [runId, toNeonRunStatus(status), steps ? JSON.stringify(steps) : null]
  );
}

export async function updateStepStatus(stepId: string, runId: string, status: StepStatus, output: Record<string, unknown> | null = null): Promise<void> {
  const steps = stepsStore.get(runId);
  if (!steps) return;
  const step = steps.find((s) => s.id === stepId);
  if (step) { step.status = status; if (output !== null) step.output = output; }
  await neonQuery(`UPDATE "AgentRun" SET "plan" = $2::jsonb, "updatedAt" = NOW() WHERE "id" = $1`, [runId, JSON.stringify(steps)]);
}

export async function listRuns(): Promise<AgentRun[]> {
  const rows = await neonQuery<any>(`SELECT * FROM "AgentRun" WHERE "workspaceId" = $1 ORDER BY "createdAt" DESC LIMIT 20`, [DEFAULT_WORKSPACE_ID]);
  if (rows && rows.length > 0) {
    for (const r of rows) {
      if (!runsStore.has(r.id)) runsStore.set(r.id, { id: r.id, prompt: r.prompt, status: r.status, created_by: r.userId, created_at: r.createdAt });
      if (Array.isArray(r.plan) && !stepsStore.has(r.id)) stepsStore.set(r.id, r.plan);
    }
  }
  return Array.from(runsStore.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const getAllRuns = listRuns;
