import { validatePlan } from "./schemas";

export type User = { id: string; role: string };

export class UnauthorizedError extends Error {
  readonly status = 403;
  constructor(message = "Administrator role required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

const requestTimes = new Map<string, number[]>();
const approvedRuns = new Set<string>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 15;

export function assertCanApprove(user: User): void {
  if (!user || user.role.toLowerCase() !== "admin") throw new UnauthorizedError();
}

export function assertWithinRateLimit(userId: string): void {
  const now = Date.now();
  const recent = (requestTimes.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) throw new Error("Rate limit exceeded. Please wait a minute before trying again.");
  recent.push(now);
  requestTimes.set(userId, recent);
}

function scrubText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:sk|pk|AIza)[-_][A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted-number]");
}

export function assertSafeAndPrivatePrompt(prompt: string): string {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Prompt is required");
  if (prompt.length > 2_000) throw new Error("Prompt is too long (maximum 2,000 characters)");
  const blocked = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /reveal\s+(the\s+)?(system|hidden)\s+prompt/i,
    /<\s*script\b|javascript\s*:/i,
  ];
  if (blocked.some((pattern) => pattern.test(prompt))) throw new Error("Prompt blocked by the security policy");
  return scrubText(prompt.trim());
}

export function assertNotReplayedApproval(runId: string): void {
  if (approvedRuns.has(runId)) throw new Error("This run has already received an approval attempt");
  approvedRuns.add(runId);
}

export function scrubSensitivePayload<T>(payload: T): T {
  if (typeof payload === "string") return scrubText(payload) as T;
  if (Array.isArray(payload)) return payload.map((item) => scrubSensitivePayload(item)) as T;
  if (payload && typeof payload === "object") {
    return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, scrubSensitivePayload(value)])) as T;
  }
  return payload;
}

export function validateAgentPlan(plan: unknown) {
  return validatePlan(plan);
}
