export interface SharedWorkspaceData {
  sites: any[];
  webinars: any[];
  campaigns: any[];
  leads: any[];
  invoices: any[];
  usageUnits: number;
}

const globalStore = globalThis as unknown as { __nexusWorkspaceStore?: SharedWorkspaceData };

export function getSharedWorkspace(): SharedWorkspaceData {
  if (!globalStore.__nexusWorkspaceStore) {
    globalStore.__nexusWorkspaceStore = {
      sites: [{ id: "saas-site-default-1", template: "saas", title: "Nexus Cloud SaaS Landing", slug: "nexus-saas", url: "/s/nexus-saas", published: true }],
      webinars: [{ id: "webinar-latest-1", title: "Q3 Workflow Automation Deep Dive", date: "2026-10-04", time: "17:00", jitsiUrl: "https://meet.jit.si/nexus-q3-automation", registrations: 12 }],
      campaigns: [
        { id: "camp-seed-1", title: "September Product Automation Digest", audience: "All leads", status: "SENT", opens: 16, clicks: 11 },
        { id: "camp-seed-2", title: "Q3 Customer Roundtable Invitation", audience: "Registered leads", status: "SENT", opens: 14, clicks: 9 }
      ],
      leads: [],
      invoices: [{ id: "inv-2026-09", period: "September 2026", plan: "Growth ($79/mo)", usageUnits: 420, amountUsd: 79, status: "PAID" }],
      usageUnits: 485
    };
  }
  return globalStore.__nexusWorkspaceStore;
}
