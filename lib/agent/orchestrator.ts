// ============================================================================
// FILE: lib/agent/orchestrator.ts — Ties Everything Together
// ============================================================================

import { planWithLLM } from "./llmPlanner";
import { createRun, getRun, updateRunStatus } from "./db";
import { executeRun } from "./executor";
import {
  assertCanApprove,
  assertNotReplayedApproval,
  assertSafeAndPrivatePrompt,
  assertWithinRateLimit,
  User,
} from "./security";
import { logAudit } from "./audit";

/**
 * STEP 1: User submits a prompt.
 * First enforces rate-limiting and prompt-injection/PII scrubbing via
 * security.ts. Then generates a plan (LLM or fallback), stores it, and
 * puts the run into AWAITING_APPROVAL state. Nothing executes yet.
 */
export async function submitPrompt(prompt: string, user: User) {
  let safePrompt: string;
  try {
    assertWithinRateLimit(user.id);
    safePrompt = assertSafeAndPrivatePrompt(prompt);
  } catch (err) {
    await logAudit(null, user.id, "PROMPT_BLOCKED_SECURITY", {
      error: (err as Error).message,
    });
    throw err;
  }

  const { plan, source } = await planWithLLM(safePrompt);

  const run = await createRun(safePrompt, plan, user.id);

  await logAudit(run.id, user.id, "PLAN_CREATED", {
    prompt: safePrompt,
    source,
  });

  return run;
}

/**
 * STEP 2: Admin approves the run.
 * Role check and replay check happen FIRST — if either throws, we log
 * the blocked attempt and never touch the executor.
 */
export async function approveRun(runId: string, user: User) {
  try {
    assertCanApprove(user);
  } catch (err) {
    await logAudit(runId, user.id, "APPROVE_DENIED_UNAUTHORIZED", {
      role: user?.role,
    });
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
    await logAudit(runId, user.id, "APPROVE_DENIED_REPLAY", {
      error: (err as Error).message,
    });
    throw err;
  }

  await updateRunStatus(runId, "APPROVED");
  await logAudit(runId, user.id, "RUN_APPROVED");

  // Fire execution — for our 24hr hackathon demo, direct async execution
  // ensures all steps complete deterministically before returning.
  await executeRun(runId);
}

/**
 * STEP 3 (alt): Admin rejects the run instead.
 * No execution happens, but we still log it for the audit trail.
 */
export async function rejectRun(runId: string, user: User) {
  try {
    assertCanApprove(user); // same permission required to reject
  } catch (err) {
    await logAudit(runId, user.id, "REJECT_DENIED_UNAUTHORIZED", {
      role: user?.role,
    });
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
