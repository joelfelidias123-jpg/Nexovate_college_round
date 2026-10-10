/** P3 tool allowlist shared by the planner, validator, and executor. */
export const TOOL_REGISTRY = Object.freeze({
  createLandingPage: {
    description: "Create a website landing page.",
    params: ["template", "title", "slug"],
  },
  publishSite: {
    description: "Publish an existing website.",
    params: ["siteId"],
  },
  createWebinar: {
    description: "Create a webinar with a date and time.",
    params: ["title", "date", "time"],
  },
  draftCampaign: {
    description: "Draft an email campaign.",
    params: ["audience", "webinarId"],
  },
  scheduleCampaign: {
    description: "Schedule a campaign for delivery.",
    params: ["campaignId", "sendAt"],
  },
  recordUsage: {
    description: "Record a metered usage event.",
    params: ["workspaceId", "metric", "qty"],
  },
} as const);
