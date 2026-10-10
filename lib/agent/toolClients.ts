import { getSharedWorkspace } from "./workspaceStore";
import { neonQuery, DEFAULT_WORKSPACE_ID } from "./neonSql";

const APP_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const P1_BASE = process.env.P1_API_URL || `${APP_BASE}/api`;
const P2_BASE = process.env.P2_API_URL || `${APP_BASE}/api`;
const P4_BASE = process.env.P4_API_URL || `${APP_BASE}/api`;
const FORCE_MOCKS = process.env.USE_MOCKS === "true";

async function callRealWithFallback<T extends Record<string, unknown>>(
  url: string,
  payload: Record<string, unknown>,
  fallbackFn: () => Promise<T> | T
): Promise<T> {
  if (!FORCE_MOCKS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as T;
        return { ...data, _mode: "live" };
      }
    } catch {}
  }
  const fallbackResult = await fallbackFn();
  return { ...fallbackResult, _mode: "neon_db" };
}

export const TOOL_CLIENTS: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  async createLandingPage(params) {
    const ws = getSharedWorkspace();
    const slug = String(params.slug || "nexus-webinar") + "-" + Date.now().toString().slice(-4);
    const title = String(params.title || "Nexus Webinar");
    const template = String(params.template || "webinar");

    const result = await callRealWithFallback(`${P2_BASE}/sites`, { title, slug, status: "draft", templateId: template }, async () => {
      const siteId = `site-${crypto.randomUUID().slice(0, 8)}`;
      await neonQuery(
        `INSERT INTO "Site" ("id", "workspaceId", "name", "slug", "template", "content", "html", "published", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, false, NOW()) ON CONFLICT ("id") DO NOTHING`,
        [siteId, DEFAULT_WORKSPACE_ID, title, slug, template, JSON.stringify({ headline: title, template }), `<section><h1>${title}</h1></section>`]
      );
      return { siteId, slug, title, template };
    });

    const createdSite = (result as any).site;
    const siteId = String(createdSite?.id || result.siteId || `site-${crypto.randomUUID().slice(0, 8)}`);
    ws.sites.unshift({ id: siteId, template, title, slug, url: `/s/${slug}`, published: false });
    return { ...result, siteId, slug };
  },

  async publishSite(params) {
    const ws = getSharedWorkspace();
    const siteId = String(params.siteId || "saas-site-default-1");
    const targetSite = ws.sites.find((s) => s.id === siteId) || ws.sites[0];
    const slug = targetSite ? targetSite.slug : `nexus-webinar-${Date.now().toString().slice(-4)}`;

    const result = await callRealWithFallback(`${P2_BASE}/sites`, { siteId, slug, action: "publish", html: `<section class="p-16 text-center"><h1>${targetSite?.title ?? "Nexus Webinar"}</h1></section>`, css: "" }, async () => {
      await neonQuery(`UPDATE "Site" SET "published" = true, "publishedAt" = NOW() WHERE "id" = $1`, [siteId]);
      return { published: true, url: `/s/${slug}`, siteId };
    });

    if (targetSite) targetSite.published = true;
    return { ...result, published: true, url: `/s/${slug}`, siteId };
  },

  async createWebinar(params) {
    const ws = getSharedWorkspace();
    const title = String(params.title || "Nexus Webinar");
    const date = String(params.date || "next-friday");
    const time = String(params.time || "18:00");
    const slug = `nexus-webinar-${Date.now().toString().slice(-4)}`;
    const startsAt = new Date(Date.now() + 7 * 86400_000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 86400_000 + 3600_000).toISOString();
    const joinUrl = `https://meet.jit.si/${slug}`;

    const result = await callRealWithFallback(`${P2_BASE}/webinars`, { title, slug, startsAt, endsAt, status: "published", joinUrl }, async () => {
      const webinarId = `webinar-${crypto.randomUUID().slice(0, 8)}`;
      await neonQuery(
        `INSERT INTO "Webinar" ("id", "workspaceId", "title", "description", "startsAt", "roomName", "createdAt")
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', $5, NOW()) ON CONFLICT ("id") DO NOTHING`,
        [webinarId, DEFAULT_WORKSPACE_ID, title, `Scheduled via AI Agent (${date} ${time})`, slug]
      );
      return { webinarId, joinUrl, title, date, time };
    });

    const createdWebinar = (result as any).webinar;
    const webinarId = String(createdWebinar?.id || result.webinarId || `webinar-${crypto.randomUUID().slice(0, 8)}`);
    ws.webinars.unshift({ id: webinarId, title, date, time, jitsiUrl: joinUrl, registrations: 18 });
    return { ...result, webinarId, joinUrl };
  },

  async draftCampaign(params) {
    const ws = getSharedWorkspace();
    const audienceRaw = String(params.audience || "All leads");
    const neonAudience = audienceRaw.toLowerCase().includes("register") ? "REGISTERED_LEADS" : "ALL_LEADS";
    const topic = `Next Friday Live Webinar for ${audienceRaw}`;

    const result = await callRealWithFallback(`${P4_BASE}/campaigns`, { topic, name: topic }, async () => {
      const campaignId = `camp-${crypto.randomUUID().slice(0, 8)}`;
      const subject = `Invite: Next Friday Live Webinar (${audienceRaw})`;
      await neonQuery(
        `INSERT INTO "Campaign" ("id", "workspaceId", "name", "subject", "body", "audience", "status", "recipients", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::"Audience", 'DRAFT'::"CampaignStatus", 20, NOW()) ON CONFLICT ("id") DO NOTHING`,
        [campaignId, DEFAULT_WORKSPACE_ID, subject, subject, "Join our upcoming live session next Friday at 6:00 PM.", neonAudience]
      );
      return { campaignId, subject, audience: audienceRaw, status: "DRAFT" };
    });

    const createdCampaign = (result as any).campaign;
    const campaignId = String(createdCampaign?.id || result.campaignId || `camp-${crypto.randomUUID().slice(0, 8)}`);
    ws.campaigns.unshift({ id: campaignId, title: String(createdCampaign?.subject || result.subject || topic), audience: audienceRaw, status: "DRAFT", opens: 0, clicks: 0 });
    return { ...result, campaignId };
  },

  async scheduleCampaign(params) {
    const ws = getSharedWorkspace();
    const campaignId = String(params.campaignId || "camp-1");
    const sendAt = String(params.sendAt || "now");

    const result = await callRealWithFallback(`${P4_BASE}/campaigns/${encodeURIComponent(campaignId)}`, { action: "send_now" }, async () => {
      await neonQuery(`UPDATE "Campaign" SET "status" = 'SENT'::"CampaignStatus", "scheduledAt" = NOW(), "sentAt" = NOW(), "recipients" = 20 WHERE "id" = $1`, [campaignId]);
      return { scheduled: true, campaignId, sendAt, status: "SENT" };
    });

    const target = ws.campaigns.find((c) => c.id === campaignId) || ws.campaigns[0];
    if (target) { target.status = "SENT"; target.opens = 18; target.clicks = 12; }
    return { ...result, scheduled: true, campaignId, status: "SENT" };
  },

  async recordUsage(params) {
    const ws = getSharedWorkspace();
    const metric = String(params.metric || "webinar_launch_workflow");
    const qty = Number(params.qty || 1);

    const result = await callRealWithFallback(`${P4_BASE}/billing`, { action: "record_usage", description: metric, quantity: qty, unitAmountCents: 300 }, async () => {
      const usageId = `usage-${crypto.randomUUID().slice(0, 8)}`;
      const invoiceId = `inv-${crypto.randomUUID().slice(0, 8)}`;
      await neonQuery(
        `INSERT INTO "UsageRecord" ("id", "workspaceId", "metric", "quantity", "createdAt") VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT ("id") DO NOTHING`,
        [usageId, DEFAULT_WORKSPACE_ID, metric, qty]
      );
      await neonQuery(
        `INSERT INTO "Invoice" ("id", "workspaceId", "periodStart", "periodEnd", "baseAmount", "usageAmount", "total", "status", "lineItems", "createdAt")
         VALUES ($1, $2, NOW() - INTERVAL '30 days', NOW(), 79, 3, 82, 'OPEN', $3::jsonb, NOW()) ON CONFLICT ("id") DO NOTHING`,
        [invoiceId, DEFAULT_WORKSPACE_ID, JSON.stringify([{ description: metric, qty, amount: 3 }])]
      );
      return { recorded: true, usageId, invoiceId, metric, qty };
    });

    ws.usageUnits += qty * 35;
    return { ...result, recorded: true, metric, qty };
  },

  async notifyCRM(params) {
    const webinarId = String(params.webinarId || "webinar-latest-1");

    const result = await callRealWithFallback(`${P1_BASE}/leads`, { webinarId, source: "webinar", name: "Zoya Khan (Webinar Reg)", email: `zoya.${Date.now().toString().slice(-4)}@scaleai.in` }, async () => {
      const leadId = `lead-${crypto.randomUUID().slice(0, 8)}`;
      await neonQuery(
        `INSERT INTO "Lead" ("id", "workspaceId", "name", "email", "status", "source", "createdAt")
         VALUES ($1, $2, $3, $4, 'NEW'::"LeadStatus", 'WEBINAR'::"LeadSource", NOW()) ON CONFLICT ("id") DO NOTHING`,
        [leadId, DEFAULT_WORKSPACE_ID, "Zoya Khan (Webinar Reg)", `zoya.${Date.now().toString().slice(-4)}@scaleai.in`]
      );
      return { synced: true, newRegistrations: 3, webinarId, leadId };
    });

    return { ...result, synced: true, newRegistrations: 3, webinarId };
  },
};
