"use client";
import React, { useEffect, useState, useCallback } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";

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
  const [user, setUser] = useState<{ id: string; email?: string; role: "admin" | "member" }>({
    id: "user-admin-1",
    email: "admin@nexus.demo",
    role: "admin",
  });
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

  useEffect(() => {
    async function initAuthAndLoad() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json().catch(() => ({}));
        if (meData?.user) {
          setUser({ id: meData.user.id, email: meData.user.email, role: meData.user.role.toLowerCase() as "admin" | "member" });
        } else {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@nexus.demo", password: "demo1234" }),
          });
          const loginData = await loginRes.json().catch(() => ({}));
          if (loginData?.user) {
            setUser({ id: loginData.user.id, email: loginData.user.email, role: loginData.user.role.toLowerCase() as "admin" | "member" });
          }
        }
      } catch {}
      await fetchHistoryAndAudit(true);
    }
    initAuthAndLoad();
  }, [fetchHistoryAndAudit]);

  async function handleRoleSwitch(nextRole: "admin" | "member") {
    setErrorMsg(null);
    const email = nextRole === "admin" ? "admin@nexus.demo" : "member@nexus.demo";
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "demo1234" }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.user) {
        setUser({ id: data.user.id, email: data.user.email, role: data.user.role.toLowerCase() as "admin" | "member" });
        return;
      }
    } catch {}
    setUser({ id: nextRole === "admin" ? "user-admin-1" : "user-member-2", email, role: nextRole });
  }

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
      if (!res.ok) setErrorMsg(data.error || "Forbidden: Only admins can approve runs.");
      else await fetchRunDetails(currentRun.id);
      await fetchHistoryAndAudit(false);
    } catch (err: any) { setErrorMsg(err.message || "Request failed"); }
    finally { setLoading(false); }
  }

  return (
    <WorkspaceShell
      eyebrow="AUTONOMOUS WORKFLOWS"
      title="AI Agent"
      action={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="muted-copy" style={{ fontSize: 12 }}>Signed in as:</span>
          <select className="lead-select" value={user.role} onChange={(e) => handleRoleSwitch(e.target.value as "admin" | "member")}>
            <option value="admin">admin@nexus.demo (ADMIN)</option>
            <option value="member">member@nexus.demo (MEMBER)</option>
          </select>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" className={`button ${activeTab === "timeline" ? "button-dark" : "button-outline"}`} onClick={() => setActiveTab("timeline")}>Workflow &amp; Plan</button>
        <button type="button" className={`button ${activeTab === "audit" ? "button-dark" : "button-outline"}`} onClick={() => { setActiveTab("audit"); fetchHistoryAndAudit(false); }}>Audit Log ({auditLog.length})</button>
      </div>

      {errorMsg ? <div className="notice notice-error">{errorMsg}</div> : null}

      {activeTab === "timeline" ? (
        <div className="overview-grid">
          <div style={{ display: "grid", gap: 14 }}>
            <section className="panel">
              <div className="panel-heading"><div><div className="eyebrow">PROMPT</div><h3>Launch a multi-step workflow</h3></div></div>
              <form onSubmit={(e) => handleSubmitPrompt(e)} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Next Friday ke liye webinar launch karo" style={{ flex: 1 }} />
                <button type="submit" disabled={loading} className="button button-primary">{loading ? "Running…" : "Run Workflow"}</button>
              </form>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {REHEARSED_PROMPTS.map((item) => (
                  <button key={item} type="button" className="button button-outline" onClick={() => { setPrompt(item); handleSubmitPrompt(undefined, item); }}>{item}</button>
                ))}
              </div>
            </section>

            {currentRun && (
              <section className="panel">
                <div className="panel-heading">
                  <div><div className="eyebrow">RUN #{currentRun.id.slice(0, 8)}</div><h3>{currentRun.prompt}</h3></div>
                  <span className="status-pill pill-green">{currentRun.status}</span>
                </div>

                {currentRun.status === "AWAITING_APPROVAL" && (
                  <div className="panel" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <b>Approval Required (Admin Gate)</b>
                      <p className="muted-copy" style={{ margin: "4px 0 0" }}>Landing page, webinar, and campaign draft are ready. Approve to send campaign, sync CRM registrations, and record billing usage.</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="button button-primary" disabled={loading} onClick={() => handleDecision("/api/agent/approve")}>Approve</button>
                      <button type="button" className="button button-outline" disabled={loading} onClick={() => handleDecision("/api/agent/reject")}>Reject</button>
                    </div>
                  </div>
                )}

                <div className="usage-list">
                  {steps.map((step, i) => (
                    <div className="usage-row" key={step.id}>
                      <div className="usage-title">
                        <b>{i + 1}. {TOOL_LABELS[step.tool_name] ?? step.tool_name}</b>
                        <small>Input: {JSON.stringify(step.input)}</small>
                        {step.output ? <small>Output: {JSON.stringify(step.output)}</small> : null}
                      </div>
                      <span className="status-pill pill-blue">{step.status}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <section className="panel" style={{ height: "fit-content" }}>
            <div className="panel-heading">
              <div><div className="eyebrow">HISTORY</div><h3>Recent Runs</h3></div>
              <span className="count-pill">{runHistory.length}</span>
            </div>
            <div className="usage-list">
              {runHistory.map((r) => (
                <button key={r.id} type="button" onClick={() => fetchRunDetails(r.id)} className="usage-row" style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}>
                  <div className="usage-title"><b>{r.prompt}</b><small>#{r.id.slice(0, 8)}</small></div>
                  <span className="status-pill pill-green">{r.status}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <div><div className="eyebrow">COMPLIANCE &amp; SECURITY</div><h3>Audit Log</h3></div>
            <span className="count-pill">{auditLog.length}</span>
          </div>
          <div className="usage-list">
            {auditLog.map((entry) => (
              <div className="usage-row" key={entry.id}>
                <div className="usage-title">
                  <b>{entry.action} <small>({entry.actor})</small></b>
                  <small>{JSON.stringify(entry.payload)}</small>
                </div>
                <small className="muted-copy">{new Date(entry.timestamp).toLocaleTimeString()}</small>
              </div>
            ))}
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}
