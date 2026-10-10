import { createLandingPage, publishSite } from "./site/actions";
import { createWebinar } from "./webinar/actions";

export const TOOL_REGISTRY = {
  createLandingPage: { module: "P2", params: ["template", "title", "slug"] },
  publishSite:       { module: "P2", params: ["siteId"] },
  createWebinar:     { module: "P2", params: ["title", "date", "time"] },
  draftCampaign:     { module: "P4", params: ["audience", "webinarId"] },
  scheduleCampaign:  { module: "P4", params: ["campaignId", "sendAt"] },
  recordUsage:       { module: "P4", params: ["workspaceId", "metric", "qty"] },
  notifyCRM:         { module: "P1", params: ["event", "data"] },
};

export const TOOL_HANDLERS = {
  createLandingPage,
  publishSite,
  createWebinar,
};
