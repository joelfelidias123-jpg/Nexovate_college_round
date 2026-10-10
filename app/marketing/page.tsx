"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";

type Campaign = { id: string; name: string; subject: string; preview: string; text: string; status: "draft" | "scheduled" | "sending" | "sent" | "failed"; audience: string; recipients: string[]; createdAt: string; scheduledAt?: string; sentAt?: string; opens: number; clicks: number; sendError?: string; generatedBy?: "gemini" | "starter" };

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [topic, setTopic] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { name: string; subject: string; preview: string; text: string }>>({});
  const [scheduledAt, setScheduledAt] = useState("");
  const selected = useMemo(() => campaigns.find((campaign) => campaign.id === selectedId), [campaigns, selectedId]);
  const sent = campaigns.filter((campaign) => campaign.status === "sent");
  const totalOpens = sent.reduce((sum, campaign) => sum + campaign.opens, 0);
  const totalClicks = sent.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const draft = selected ? drafts[selected.id] ?? { name: selected.name, subject: selected.subject, preview: selected.preview, text: selected.text } : { name: "", subject: "", preview: "", text: "" };

  const changeDraft = (field: "name" | "subject" | "preview" | "text", value: string) => {
    if (!selected) return;
    setDrafts((current) => ({ ...current, [selected.id]: { ...(current[selected.id] ?? { name: selected.name, subject: selected.subject, preview: selected.preview, text: selected.text }), [field]: value } }));
  };

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/campaigns", { cache: "no-store" });
      const result = await response.json() as { campaigns: Campaign[] };
      setCampaigns(result.campaigns);
      setSelectedId((current) => current && result.campaigns.some((item) => item.id === current) ? current : result.campaigns[0]?.id ?? "");
    } catch { setNotice("Could not load campaigns."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/campaigns", { cache: "no-store" }).then((response) => response.json() as Promise<{ campaigns: Campaign[] }>).then((result) => {
      if (!active) return;
      setCampaigns(result.campaigns);
      setSelectedId(result.campaigns[0]?.id ?? "");
    }).catch(() => {
      if (active) setNotice("Could not load campaigns.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const createDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic }) });
      const result = await response.json() as { error?: string; campaign?: Campaign; generatedBy?: string };
      if (!response.ok || !result.campaign) throw new Error(result.error ?? "Could not create campaign");
      setDrafts((current) => ({ ...current, [result.campaign!.id]: { name: result.campaign!.name, subject: result.campaign!.subject, preview: result.campaign!.preview, text: result.campaign!.text } }));
      setSelectedId(result.campaign.id); setTopic(""); await load();
      setNotice(result.generatedBy === "gemini" ? "Gemini drafted your campaign. Give it your voice, then save or send." : "Your draft is ready. Add GEMINI_API_KEY to use Gemini for campaign copy.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create campaign"); }
    finally { setBusy(false); }
  };

  const updateAction = async (path: string, method: "POST" | "PATCH", body: Record<string, unknown>, success: string) => {
    if (!selected) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Campaign action failed");
      setNotice(success); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong"); }
    finally { setBusy(false); }
  };
  const saveDraft = () => updateAction(`/api/campaigns/${selectedId}`, "PATCH", draft, "Draft saved.");
  const sendNow = async () => {
    if (!selected) return;
    setBusy(true); setNotice("");
    try {
      const saved = await fetch(`/api/campaigns/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const savedResult = await saved.json() as { error?: string };
      if (!saved.ok) throw new Error(savedResult.error ?? "Could not save campaign");
      const response = await fetch(`/api/campaigns/${selectedId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_now" }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not send campaign");
      setNotice("Your campaign was sent. Opens and clicks will update as people interact."); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Campaign send failed"); }
    finally { setBusy(false); }
  };
  const schedule = async () => {
    if (!selected) return;
    setBusy(true); setNotice("");
    try {
      const saved = await fetch(`/api/campaigns/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const savedResult = await saved.json() as { error?: string };
      if (!saved.ok) throw new Error(savedResult.error ?? "Could not save campaign");
      const response = await fetch(`/api/campaigns/${selectedId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "schedule", scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : "" }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not schedule campaign");
      setNotice(`Campaign scheduled for ${new Date(scheduledAt).toLocaleString()}.`); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Campaign scheduling failed"); }
    finally { setBusy(false); }
  };
  const runDue = async () => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/campaigns/run", { method: "POST" });
      const result = await response.json() as { sent?: number; failed?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not process scheduled campaigns");
      setNotice(`Scheduler checked due campaigns: ${result.sent} sent, ${result.failed} failed.`); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Scheduler request failed"); }
    finally { setBusy(false); }
  };

  return <WorkspaceShell eyebrow="SAY SOMETHING THAT MATTERS" title="Marketing studio" action={<button className="button button-dark" disabled={busy} onClick={() => void runDue()}>◷ Process due sends</button>}>
    {notice && <div className={`notice ${notice.toLowerCase().includes("could not") || notice.toLowerCase().includes("failed") ? "notice-error" : "notice-success"}`} role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    <section className="marketing-stats"><article className="marketing-stat"><span className="summary-icon lavender">↗</span><div><small>CAMPAIGNS SENT</small><b>{sent.length}</b><span>Little notes, sent out into the world</span></div></article><article className="marketing-stat"><span className="summary-icon mint">◉</span><div><small>TRACKED OPENS</small><b>{totalOpens}</b><span>Opens recorded from email pixels</span></div></article><article className="marketing-stat"><span className="summary-icon peach">⌁</span><div><small>TRACKED CLICKS</small><b>{totalClicks}</b><span>Click-throughs via tracked links</span></div></article></section>

    <section className="marketing-workspace"><div className="panel campaign-sidebar-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR CAMPAIGNS</div><h3>Every note starts somewhere.</h3></div><span className="count-pill">{campaigns.length}</span></div><form className="new-campaign-form" onSubmit={createDraft}><label>What would you like to share?<textarea placeholder="A product update, event invite, a little good news…" value={topic} onChange={(event) => setTopic(event.target.value)} rows={3} minLength={3} required/></label><button className="button button-primary" disabled={busy || topic.trim().length < 3}><span>✳</span> Draft with {process.env.NEXT_PUBLIC_HAS_GEMINI ? "Gemini" : "AI"}</button><small>Gemini copy generation uses your server-side API key when configured.</small></form><div className="campaign-list">{loading ? <p className="empty-state">Finding your campaigns…</p> : campaigns.map((campaign) => <button key={campaign.id} className={`campaign-list-item ${campaign.id === selectedId ? "selected" : ""}`} onClick={() => setSelectedId(campaign.id)}><span className={`campaign-list-icon status-icon-${campaign.status}`}>{campaign.status === "sent" ? "✓" : campaign.status === "scheduled" ? "◷" : "✳"}</span><span className="campaign-list-copy"><b>{campaign.name}</b><small>{campaign.subject}</small></span><span className={`status-dot status-${campaign.status}`}/></button>)}</div></div>

    <div className="campaign-editor-column">{selected ? <>
      <article className="panel editor-panel"><div className="panel-heading editor-heading"><div><div className="eyebrow">{selected.status === "sent" ? "CAMPAIGN DETAILS" : "MAKE IT YOURS"}</div><h3>{selected.status === "sent" ? "Out there, doing its thing." : "A draft with room to bloom."}</h3></div><span className={`campaign-status-tag status-${selected.status}`}>{selected.status}</span></div>
        <label className="field-label">Campaign name<input value={draft.name} onChange={(event) => changeDraft("name", event.target.value)} disabled={selected.status === "sent"}/></label>
        <label className="field-label">Subject line<input value={draft.subject} onChange={(event) => changeDraft("subject", event.target.value)} maxLength={160} disabled={selected.status === "sent"}/><small>{draft.subject.length}/160</small></label>
        <label className="field-label">Preview text<input value={draft.preview} onChange={(event) => changeDraft("preview", event.target.value)} maxLength={180} disabled={selected.status === "sent"}/></label>
        <label className="field-label">Your message<textarea value={draft.text} onChange={(event) => changeDraft("text", event.target.value)} rows={8} disabled={selected.status === "sent"}/></label>
        <div className="editor-meta"><span><i className="audience-dot"/> {selected.audience} <b>·</b> {selected.recipients.length} demo recipients</span><span className="generated-tag">{selected.generatedBy === "gemini" ? "✦ Drafted with Gemini" : "✳ Starter draft"}</span></div>
        {selected.sendError && <div className="send-error">Last send attempt: {selected.sendError}</div>}
        <div className="editor-actions">{selected.status !== "sent" && <button className="button button-outline" onClick={() => void saveDraft()} disabled={busy}>Save draft</button>}<button className="button button-primary" onClick={() => void sendNow()} disabled={busy || selected.status === "sent" || selected.status === "sending"}>{selected.status === "sent" ? "✓ Sent" : "Send now"}<span>↗</span></button></div>
      </article>

      {selected.status !== "sent" && <article className="panel schedule-panel"><div className="panel-heading"><div><div className="eyebrow">WHENEVER YOU’RE READY</div><h3>Set it up for later.</h3></div><span className="summary-icon mint">◷</span></div><div className="schedule-row"><label className="field-label">Send date & time<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)}/></label><button className="button button-dark" onClick={() => void schedule()} disabled={busy || !scheduledAt}>Schedule campaign <span>→</span></button></div><p className="muted-copy">Scheduled messages are sent when the scheduler runs at or after this time.</p></article>}
      {selected.status === "sent" && <article className="panel tracking-panel"><div className="panel-heading"><div><div className="eyebrow">A LITTLE FEEDBACK</div><h3>Your message is getting through.</h3></div><span className="summary-icon peach">↗</span></div><div className="tracking-metrics"><div><b>{selected.opens}</b><span>opens tracked</span></div><div><b>{selected.clicks}</b><span>clicks tracked</span></div><div><b>{selected.recipients.length}</b><span>demo recipients</span></div></div><p className="muted-copy">Tracking is based on an email pixel and click-through links. Some email clients limit open tracking.</p></article>}
      </> : <div className="panel empty-editor"><span>✳</span><h3>A good message starts with a thought.</h3><p>Tell us what you want to share and we’ll turn it into a campaign draft you can shape and send.</p></div>}</div>
    </section>
    <section className="schedule-note"><span>✳</span><div><b>Let the scheduler do the remembering.</b><p>Call <code>POST /api/campaigns/run</code> from a cron service to send campaigns when they come due. Set <code>SCHEDULER_SECRET</code> to require a bearer token.</p></div><span className="note-arrow">↗</span></section>
  </WorkspaceShell>;
}
