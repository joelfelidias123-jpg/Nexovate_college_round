import { scrubSensitivePayload } from "./security";
import { neonQuery, DEFAULT_WORKSPACE_ID, resolveNeonUserId } from "./neonSql";

export interface AuditEntry {
  id: string;
  run_id: string | null;
  actor: string;
  action: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

const nowMs = Date.now();
const auditLogStore: AuditEntry[] = [
  { id: "seed-audit-05", run_id: "seed-run-saas-01", actor: "agent", action: "RUN_EXECUTION_COMPLETED", payload: { totalSteps: 1, status: "COMPLETED" }, timestamp: new Date(nowMs - 1000 * 60 * 24).toISOString() },
  { id: "seed-audit-04", run_id: "seed-run-saas-01", actor: "agent", action: "TOOL_CALL_SUCCESS:publishSite", payload: { published: true, url: "/s/nexus-saas", siteId: "saas-site-default-1" }, timestamp: new Date(nowMs - 1000 * 60 * 24 - 2000).toISOString() },
  { id: "seed-audit-03", run_id: "seed-run-saas-01", actor: "user-admin-1", action: "RUN_APPROVED", payload: { role: "admin" }, timestamp: new Date(nowMs - 1000 * 60 * 24 - 5000).toISOString() },
  { id: "seed-audit-02", run_id: "seed-run-saas-01", actor: "user-admin-1", action: "PLAN_CREATED", payload: { prompt: "Publish the SaaS landing page", source: "fallback" }, timestamp: new Date(nowMs - 1000 * 60 * 25).toISOString() },
  { id: "seed-audit-01", run_id: null, actor: "user-member-2", action: "APPROVE_DENIED_UNAUTHORIZED", payload: { role: "member", reason: "Only admins can approve agent runs." }, timestamp: new Date(nowMs - 1000 * 60 * 40).toISOString() }
];

export async function logAudit(runId: string | null, actor: string, action: string, payload: Record<string, unknown> = {}): Promise<void> {
  const safePayload = scrubSensitivePayload(payload);
  const entry: AuditEntry = { id: crypto.randomUUID(), run_id: runId, actor, action, payload: safePayload, timestamp: new Date().toISOString() };
  auditLogStore.unshift(entry);

  const neonUserId = actor === "agent" ? null : resolveNeonUserId(actor);
  const validRunId = runId && !runId.startsWith("seed-") ? runId : null;

  await neonQuery(
    `INSERT INTO "AuditLog" ("id", "workspaceId", "runId", "userId", "tool", "input", "output", "outcome", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, NOW()) ON CONFLICT ("id") DO NOTHING`,
    [
      entry.id,
      DEFAULT_WORKSPACE_ID,
      validRunId,
      neonUserId,
      action,
      JSON.stringify({ actor, ...safePayload }),
      JSON.stringify(safePayload),
      action.includes("FAILED") || action.includes("DENIED") || action.includes("BLOCKED") ? "BLOCKED_OR_FAILED" : "SUCCESS",
    ]
  );
}

export async function getAuditLog(runId?: string): Promise<AuditEntry[]> {
  const rows = await neonQuery<any>(`SELECT * FROM "AuditLog" WHERE "workspaceId" = $1 ORDER BY "createdAt" DESC LIMIT 50`, [DEFAULT_WORKSPACE_ID]);
  if (rows && rows.length > 0) {
    const existingIds = new Set(auditLogStore.map((e) => e.id));
    for (const r of rows) {
      if (!existingIds.has(r.id)) {
        auditLogStore.push({
          id: r.id,
          run_id: r.runId,
          actor: (r.input?.actor as string) ?? (r.userId ? "admin" : "agent"),
          action: r.tool,
          payload: (r.output as Record<string, unknown>) ?? {},
          timestamp: r.createdAt,
        });
      }
    }
    auditLogStore.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  return runId ? auditLogStore.filter((e) => e.run_id === runId) : auditLogStore;
}
