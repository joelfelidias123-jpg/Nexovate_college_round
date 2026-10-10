// ============================================================================
// FILE: lib/agent/schemas.ts — Zod Validation (the safety net)
// ============================================================================

import { z } from "zod";
import { TOOL_REGISTRY } from "./tools";

// Build a runtime-checkable enum of tool names from the registry keys.
// If someone adds a tool to TOOL_REGISTRY but forgets to update this,
// TypeScript will complain — keeps the two in sync automatically.
const toolNames = Object.keys(TOOL_REGISTRY) as [string, ...string[]];

// Schema for ONE step in a plan. `params` is loosely typed here
// (z.record(z.string(), z.any())) because each tool has different params —
// we do a second, stricter check per-tool in validateStepParams() below.
export const PlanStepSchema = z.object({
  tool: z.enum(toolNames),
  params: z.record(z.string(), z.any()),
});

// A full plan is just an array of valid steps (must have at least 1 step).
export const PlanSchema = z.array(PlanStepSchema).min(1);

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;

/**
 * Second-layer check: does this specific tool call have all the
 * params it needs? This catches cases where the LLM picks a valid
 * tool name but forgets/mangles a required field.
 *
 * Returns true/false instead of throwing — caller decides what to do
 * (e.g. fall back to cached plan) so the agent never hard-crashes
 * on bad LLM output.
 */
export function validateStepParams(step: PlanStep): boolean {
  const toolDef = TOOL_REGISTRY[step.tool as keyof typeof TOOL_REGISTRY];
  if (!toolDef) return false;

  return toolDef.params.every((requiredParam) =>
    Object.prototype.hasOwnProperty.call(step.params, requiredParam)
  );
}

/**
 * Validates an entire plan: structure (Zod) + per-step param completeness.
 * This is the single gate every LLM response must pass through before
 * it's allowed anywhere near the approval UI or the executor.
 */
export function validatePlan(rawPlan: unknown): {
  valid: boolean;
  plan?: Plan;
  error?: string;
} {
  const parsed = PlanSchema.safeParse(rawPlan);

  if (!parsed.success) {
    return {
      valid: false,
      error: "Plan failed schema validation: " + parsed.error.message,
    };
  }

  const allStepsValid = parsed.data.every(validateStepParams);
  if (!allStepsValid) {
    return { valid: false, error: "One or more steps missing required params" };
  }

  return { valid: true, plan: parsed.data };
}
