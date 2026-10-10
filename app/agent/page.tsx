"use client";
import React, { useEffect, useState, useCallback } from "react";

const REHEARSED_PROMPTS = [
  { label: "Hero Flow: Webinar Next Friday", prompt: "Next Friday ke liye webinar launch karo" },
  { label: "Follow-up Registered Leads", prompt: "Send a follow-up campaign to registered leads" },
  { label: "Publish SaaS Landing Page", prompt: "Publish the SaaS landing page" },
];

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<"workflow" | "audit">("workflow");
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

  const fetchHistoryAndAudit = useCallback(async () => {
    const [runsRes, auditRes] = await Promise.all([fetch("/api/agent/prompt"), fetch("/api/agent/audit")]);
    if (runsRes.ok) setRunHistory((await runsRes.json()).runs ?? []);
    if (auditRes.ok) setAuditLog((await auditRes.json()).log ?? []);
  }, []);

  useEffect(() => { fetchHistoryAndAudit(); }, [fetchHistoryAndAudit]);

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
      if (!res.ok) setErrorMsg(data.error || "Failed to create plan");
      else { setCurrentRun(data.run); setSteps(data.steps ?? []); setActiveTab("workflow"); }
      await fetchHistoryAndAudit();
    } catch (err: any) { setErrorMsg(err.message); }
    finally { setLoading(false); }
  }

  async function handleAction(endpoint: "/api/agent/approve" | "/api/agent/reject") {
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
      if (!res.ok) setErrorMsg(data.error || "Action failed");
      else await fetchRunDetails(currentRun.id);
      await fetchHistoryAndAudit();
    } catch (err: any) { setErrorMsg(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Nexus AI Agent</h1>
            <p className="text-xs text-slate-400">Planner • Approval Gate • Role Check • Audit Log</p>
          </div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button onClick={() => setUser({ id: "user-admin-1", role: "admin" })} className={`px-3 py-1.5 rounded ${user.role === "admin" ? "bg-indigo-600 text-white" : "text-slate-400"}`}>Admin</button>
            <button onClick={() => setUser({ id: "user-member-2", role: "member" })} className={`px-3 py-1.5 rounded ${user.role === "member" ? "bg-amber-600 text-white" : "text-slate-400"}`}>Member</button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button onClick={() => setActiveTab("workflow")} className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === "workflow" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}>Workflow & Timeline</button>
          <button onClick={() => { setActiveTab("audit"); fetchHistoryAndAudit(); }} className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === "audit" ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400"}`}>Audit Log ({auditLog.length})</button>
        </div>

        {errorMsg && <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-sm">{errorMsg}</div>}

        {activeTab === "workflow" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <form onSubmit={(e) => handleSubmitPrompt(e)} className="flex gap-2.5">
                  <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white" />
                  <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold">{loading ? "Working..." : "Generate Plan"}</button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {REHEARSED_PROMPTS.map((item) => (
                    <button key={item.prompt} type="button" onClick={() => { setPrompt(item.prompt); handleSubmitPrompt(undefined, item.prompt); }} className="text-xs px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">{item.label}</button>
                  ))}
                </div>
              </div>

              {currentRun && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h2 className="text-base font-bold text-white">&ldquo;{currentRun.prompt}&rdquo;</h2>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300">{currentRun.status}</span>
                  </div>

                  {currentRun.status === "AWAITING_APPROVAL" && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between gap-4">
                      <span className="text-xs text-amber-200">Approval Gate: Requires Admin authorization to execute steps.</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleAction("/api/agent/approve")} disabled={loading} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Approve</button>
                        <button onClick={() => handleAction("/api/agent/reject")} disabled={loading} className="px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold">Reject</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {steps.map((step, i) => (
                      <div key={step.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{i + 1}. {step.tool_name}</span>
                          <span>{step.status}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">params: {JSON.stringify(step.input)}</div>
                        {step.output && <div className="text-[11px] font-mono text-emerald-300">output: {JSON.stringify(step.output)}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 h-fit">
              <h3 className="text-sm font-bold text-white">Run History ({runHistory.length})</h3>
              {runHistory.map((r) => (
                <button key={r.id} onClick={() => fetchRunDetails(r.id)} className="w-full text-left p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                  <div className="flex justify-between text-[10px] text-slate-400"><span>{r.id.slice(0, 8)}</span><span>{r.status}</span></div>
                  <div className="truncate font-medium mt-0.5">{r.prompt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-base font-bold text-white">Audit Log</h2>
            {auditLog.map((entry) => (
              <div key={entry.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs flex justify-between gap-4">
                <span><strong>{entry.action}</strong> by {entry.actor}</span>
                <span className="font-mono text-slate-400">{JSON.stringify(entry.payload)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
