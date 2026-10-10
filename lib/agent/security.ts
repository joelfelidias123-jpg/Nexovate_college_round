export interface User {
  id: string;
  role: "admin" | "member";
}

export class UnauthorizedError extends Error {
  constructor(message = "Only admins can approve or reject agent runs.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

export function assertCanApprove(user: User | null | undefined): void {
  if (!user || user.role !== "admin") {
    throw new UnauthorizedError();
  }
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/i,
  /drop\s+table/i,
  /union\s+select/i,
  /<script[\s>]/i,
  /system\s*prompt/i,
  /dump\s+(all\s+)?(database|leads|users|passwords|env)/i,
];

const SENSITIVE_KEY_PATTERN = /(password|secret|token|api_?key|authorization|credit_?card|cvv|ssn)/i;

export function assertSafeAndPrivatePrompt(prompt: string): string {
  const trimmed = (prompt ?? "").trim();
  if (!trimmed) throw new SecurityError("Prompt cannot be empty.");
  if (trimmed.length > 300) throw new SecurityError("Prompt exceeds maximum allowed length (300 characters).");

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new SecurityError("Blocked by security guard: prompt injection or unauthorized data access attempt.");
    }
  }

  return trimmed
    .replace(/\b(\d{4})[- ]?\d{4}[- ]?\d{4}[- ]?(\d{4})\b/g, "$1-****-****-$2")
    .replace(/\b([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, "$1***@$2");
}

export function scrubSensitivePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      clean[key] = value.replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, "$1[REDACTED]");
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

const userPromptTimestamps = new Map<string, number[]>();
const executedApprovals = new Set<string>();

export function assertWithinRateLimit(userId: string): void {
  const now = Date.now();
  const recent = (userPromptTimestamps.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 15) {
    throw new SecurityError("Rate limit exceeded: max 15 agent runs per minute.");
  }
  recent.push(now);
  userPromptTimestamps.set(userId, recent);
}

export function assertNotReplayedApproval(runId: string): void {
  if (executedApprovals.has(runId)) {
    throw new SecurityError("Replay attack prevented: this run has already been approved and executed.");
  }
  executedApprovals.add(runId);
}
