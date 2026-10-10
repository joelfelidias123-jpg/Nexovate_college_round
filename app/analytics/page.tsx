"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";

type Analytics = {
  total: number;
  newThisWeek: number;
  webinarLeads: number;
  won: number;
  conversionRate: number;
  byStatus: Record<"NEW" | "CONTACTED" | "QUALIFIED" | "WON", number>;
  perDay: { date: string; count: number }[];
};

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load analytics");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Something went wrong"));
  }, []);

  const maxDay = data ? Math.max(1, ...data.perDay.map((d) => d.count)) : 1;
  const maxStatus = data ? Math.max(1, ...Object.values(data.byStatus)) : 1;

  const cards = data
    ? [
        { label: "Total leads", value: data.total, meta: "All time", icon: "◉", tone: "green" },
        { label: "New this week", value: data.newThisWeek, meta: "Last 7 days", icon: "↗", tone: "blue" },
        { label: "Webinar leads", value: data.webinarLeads, meta: "Registered for a webinar", icon: "▤", tone: "lavender" },
        { label: "Won", value: data.won, meta: "Closed deals", icon: "✓", tone: "peach" },
        { label: "Conversion", value: `${data.conversionRate}%`, meta: "Won ÷ total leads", icon: "%", tone: "green" },
      ]
    : [];

  return (
    <WorkspaceShell
      eyebrow="SEE WHAT WORKS"
      title="Analytics"
      action={
        <Link href="/crm" className="button button-dark">
          Open CRM
        </Link>
      }
    >
      {error ? <div className="notice notice-error">{error}</div> : null}
      {!data && !error ? <div className="loading-card">Loading analytics…</div> : null}

      {data ? (
        <>
          <div className="an-stats">
            {cards.map((c) => (
              <div className="stat-card" key={c.label}>
                <div className="stat-top">
                  <span>{c.label}</span>
                  <span className={`stat-symbol ${c.tone}`}>{c.icon}</span>
                </div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-meta">{c.meta}</div>
              </div>
            ))}
          </div>

          <div className="an-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">LAST 14 DAYS</div>
                  <h3>Leads added per day</h3>
                </div>
                <span className="count-pill">{data.perDay.reduce((s, d) => s + d.count, 0)}</span>
              </div>
              <div className="bar-chart">
                {data.perDay.map((d) => (
                  <div className="bar-col" key={d.date}>
                    <b>{d.count || ""}</b>
                    <div className="bar-wrap">
                      <div className="bar" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                    </div>
                    <small>{dayLabel.format(new Date(d.date)).replace(" ", "\u00a0")}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">PIPELINE</div>
                  <h3>Leads by status</h3>
                </div>
              </div>
              {(["NEW", "CONTACTED", "QUALIFIED", "WON"] as const).map((s) => (
                <div className="hbar-row" key={s}>
                  <span>{statusLabel(s)}</span>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${(data.byStatus[s] / maxStatus) * 100}%` }} />
                  </div>
                  <b>{data.byStatus[s]}</b>
                </div>
              ))}
            </section>
          </div>
        </>
      ) : null}
    </WorkspaceShell>
  );
}