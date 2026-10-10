import { Plan } from "./schemas";

const HERO_WEBINAR_PLAN: Plan = [
  { tool: "createLandingPage", params: { template: "webinar", title: "Nexus Webinar", slug: "nexus-webinar" } },
  { tool: "publishSite", params: { siteId: "{{siteId}}" } },
  { tool: "createWebinar", params: { title: "Nexus Webinar", date: "next-friday", time: "18:00" } },
  { tool: "draftCampaign", params: { audience: "All leads", webinarId: "{{webinarId}}" } },
  { tool: "scheduleCampaign", params: { campaignId: "{{campaignId}}", sendAt: "now" } },
  { tool: "recordUsage", params: { workspaceId: "ws-nexus-1", metric: "webinar_launch_workflow", qty: 1 } }
];

export const FALLBACK_PLANS: Record<string, Plan> = {
  "next friday ke liye webinar launch karo": HERO_WEBINAR_PLAN,
  "launch a webinar for next friday": HERO_WEBINAR_PLAN,
  "send a follow-up campaign to registered leads": [
    { tool: "draftCampaign", params: { audience: "Registered leads", webinarId: "{{latestWebinarId}}" } },
    { tool: "scheduleCampaign", params: { campaignId: "{{campaignId}}", sendAt: "now" } }
  ],
  "publish the saas landing page": [
    { tool: "publishSite", params: { siteId: "{{existingSaasSiteId}}" } }
  ]
};

export function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/[.!?]+$/g, "").replace(/\s+/g, " ");
}

export function getFallbackPlan(prompt: string): Plan | null {
  const key = normalizePrompt(prompt);
  if (FALLBACK_PLANS[key]) return FALLBACK_PLANS[key];
  if (key.includes("webinar") && key.includes("friday")) return HERO_WEBINAR_PLAN;
  return null;
}
