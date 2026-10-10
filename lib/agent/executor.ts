import { getSteps, updateStepStatus, updateRunStatus } from "./db";
import { logAudit } from "./audit";
import { TOOL_CLIENTS } from "./toolClients";
import { scrubSensitivePayload } from "./security";

const GATED_TOOLS = new Set<string>(["scheduleCampaign", "notifyCRM", "recordUsage"]);

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

export async function executeUntilApprovalGate(runId: string): Promise<void> {
  const steps = await getSteps(runId);
  const accumulatedOutputs: Record<string, unknown> = {
    existingSaasSiteId: "saas-site-default-1",
    latestWebinarId: "webinar-latest-1",
  };

  for (const step of steps) {
    if (GATED_TOOLS.has(step.tool_name) || steps.length === 1) {
      await updateRunStatus(runId, "AWAITING_APPROVAL");
      await logAudit(runId, "agent", `APPROVAL_GATE_PAUSED:${step.tool_name}`, {
        pendingTool: step.tool_name,
      });
      return;
    }

    const resolvedInput = resolveStepPlaceholders(step.input, accumulatedOutputs);
    const safeInput = scrubSensitivePayload(resolvedInput);

    await updateStepStatus(step.id, runId, "RUNNING");
    await logAudit(runId, "agent", `TOOL_CALL_STARTED:${step.tool_name}`, safeInput);

    try {
      const toolFn = TOOL_CLIENTS[step.tool_name];
      if (!toolFn) throw new Error(`No client registered for tool: ${step.tool_name}`);

      const result = (await toolFn(resolvedInput)) as Record<string, unknown>;
      Object.assign(accumulatedOutputs, result);

      const safeResult = scrubSensitivePayload(result);
      await updateStepStatus(step.id, runId, "SUCCESS", safeResult);
      await logAudit(runId, "agent", `TOOL_CALL_SUCCESS:${step.tool_name}`, safeResult);
    } catch (err) {
      const errorMsg = (err as Error).message;
      await updateStepStatus(step.id, runId, "FAILED", { error: errorMsg });
      await logAudit(runId, "agent", `TOOL_CALL_FAILED:${step.tool_name}`, { error: errorMsg });
      await updateRunStatus(runId, "FAILED");
      return;
    }
  }

  await updateRunStatus(runId, "AWAITING_APPROVAL");
}

export async function executeRun(runId: string): Promise<void> {
  await updateRunStatus(runId, "EXECUTING");
  await logAudit(runId, "agent", "RUN_EXECUTION_STARTED");

  const steps = await getSteps(runId);
  const accumulatedOutputs: Record<string, unknown> = {
    existingSaasSiteId: "saas-site-default-1",
    latestWebinarId: "webinar-latest-1",
  };
  for (const s of steps) {
    if (s.status === "SUCCESS" && s.output) Object.assign(accumulatedOutputs, s.output);
  }

  for (const step of steps) {
    if (step.status === "SUCCESS") continue;

    const resolvedInput = resolveStepPlaceholders(step.input, accumulatedOutputs);
    const safeInput = scrubSensitivePayload(resolvedInput);

    await updateStepStatus(step.id, runId, "RUNNING");
    await logAudit(runId, "agent", `TOOL_CALL_STARTED:${step.tool_name}`, safeInput);

    try {
      const toolFn = TOOL_CLIENTS[step.tool_name];
      if (!toolFn) throw new Error(`No client registered for tool: ${step.tool_name}`);

      const result = (await toolFn(resolvedInput)) as Record<string, unknown>;
      Object.assign(accumulatedOutputs, result);

      const safeResult = scrubSensitivePayload(result);
      await updateStepStatus(step.id, runId, "SUCCESS", safeResult);
      await logAudit(runId, "agent", `TOOL_CALL_SUCCESS:${step.tool_name}`, safeResult);
    } catch (err) {
      const errorMsg = (err as Error).message;
      await updateStepStatus(step.id, runId, "FAILED", { error: errorMsg });
      await logAudit(runId, "agent", `TOOL_CALL_FAILED:${step.tool_name}`, { error: errorMsg });
      await updateRunStatus(runId, "FAILED");
      return;
    }
  }

  await updateRunStatus(runId, "COMPLETED");
  await logAudit(runId, "agent", "RUN_EXECUTION_COMPLETED");
}
