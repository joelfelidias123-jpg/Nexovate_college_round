"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";

type Plan = { id: string; name: string; description: string; priceCents: number };
type Usage = { id: string; description: string; quantity: number; unitAmountCents: number; recordedAt: string };
type Invoice = { id: string; periodStart: string; periodEnd: string; totalCents: number; status: string; createdAt: string };
type BillingData = { plans: Plan[]; currentPlan: Plan; subscription: { status: string; currentPeriodStart?: string; currentPeriodEnd?: string }; usage: Usage[]; invoices: Invoice[] };
const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [usageTitle, setUsageTitle] = useState("Webinar registrations");
  const [quantity, setQuantity] = useState("10");
  const [unitPrice, setUnitPrice] = useState("15");
  const [quoteUsage, setQuoteUsage] = useState("25");
  const [quote, setQuote] = useState<{ subtotalCents: number; totalCents: number } | null>(null);

  const load = useCallback(async () => {
    try { setData(await (await fetch("/api/billing", { cache: "no-store" })).json() as BillingData); }
    catch { setNotice("Could not load billing details."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/billing", { cache: "no-store" }).then((response) => response.json() as Promise<BillingData>).then((result) => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setNotice("Could not load billing details.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const send = async (body: Record<string, unknown>, success: string) => {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; invoices?: Invoice[]; creditCents?: number; chargeCents?: number; prorationNetCents?: number };
      if (!response.ok) throw new Error(result.error ?? "Billing action failed");
      setNotice(body.action === "close_periods" ? `${result.invoices?.length ?? 0} invoice(s) closed. ${success}` : body.action === "change_plan" ? `${success} Estimated current-plan credit ${dollars(result.creditCents ?? 0)}; new-plan portion ${dollars(result.chargeCents ?? 0)}; net ${dollars(Math.abs(result.prorationNetCents ?? 0))} ${((result.prorationNetCents ?? 0) >= 0) ? "due" : "credit"}.` : body.action === "cancel" ? `${success} Unused-period credit: ${dollars(result.creditCents ?? 0)}.` : success);
      await load();
      return result;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Something went wrong"); return null; }
    finally { setBusy(false); }
  };

  const recordUsage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await send({ action: "record_usage", description: usageTitle, quantity: Number(quantity), unitAmountCents: Math.round(Number(unitPrice) * 100) }, "Usage was recorded for your current billing period.");
    if (result) setQuantity("10");
  };
  const calculateQuote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) return;
    setBusy(true);
    try {
      const response = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quote", planId: data.currentPlan.id, usageQty: Number(quoteUsage), usageDescription: "Estimated usage", unitAmountCents: 15 }) });
      const result = await response.json() as { error?: string; subtotalCents: number; totalCents: number };
      if (!response.ok) throw new Error(result.error ?? "Could not calculate invoice");
      setQuote(result);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not calculate invoice"); }
    finally { setBusy(false); }
  };
  const advancePeriod = () => {
    if (!data?.subscription.currentPeriodEnd) return;
    const next = new Date(data.subscription.currentPeriodEnd);
    next.setTime(next.getTime() + 1000);
    void send({ action: "close_periods", now: next.toISOString() }, "Demo clock advanced to the next billing boundary.");
  };

  const periodEnd = data?.subscription.currentPeriodEnd ? new Date(data.subscription.currentPeriodEnd) : null;
  const periodStart = data?.subscription.currentPeriodStart ? new Date(data.subscription.currentPeriodStart) : null;
  const currentUsage = data?.usage.filter((item) => {
    const recorded = new Date(item.recordedAt);
    return (!periodStart || recorded >= periodStart) && (!periodEnd || recorded < periodEnd);
  }) ?? [];
  return <WorkspaceShell eyebrow="KEEP IT MOVING" title="Billing & plans" action={<div className="page-actions"><button className="button button-outline" onClick={() => void send({ action: "close_periods" }, "Periods are invoiced in arrears.")} disabled={busy}>◷ Close due</button><button className="button button-dark" onClick={advancePeriod} disabled={busy || !data?.subscription.currentPeriodEnd}>Fast-forward 1 period <span>→</span></button></div>}>
    {notice && <div className={`notice ${notice.toLowerCase().includes("could not") || notice.toLowerCase().includes("failed") ? "notice-error" : "notice-success"}`} role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {loading || !data ? <div className="loading-card">Getting your billing picture ready…</div> : <>
      <section className="billing-summary-grid">
        <article className="billing-summary-card current-plan-card"><div className="summary-label">CURRENT PLAN <span className="status-pill pill-green">● {data.subscription.status}</span></div><div className="current-plan-line"><span>{data.currentPlan.name}</span><small> / month</small></div><div className="summary-amount">{dollars(data.currentPlan.priceCents)}<span>per month</span></div><p>{data.currentPlan.description}</p><div className="summary-divider"/><div className="renewal-line"><span>Next billing date</span><b>{periodEnd?.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) ?? "Not scheduled"}</b></div></article>
        <article className="billing-summary-card"><div className="summary-label">CURRENT PERIOD <span className="summary-icon mint">⌁</span></div><div className="summary-amount">{dollars(currentUsage.reduce((total, item) => total + item.quantity * item.unitAmountCents, 0))}<span>in usage charges</span></div><div className="period-progress"><div className="period-progress-fill"/></div><div className="period-caption"><span>{currentUsage.reduce((total, item) => total + item.quantity, 0)} metered units recorded</span><b>In arrears</b></div><p className="muted-copy">Usage is included in your invoice after the period ends.</p></article>
        <article className="billing-summary-card invoice-total-card"><div className="summary-label">LAST INVOICE <span className="summary-icon blush">▤</span></div><div className="summary-amount">{data.invoices[0] ? dollars(data.invoices[0].totalCents) : "$0.00"}<span>{data.invoices[0] ? "paid invoice" : "no invoices yet"}</span></div><div className="invoice-paid"><span className="paid-check">✓</span><span>{data.invoices[0] ? `Paid ${new Date(data.invoices[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Ready when you are"}</span><b>↗</b></div></article>
      </section>

      <section className="section-head billing-section-head"><div><div className="eyebrow">MADE FOR YOUR MOMENTUM</div><h2>Choose your next chapter.</h2><p>Pick the pace that feels right. You can change plans any time.</p></div></section>
      <section className="plans-grid">{data.plans.map((plan, index) => <article className={`plan-card ${plan.id === data.currentPlan.id ? "plan-card-active" : ""} ${index === 1 ? "plan-card-featured" : ""}`} key={plan.id}>{index === 1 && <div className="popular-label">A LITTLE EXTRA MAGIC</div>}<div className="plan-card-top"><span className={`plan-emoji plan-emoji-${index}`}>{["✳", "✦", "✴"][index]}</span>{plan.id === data.currentPlan.id && <span className="status-pill pill-green">CURRENT</span>}</div><h3>{plan.name}</h3><p>{plan.description}</p><div className="plan-card-price">{dollars(plan.priceCents)}<span> / month</span></div><div className="plan-feature-list"><span>✓ Flexible monthly billing</span><span>✓ Email campaigns included</span><span>✓ Usage billed in arrears</span></div><button className={`button ${plan.id === data.currentPlan.id ? "button-outline" : index === 1 ? "button-primary" : "button-dark"}`} disabled={busy || plan.id === data.currentPlan.id || data.subscription.status === "canceled"} onClick={() => void send({ action: "change_plan", planId: plan.id }, `You’re now on the ${plan.name} plan.`)}>{plan.id === data.currentPlan.id ? "You’re right here" : "Choose this plan"}</button></article>)}</section>

      <section className="billing-lower-grid"><article className="panel billing-panel"><div className="panel-heading"><div><div className="eyebrow">USAGE RECORDS</div><h3>Every little thing, accounted for.</h3></div><span className="count-pill">{data.usage.length} entries</span></div><form className="usage-form" onSubmit={recordUsage}><label>Usage item<input value={usageTitle} onChange={(event) => setUsageTitle(event.target.value)} required maxLength={80}/></label><label>Units<input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required/></label><label>Rate / unit<input type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required/></label><button className="button button-dark" disabled={busy}>＋ Add usage</button></form><div className="usage-list">{data.usage.slice(0, 5).map((item) => <div className="usage-row" key={item.id}><span className="usage-dot">✳</span><span className="usage-title"><b>{item.description}</b><small>{new Date(item.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {item.quantity} units</small></span><b>{dollars(item.quantity * item.unitAmountCents)}</b></div>)}</div></article>
      <article className="panel invoice-panel"><div className="panel-heading"><div><div className="eyebrow">INVOICE HISTORY</div><h3>Good things, neatly filed.</h3></div><span className="panel-more">•••</span></div><div className="invoice-list">{data.invoices.length ? data.invoices.map((invoice) => <div className="invoice-row" key={invoice.id}><span className="invoice-file">▤</span><span className="invoice-description"><b>Monthly subscription</b><small>{new Date(invoice.periodStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(invoice.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small></span><span className="invoice-amount">{dollars(invoice.totalCents)}<small>{invoice.status}</small></span><button className="download-icon" title="Invoice reference">↗</button></div>) : <p className="empty-state">Your first invoice will appear here.</p>}</div></article></section>

      <section className="billing-tools-grid"><article className="panel calculator-panel"><div className="panel-heading"><div><div className="eyebrow">INVOICE ESTIMATOR</div><h3>Plan it before it happens.</h3></div><span className="summary-icon mint">∑</span></div><p className="muted-copy">Preview a bill with your plan and estimated usage.</p><form className="estimate-form" onSubmit={calculateQuote}><label>Estimated usage units<input type="number" min="0" step="1" value={quoteUsage} onChange={(event) => setQuoteUsage(event.target.value)}/></label><button className="button button-primary" disabled={busy}>Calculate estimate <span>→</span></button></form>{quote && <div className="quote-result"><span>Estimated total</span><b>{dollars(quote.totalCents)}</b><small>Plan + usage · {quote.subtotalCents} cents in whole-cent math</small></div>}</article><article className="panel cancel-panel"><div><div className="eyebrow">YOUR CHOICE, ALWAYS</div><h3>Need to take a pause?</h3><p className="muted-copy">Cancel your subscription any time. We’ll calculate unused time in the current period.</p></div><button className="button button-outline" disabled={busy || data.subscription.status === "canceled"} onClick={() => { if (window.confirm("Cancel this subscription? We’ll calculate the unused-period credit.")) void send({ action: "cancel" }, "Subscription canceled. Any unused period credit is shown in the response."); }}>{data.subscription.status === "canceled" ? "Subscription canceled" : "Cancel subscription"}</button></article></section>
    </>}
  </WorkspaceShell>;
}
