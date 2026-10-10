import { TOOL_REGISTRY, ToolName } from "./tools";

export interface PlanStep {
  tool: ToolName | string;
  params: Record<string, unknown>;
}

export type Plan = PlanStep[];
const validToolNames = new Set<string>(Object.keys(TOOL_REGISTRY));

export const PlanSchema = {
  safeParse(rawPlan: unknown): { success: boolean; data?: Plan; error?: { message: string } } {
    if (!Array.isArray(rawPlan) || rawPlan.length === 0) {
      return { success: false, error: { message: "Expected a non-empty array of plan steps" } };
    }
    for (let i = 0; i < rawPlan.length; i++) {
      const item = rawPlan[i] as Record<string, unknown>;
      if (!item || typeof item !== "object" || typeof item.tool !== "string" || !validToolNames.has(item.tool)) {
        return { success: false, error: { message: `Step ${i} has unauthorized tool` } };
      }
      if (!item.params || typeof item.params !== "object" || Array.isArray(item.params)) {
        return { success: false, error: { message: `Step ${i} is missing params` } };
      }
    }
    return { success: true, data: rawPlan as Plan };
  },
};

export function validateStepParams(step: PlanStep): boolean {
  const toolDef = TOOL_REGISTRY[step.tool as keyof typeof TOOL_REGISTRY];
  if (!toolDef) return false;
  return toolDef.params.every((p) => Object.prototype.hasOwnProperty.call(step.params, p));
}

export function validatePlan(rawPlan: unknown): { valid: boolean; plan?: Plan; error?: string } {
  const parsed = PlanSchema.safeParse(rawPlan);
  if (!parsed.success || !parsed.data) return { valid: false, error: parsed.error?.message };
  if (!parsed.data.every(validateStepParams)) return { valid: false, error: "Step missing required params" };
  return { valid: true, plan: parsed.data };
}
