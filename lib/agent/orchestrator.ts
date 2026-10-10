import { planWithLLM } from "./llmPlanner";
import { createRun, getRun, updateRunStatus } from "./db";
import { executeRun, executeUntilApprovalGate } from "./executor";
import {
  assertCanApprove,
  assertNotReplayedApproval,
  assertSafeAndPrivatePrompt,
  assertWithinRateLimit,
  User,
} from "./security";
import { logAudit } from "./audit";

export async function submitPrompt(prompt: string, user: User) {
  let safePrompt: string;
  try {
    assertWithinRateLimit(user.id);
    safePrompt = assertSafeAndPrivatePrompt(prompt);
  } catch (err) {
    await logAudit(null, user.id, "PROMPT_BLOCKED_SECURITY", { error: (err as Error).message });
    throw err;
  }

  const { plan, source } = await planWithLLM(safePrompt);
  const run = await createRun(safePrompt, plan, user.id);
  await logAudit(run.id, user.id, "PLAN_CREATED", { prompt: safePrompt, source });
  await executeUntilApprovalGate(run.id);
  return (await getRun(run.id)) ?? run;
}

export async function approveRun(runId: string, user: User) {
  try {
    assertCanApprove(user);
  } catch (err) {
    await logAudit(runId, user.id, "APPROVE_DENIED_UNAUTHORIZED", { role: user?.role });
    throw err;
  }

  const run = await getRun(runId);
  if (!run) throw new Error("Run not found");
  if (run.status !== "AWAITING_APPROVAL") {
    throw new Error(`Cannot approve a run in status ${run.status}`);
  }

  try {
    assertNotReplayedApproval(runId);
  } catch (err) {
    await logAudit(runId, user.id, "APPROVE_DENIED_REPLAY", { error: (err as Error).message });
    throw err;
  }

  await updateRunStatus(runId, "APPROVED");
  await logAudit(runId, user.id, "RUN_APPROVED");
  await executeRun(runId);
}

export async function rejectRun(runId: string, user: User) {
  try {
    assertCanApprove(user);
  } catch (err) {
    await logAudit(runId, user.id, "REJECT_DENIED_UNAUTHORIZED", { role: user?.role });
    throw err;
  }

  const run = await getRun(runId);
  if (!run) throw new Error("Run not found");
  if (run.status !== "AWAITING_APPROVAL") {
    throw new Error(`Cannot reject a run in status ${run.status}`);
  }

  await updateRunStatus(runId, "REJECTED");
  await logAudit(runId, user.id, "RUN_REJECTED");
}
