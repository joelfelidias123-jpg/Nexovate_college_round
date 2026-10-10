// ============================================================================
// FILE: lib/agent/audit.ts — Audit Logger
// ============================================================================
// Every meaningful action in the system — approvals, rejections,
// tool calls, failures, unauthorized attempts — gets logged here.
// This is your compliance/trust story: "nothing happens silently."

import crypto from "node:crypto";

export interface AuditEntry {
  id: string;
  run_id: string | null;
  actor: string;       // user id, or "agent" for system actions
  action: string;      // e.g. "APPROVE_RUN", "TOOL_CALL:createWebinar"
  payload: Record<string, unknown>;
  timestamp: string;
}

// Same temporary in-memory approach — swap for real DB writes later.
const globalAudit = globalThis as unknown as {
  __nexusAuditLog?: AuditEntry[];
};

const auditLog: AuditEntry[] =
  globalAudit.__nexusAuditLog ?? (globalAudit.__nexusAuditLog = []);

export async function logAudit(
  runId: string | null,
  actor: string,
  action: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  auditLog.push({
    id: crypto.randomUUID(),
    run_id: runId,
    actor,
    action,
    payload,
    timestamp: new Date().toISOString(),
  });
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  // Most recent first — easier to eyeball during a live demo
  return [...auditLog].reverse();
}
