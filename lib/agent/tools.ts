// ============================================================================
// FILE: lib/agent/executor.ts — Runs the Plan Step-by-Step
// ============================================================================

import { getSteps, updateStepStatus, updateRunStatus } from "./db";
import { logAudit } from "./audit";
import { TOOL_CLIENTS } from "./toolClients";
import { scrubSensitivePayload } from "./security";

/**
 * Resolves placeholders like "{{webinarId}}", "{{campaignId}}", or "{{siteId}}"
 * in a step's input using outputs collected from earlier steps in the same run.
 * This ensures sequential handoffs between P2 and P4 work seamlessly.
 */
function resolveStepPlaceholders(
  input: Record<string, unknown>,
  contextOutputs: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    if (typeof val === "string" && val.startsWith("{{") && val.endsWith("}}")) {
      const tokenKey = val.slice(2, -2).trim();
      resolved[key] = contextOutputs[tokenKey] ?? val;
    } else {
      resolved[key] = val;
    }
  }
  return resolved;
}

/**
 * Executes every step of an approved run, IN ORDER.
 *
 * Critical design choice: one step failing does NOT crash the whole
 * run or throw an unhandled exception up to the UI. Each step's
 * success/failure is tracked independently so the timeline can show
 * partial progress — this is what separates "robust system" from
 * "fragile prototype" in a live demo.
 */
export async function executeRun(runId: string): Promise<void> {
  await updateRunStatus(runId, "EXECUTING");
  await logAudit(runId, "agent", "RUN_EXECUTION_STARTED");

  const steps = await getSteps(runId);

  // Accumulate outputs across steps so "{{webinarId}}", "{{campaignId}}", etc.
  // resolve to real IDs returned by earlier steps.
  const accumulatedOutputs: Record<string, unknown> = {
    existingSaasSiteId: "saas-site-default-1",
    latestWebinarId: "webinar-latest-1",
  };

  for (const step of steps) {
    const resolvedInput = resolveStepPlaceholders(
      step.input,
      accumulatedOutputs
    );
    const safeInput = scrubSensitivePayload(resolvedInput);

    await updateStepStatus(step.id, runId, "RUNNING");
    await logAudit(
      runId,
      "agent",
      `TOOL_CALL_STARTED:${step.tool_name}`,
      safeInput
    );

    try {
      const toolFn = TOOL_CLIENTS[step.tool_name];
      if (!toolFn) {
        throw new Error(`No client registered for tool: ${step.tool_name}`);
      }

      const result = (await toolFn(resolvedInput)) as Record<string, unknown>;
      Object.assign(accumulatedOutputs, result);

      const safeResult = scrubSensitivePayload(result);

      await updateStepStatus(step.id, runId, "SUCCESS", safeResult);
      await logAudit(
        runId,
        "agent",
        `TOOL_CALL_SUCCESS:${step.tool_name}`,
        safeResult
      );
    } catch (err) {
      const errorMsg = (err as Error).message;

      await updateStepStatus(step.id, runId, "FAILED", { error: errorMsg });
      await logAudit(runId, "agent", `TOOL_CALL_FAILED:${step.tool_name}`, {
        error: errorMsg,
      });

      // Design decision: we STOP the run on first failure rather than
      // continuing blindly (later steps may depend on this one's output,
      // e.g. webinarId feeding into draftCampaign).
      await updateRunStatus(runId, "FAILED");
      return;
    }
  }

  await updateRunStatus(runId, "COMPLETED");
  await logAudit(runId, "agent", "RUN_EXECUTION_COMPLETED");
}
