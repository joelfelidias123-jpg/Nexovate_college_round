"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";

type LeadEvent = { id: string; type: string; note: string | null; createdAt: string };
type Lead = {
  id: string;
  name: string;
  email: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "WON";
  source: "SITE" | "WEBINAR";
  createdAt: string;
  events: LeadEvent[];
};

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON"] as const;
const PILL: Record<string, string> = {
  NEW: "pill-blue",
  CONTACTED: "pill-peach",
  QUALIFIED: "pill-lavender",
  WON: "pill-green",
};
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load leads");
      const data = await res.json();
      setLeads(data.leads);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addLead(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, source: "SITE" }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add lead");
      return;
    }
    setName("");
    setEmail("");
    setShowForm(false);
    await load();
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setError("Could not update status");
      return;
    }
    await load();
  }

  const visible = filter === "ALL" ? leads : leads.filter((l) => l.status === filter);
  const selected = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <WorkspaceShell
      eyebrow="KNOW YOUR PEOPLE"
      title="CRM"
      action={
        <button className="button button-dark" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add lead"}
        </button>
      }
    >
      {error ? <div className="notice notice-error">{error}</div> : null}

      {showForm ? (
        <form className="panel" onSubmit={addLead} style={{ marginBottom: 13 }}>
          <div className="panel-heading">
            <div>
              <div className="eyebrow">NEW LEAD</div>
              <h3>Add a lead</h3>
            </div>
          </div>
          <div className="lead-form">
            <label className="field-label">
              Name
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </label>
            <label className="field-label">
              Email
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </label>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save lead"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="loading-card">Loading leads…</div>
      ) : (
        <div className={`crm-layout ${selected ? "" : "single"}`}>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">ALL LEADS</div>
                <h3>Leads</h3>
              </div>
              <span className="count-pill">{visible.length}</span>
            </div>

            <div className="crm-filters">
              {["ALL", ...STATUSES].map((s) => (
                <button
                  key={s}
                  className={`button ${filter === s ? "button-dark" : "button-outline"}`}
                  onClick={() => setFilter(s)}
                >
                  {s === "ALL" ? "All" : label(s)}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="empty-state">No leads in this status.</div>
            ) : (
              <div>
                <div className="lead-row table-head">
                  <span>NAME</span>
                  <span>EMAIL</span>
                  <span>SOURCE</span>
                  <span>STATUS</span>
                  <span>ADDED</span>
                </div>
                {visible.map((lead) => (
                  <button
                    key={lead.id}
                    className={`lead-row ${lead.id === selectedId ? "selected" : ""}`}
                    onClick={() => setSelectedId(lead.id)}
                  >
                    <b>{lead.name}</b>
                    <span>{lead.email}</span>
                    <span>{lead.source === "SITE" ? "Site" : "Webinar"}</span>
                    <span>
                      <span className={`status-pill ${PILL[lead.status]}`}>{label(lead.status)}</span>
                    </span>
                    <span>{dateFmt.format(new Date(lead.createdAt))}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selected ? (
            <aside className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">LEAD</div>
                  <h3>{selected.name}</h3>
                </div>
                <button className="button button-outline" onClick={() => setSelectedId(null)}>
                  Close
                </button>
              </div>
              <p className="muted-copy">{selected.email}</p>

              <label className="field-label">
                Status
                <select
                  className="lead-select"
                  value={selected.status}
                  onChange={(e) => changeStatus(selected.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="eyebrow" style={{ marginTop: 18 }}>TIMELINE</div>
              <div className="usage-list">
                {selected.events.length === 0 ? (
                <div className="empty-state">No activity yet.</div>) : null}
                {selected.events.map((ev) => (
                  <div className="usage-row" key={ev.id}>
                    <div className="usage-title">
                      <b>{label(ev.type)}</b>
                      <small>{ev.note}</small>
                    </div>
                    <small className="muted-copy">{dateFmt.format(new Date(ev.createdAt))}</small>
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </div>
      )}
    </WorkspaceShell>
  );
}