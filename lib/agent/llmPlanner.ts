import { validatePlan, Plan } from "./schemas";
import { getFallbackPlan } from "./fallbackPlans";
import { TOOL_REGISTRY } from "./tools";

const SYSTEM_PROMPT = `
You are a planner for a business automation agent.
Given a user instruction, output ONLY a JSON array of steps using
tools from this registry: ${JSON.stringify(TOOL_REGISTRY)}.
Each item must have shape: { "tool": "<toolName>", "params": { ... } }.
Do not invent tools. Do not include any explanation text, only JSON.
`;

async function callLLMProvider(prompt: string): Promise<unknown> {
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No LLM_API_KEY or GEMINI_API_KEY configured");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  return JSON.parse(text);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("LLM call timed out after 3s")), ms)),
  ]);
}

export async function planWithLLM(prompt: string): Promise<{ plan: Plan; source: "llm" | "fallback" }> {
  try {
    const rawPlan = await withTimeout(callLLMProvider(prompt), 3000);
    const result = validatePlan(rawPlan);
    if (result.valid && result.plan) return { plan: result.plan, source: "llm" };
  } catch (err) {
    console.warn("LLM call failed or timed out, using fallback:", (err as Error).message);
  }
  const fallback = getFallbackPlan(prompt);
  if (fallback) return { plan: fallback, source: "fallback" };
  throw new Error("Could not generate a valid plan for this prompt.");
}
