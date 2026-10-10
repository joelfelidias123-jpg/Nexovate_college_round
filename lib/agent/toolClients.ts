// ============================================================================
// FILE: lib/agent/toolClients.ts — Calls Out to P1/P2/P4 (mockable)
// ============================================================================
// This file is the bridge between your tool registry and teammates'
// real APIs. Each function below should hit their actual endpoint.
// Until their endpoints are ready, these return realistic FAKE data
// so you can build/test your entire pipeline independently.
//
// Swap USE_MOCKS to "false" in .env.local once real endpoints are confirmed working.

const USE_MOCKS = process.env.USE_MOCKS !== "false";

async function realCall(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Tool call to ${url} failed: ${res.status}`);
  return res.json();
}

// --- P2: Website Builder + Webinars ---

export async function createLandingPage(params: Record<string, unknown>) {
  if (USE_MOCKS) {
    return {
      siteId: "mock-site-1",
      slug: params.slug ?? "nexus-webinar",
      url: `/s/${params.slug ?? "nexus-webinar"}`,
    };
  }
  return realCall(`${process.env.P2_API_URL}/sites`, params);
}

export async function publishSite(params: Record<string, unknown>) {
  if (USE_MOCKS) {
    return {
      published: true,
      siteId: params.siteId ?? "mock-site-1",
      url: "/s/nexus-webinar",
    };
  }
  return realCall(`${process.env.P2_API_URL}/sites/publish`, params);
}

export async function createWebinar(params: Record<string, unknown>) {
  if (USE_MOCKS) {
    return {
      webinarId: "mock-webinar-1",
      title: params.title ?? "Nexus Webinar",
      date: params.date ?? "next-friday",
      time: params.time ?? "18:00",
      jitsiUrl: "https://meet.jit.si/nexus-webinar-next-friday",
    };
  }
  return realCall(`${process.env.P2_API_URL}/webinars`, params);
}

// --- P4: Billing + Marketing ---

export async function draftCampaign(params: Record<string, unknown>) {
  if (USE_MOCKS) {
    return {
      campaignId: "mock-campaign-1",
      audience: params.audience ?? "All leads",
      webinarId: params.webinarId ?? "mock-webinar-1",
      subject: "[Live Next Friday] Join the Nexus AI Workflow Masterclass",
    };
  }
  return realCall(`${process.env.P4_API_URL}/campaigns/draft`, params);
}

export async function scheduleCampaign(params: Record<string, unknown>) {
  if (USE_MOCKS) {
    return {
      scheduled: true,
      campaignId: params.campaignId ?? "mock-campaign-1",
      sendAt: params.sendAt ?? "now",
      recipientsDispatched: 20,
    };
  }
  return realCall(`${process.env.P4_API_URL}/campaigns/schedule`, params);
}

export async function recordUsage(params: Record<string, unknown>) {
  if (USE_MOCKS) {
    return {
      invoiceId: "mock-invoice-1",
      workspaceId: params.workspaceId ?? "ws-nexus-1",
      metric: params.metric ?? "webinar_launch_workflow",
      qty: params.qty ?? 1,
    };
  }
  return realCall(`${process.env.P4_API_URL}/billing/usage`, params);
}

// --- Dispatcher: maps tool name -> actual function above ---
// This is what the executor calls. Keeps executor.ts clean and
// agnostic of HTTP details.

export const TOOL_CLIENTS: Record<
  string,
  (params: Record<string, unknown>) => Promise<unknown>
> = {
  createLandingPage,
  publishSite,
  createWebinar,
  draftCampaign,
  scheduleCampaign,
  recordUsage,
};
