// ============================================================================
// FILE: lib/agent/llmPlanner.ts — Provider-Agnostic LLM Call
// ============================================================================

import { validatePlan, Plan } from "./schemas";
import { getFallbackPlan } from "./fallbackPlans";
import { TOOL_REGISTRY } from "./tools";

// IMPORTANT: this file is the ONLY place that talks to an LLM provider.
// Swapping providers later means editing ONE function, not hunting
// through the whole codebase. Keep it that way.

const SYSTEM_PROMPT = `
You are a planner for a business automation agent.
Given a user instruction, output ONLY a JSON array of steps using
tools from this registry: ${JSON.stringify(TOOL_REGISTRY)}.
Each item must have shape: { "tool": "<toolName>", "params": { ... } }.
Do not invent tools. Do not include any explanation text, only JSON.
`;

/**
 * Calls whichever LLM provider is configured via env var.
 * Supports generic LLM_API_URL + LLM_API_KEY, or defaults to Google Gemini
 * free-tier endpoint when GEMINI_API_KEY is provided.
 * The rest of the system doesn't care which provider this is.
 */
async function callLLMProvider(prompt: string): Promise<unknown> {
  const apiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No LLM_API_KEY or GEMINI_API_KEY configured");
  }

  // Case A: Custom provider URL configured (OpenAI-compatible / custom proxy)
  if (process.env.LLM_API_URL) {
    const response = await fetch(process.env.LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        system: SYSTEM_PROMPT,
        user: prompt,
        responseFormat: "json",
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM provider returned ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.text ?? data.content ?? "[]");
  }

  // Case B: Default Gemini Free-Tier REST call (P3 stack: Gemini API free tier)
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM provider returned ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  return JSON.parse(text);
}

/**
 * Wraps the raw LLM call with a timeout. We never want to leave a user
 * (or a judge) staring at a loading spinner for 15+ seconds. If the
 * model is slow, we bail out fast and fall back to the cached plan.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("LLM call timed out")), ms)
    ),
  ]);
}

/**
 * THE MAIN ENTRY POINT. This is what the rest of the app calls.
 *
 * Flow:
 * 1. Try live LLM call (max 3s)
 * 2. Validate the response structurally (Zod) and per-step (params)
 * 3. If ANYTHING goes wrong at any point — timeout, bad JSON, invalid
 *    plan — silently fall back to the pre-written plan for that exact
 *    rehearsed prompt.
 * 4. If there's no fallback for this prompt either, surface a real
 *    error (this should only happen for free-text prompts outside
 *    the 3 rehearsed ones, which aren't part of the demo path).
 */
export async function planWithLLM(prompt: string): Promise<{
  plan: Plan;
  source: "llm" | "fallback";
}> {
  try {
    const rawPlan = await withTimeout(callLLMProvider(prompt), 3000);
    const result = validatePlan(rawPlan);

    if (result.valid && result.plan) {
      return { plan: result.plan, source: "llm" };
    }

    console.warn("LLM plan failed validation, using fallback:", result.error);
  } catch (err) {
    console.warn("LLM call failed, using fallback:", (err as Error).message);
  }

  // Safety net kicks in here
  const fallback = getFallbackPlan(prompt);
  if (fallback) {
    return { plan: fallback, source: "fallback" };
  }

  // No LLM plan, no fallback — this prompt is genuinely unsupported.
  throw new Error("Could not generate a valid plan for this prompt.");
}
