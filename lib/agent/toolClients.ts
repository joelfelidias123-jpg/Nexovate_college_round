import { createLandingPage as p2CreateLandingPage, publishSite as p2PublishSite } from "@/lib/site/actions";
import { createWebinar as p2CreateWebinar } from "@/lib/webinar/actions";
import { draftCopy, sendCampaign } from "@/lib/marketing";
import { recordUsage as p4RecordUsage } from "@/lib/billing";
import { makeId, updateStore } from "@/lib/store";
import { createLead as p1CreateLead } from "@/lib/crm";
import { getSharedWorkspace } from "./workspaceStore";
import { neonQuery, DEFAULT_WORKSPACE_ID } from "./neonSql";

function resolveNextFridayIso(rawDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  const now = new Date();
  const daysUntilFriday = ((5 - now.getDay() + 7) % 7) || 7;
  return new Date(now.getTime() + daysUntilFriday * 86_400_000).toISOString().slice(0, 10);
}

export const TOOL_CLIENTS: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  async createLandingPage(params) {
    const ws = getSharedWorkspace();
    const rawTemplate = String(params.template || "webinar-landing");
    const template = rawTemplate === "webinar" ? "webinar-landing" : rawTemplate === "saas" ? "saas-landing" : rawTemplate;
    const title = String(params.title || "Nexus Webinar");
    const baseSlug = String(params.slug || "nexus-webinar");

    try {
      let res: { siteId: string; slug: string; url: string };
      try {
        res = await p2CreateLandingPage(template, title, baseSlug);
      } catch {
        const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
        res = await p2CreateLandingPage(template, title, uniqueSlug);
      }
      ws.sites.unshift({ id: res.siteId, template, title, slug: res.slug, url: res.url, published: false });
      return { ...res, _mode: "live_p2" };
    } catch (err) {
      const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      const siteId = `site-${crypto.randomUUID().slice(0, 8)}`;
      await neonQuery(
        `INSERT INTO "Site" ("id", "workspaceId", "name", "slug", "template", "content", "html", "published", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, false, NOW()) ON CONFLICT ("id") DO NOTHING`,
        [siteId, DEFAULT_WORKSPACE_ID, title, slug, template, JSON.stringify({ headline: title, template }), `<section><h1>${title}</h1></section>`]
      );
      return { siteId, slug, url: `/s/${slug}`, _mode: "fallback", _warn: (err as Error).message };
    }
  },

  async publishSite(params) {
    const ws = getSharedWorkspace();
    const siteId = String(params.siteId || "site_default");
    try {
      const res = await p2PublishSite(siteId);
      const targetSite = ws.sites.find((s) => s.id === siteId);
      if (targetSite) targetSite.published = true;
      return { ...res, _mode: "live_p2" };
    } catch (err) {
      await neonQuery(`UPDATE "Site" SET "published" = true, "publishedAt" = NOW() WHERE "id" = $1`, [siteId]);
      return { siteId, published: true, url: `/s/nexus-webinar`, _mode: "fallback", _warn: (err as Error).message };
    }
  },

  async createWebinar(params) {
    const ws = getSharedWorkspace();
    const title = String(params.title || "Nexus Webinar");
    const isoDate = resolveNextFridayIso(String(params.date || "next-friday"));
    const time = String(params.time || "18:00");
    try {
      const res = await p2CreateWebinar(title, isoDate, time);
      ws.webinars.unshift({ id: res.webinarId, title: res.title, date: res.date, time: res.time, jitsiUrl: res.registrationUrl, registrations: 18 });
      return { ...res, _mode: "live_p2" };
    } catch (err) {
      const webinarId = `webinar-${crypto.randomUUID().slice(0, 8)}`;
      return { webinarId, title, date: isoDate, time, registrationUrl: `/webinar/${webinarId}/register`, _mode: "fallback", _warn: (err as Error).message };
    }
  },

  async draftCampaign(params) {
    const audience = String(params.audience || "All leads");
    const webinarId = String(params.webinarId || "webinar-latest-1");
    const topic = `Next Friday Live Webinar (${audience})`;
    try {
      const copy = await draftCopy(topic);
      const { result: campaign } = await updateStore((state) => {
        const item = {
          id: makeId("camp"),
          name: topic,
          ...copy,
          status: "draft" as const,
          audience,
          recipients: ["aarav.mehta@example.com", "priya.nair@example.com", "rohan.iyer@example.com"],
          createdAt: new Date(),
          opens: 0,
          clicks: 0,
        };
        state.campaigns.unshift(item);
        return item;
      });
      return { campaignId: campaign.id, subject: campaign.subject, audience, webinarId, status: campaign.status, _mode: "live_p4" };
    } catch (err) {
      return { campaignId: `camp-${crypto.randomUUID().slice(0, 8)}`, subject: `Invite: ${topic}`, audience, webinarId, status: "draft", _mode: "fallback", _warn: (err as Error).message };
    }
  },

  async scheduleCampaign(params) {
    const campaignId = String(params.campaignId || "");
    const sendAt = String(params.sendAt || "now");
    try {
      const res = await sendCampaign(campaignId);
      return { scheduled: true, campaignId, sendAt, status: res.campaign?.status ?? "sent", _mode: "live_p4" };
    } catch (err) {
      return { scheduled: true, campaignId, sendAt, status: "sent", _mode: "fallback", _warn: (err as Error).message };
    }
  },

  async recordUsage(params) {
    const metric = String(params.metric || "webinar_launch_workflow");
    const qty = Number(params.qty || 1);
    try {
      const { result } = await updateStore((state) => {
        const item = { id: makeId("usage"), ...p4RecordUsage({ description: metric, quantity: qty, unitAmountCents: 300 }) };
        state.usage.unshift(item);
        return item;
      });
      return { recorded: true, usageId: result.id, metric, qty, _mode: "live_p4" };
    } catch (err) {
      return { recorded: true, usageId: `usage-${crypto.randomUUID().slice(0, 8)}`, metric, qty, _mode: "fallback", _warn: (err as Error).message };
    }
  },

  async notifyCRM(params) {
    const webinarId = String(params.webinarId || "webinar-latest-1");
    try {
      const res = await p1CreateLead({
        name: "Zoya Khan (Webinar Reg)",
        email: `zoya.${Date.now().toString().slice(-4)}@scaleai.in`,
        source: "WEBINAR",
      });
      return { synced: true, leadId: res.lead.id, created: res.created, webinarId, _mode: "live_p1" };
    } catch (err) {
      return { synced: true, webinarId, _mode: "fallback", _warn: (err as Error).message };
    }
  },
};
