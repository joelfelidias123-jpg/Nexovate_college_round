"use client";
import React, { useEffect, useState, useCallback } from "react";

const REHEARSED_PROMPTS = [
  "Next Friday ke liye webinar launch karo",
  "Send a follow-up campaign to registered leads",
  "Publish the SaaS landing page",
];

const TOOL_LABELS: Record<string, string> = {
  createLandingPage: "Site • Create Landing Page",
  publishSite: "Site • Publish at /s/[slug]",
  createWebinar: "Webinars • Create Event & Jitsi Room",
  draftCampaign: "Marketing • Draft Campaign",
  scheduleCampaign: "Marketing • Schedule & Send Campaign",
  notifyCRM: "CRM & Analytics • Sync Webinar Registrations",
  recordUsage: "Billing • Meter Usage & Update Invoice",
};

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<"timeline" | "audit">("timeline");
  const [user, setUser] = useState<{ id: string; role: "admin" | "member" }>({ id: "user-admin-1", role: "admin" });
  const [prompt, setPrompt] = useState("Next Friday ke liye webinar launch karo");
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [runHistory, setRunHistory] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRunDetails = useCallback(async (runId: string) => {
    const res = await fetch(`/api/agent/run/${runId}`);
    if (!res.ok) return;
    const data = await res.json();
    setCurrentRun(data.run);
    setSteps(data.steps ?? []);
  }, []);

  const fetchHistoryAndAudit = useCallback(async (autoSelectFirst = false) => {
    const [runsRes, auditRes] = await Promise.all([fetch("/api/agent/prompt"), fetch("/api/agent/audit")]);
    if (runsRes.ok) {
      const rJson = await runsRes.json();
      const runs = rJson.runs ?? [];
      setRunHistory(runs);
      if (autoSelectFirst && runs.length > 0) fetchRunDetails(runs[0].id);
    }
    if (auditRes.ok) setAuditLog((await auditRes.json()).log ?? []);
  }, [fetchRunDetails]);

  useEffect(() => { fetchHistoryAndAudit(true); }, [fetchHistoryAndAudit]);

  async function handleSubmitPrompt(e?: React.FormEvent, overridePrompt?: string) {
    if (e) e.preventDefault();
    const targetPrompt = (overridePrompt ?? prompt).trim();
    if (!targetPrompt) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/agent/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: targetPrompt, user }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || "Failed to generate plan");
      else {
        setCurrentRun(data.run);
        setSteps(data.steps ?? []);
        setActiveTab("timeline");
      }
      await fetchHistoryAndAudit(false);
    } catch (err: any) { setErrorMsg(err.message || "Network error"); }
    finally { setLoading(false); }
  }

  async function handleDecision(endpoint: "/api/agent/approve" | "/api/agent/reject") {
    if (!currentRun) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: currentRun.id, user }),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error || "Action not authorized");
      else await fetchRunDetails(currentRun.id);
      await fetchHistoryAndAudit(false);
    } catch (err: any) { setErrorMsg(err.message || "Request failed"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AI Agent</h1>
            <p className="text-sm text-muted-foreground">Execute multi-step workflows across modules with approval gates.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Role:</span>
            <select
              value={user.role}
              onChange={(e) => {
                setErrorMsg(null);
                const role = e.target.value as "admin" | "member";
                setUser({ id: role === "admin" ? "user-admin-1" : "user-member-2", role });
              }}
              className="border rounded-md px-2.5 py-1.5 bg-background text-foreground font-medium"
            >
              <option value="admin">admin</option>
              <option value="member">member</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b pb-2">
          <button type="button" onClick={() => setActiveTab("timeline")} className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Workflow &amp; Plan</button>
          <button type="button" onClick={() => { setActiveTab("audit"); fetchHistoryAndAudit(false); }} className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === "audit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Audit Log ({auditLog.length})</button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-xs underline ml-4">Dismiss</button>
          </div>
        )}

        {activeTab === "timeline" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-4">
                <form onSubmit={(e) => handleSubmitPrompt(e)} className="flex gap-2.5">
                  <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Next Friday ke liye webinar launch karo" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                  <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0">{loading ? "Running..." : "Run Workflow"}</button>
                </form>
                <div className="flex flex-wrap gap-1.5">
                  {REHEARSED_PROMPTS.map((item) => (
                    <button key={item} type="button" onClick={() => { setPrompt(item); handleSubmitPrompt(undefined, item); }} className="text-xs px-2.5 py-1 rounded-md border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground">{item}</button>
                  ))}
                </div>
              </div>

              {currentRun && (
                <div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <div className="text-xs text-muted-foreground font-mono">Run #{currentRun.id.slice(0, 8)}</div>
                      <h2 className="text-base font-semibold">{currentRun.prompt}</h2>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-muted">{currentRun.status}</span>
                  </div>

                  {currentRun.status === "AWAITING_APPROVAL" && (
                    <div className="p-4 rounded-lg border bg-muted/40 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold">Approval Required</div>
                        <p className="text-xs text-muted-foreground">Landing page, webinar, and campaign draft are ready. Approve to send campaign, sync CRM registrations, and generate usage invoice.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleDecision("/api/agent/approve")} disabled={loading} className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold">Approve</button>
                        <button type="button" onClick={() => handleDecision("/api/agent/reject")} disabled={loading} className="px-3 py-1.5 rounded-md border text-xs font-medium text-muted-foreground hover:text-foreground">Reject</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {steps.map((step, i) => (
                      <div key={step.id} className="p-3 rounded-md border bg-background space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{i + 1}. {TOOL_LABELS[step.tool_name] ?? step.tool_name}</span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded border bg-muted">{step.status}</span>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground">Input: {JSON.stringify(step.input)}</div>
                        {step.output && <div className="text-[11px] font-mono text-foreground">Output: {JSON.stringify(step.output)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-3 h-fit">
              <h3 className="text-sm font-semibold">Run History ({runHistory.length})</h3>
              <div className="space-y-2">
                {runHistory.map((r) => (
                  <button key={r.id} type="button" onClick={() => fetchRunDetails(r.id)} className={`w-full text-left p-2.5 rounded-md border text-xs ${currentRun?.id === r.id ? "border-primary bg-muted" : "bg-background hover:bg-muted/50"}`}>
                    <div className="flex justify-between text-[10px] text-muted-foreground"><span>#{r.id.slice(0, 8)}</span><span className="font-semibold">{r.status}</span></div>
                    <div className="truncate font-medium mt-0.5">{r.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card text-card-foreground p-5 shadow-sm space-y-3">
            <h2 className="text-base font-semibold">Audit Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-3">Actor</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditLog.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 px-3 font-mono text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 px-3 font-medium">{entry.actor}</td>
                      <td className="py-2 px-3 font-semibold">{entry.action}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">{JSON.stringify(entry.payload)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
