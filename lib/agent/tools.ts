export const TOOL_REGISTRY = {
  createLandingPage: { module: "P2", params: ["template", "title", "slug"] as const },
  publishSite: { module: "P2", params: ["siteId"] as const },
  createWebinar: { module: "P2", params: ["title", "date", "time"] as const },
  draftCampaign: { module: "P4", params: ["audience", "webinarId"] as const },
  scheduleCampaign: { module: "P4", params: ["campaignId", "sendAt"] as const },
  recordUsage: { module: "P4", params: ["workspaceId", "metric", "qty"] as const },
  notifyCRM: { module: "P1", params: ["webinarId", "source"] as const },
} as const;

export type ToolName = keyof typeof TOOL_REGISTRY;
