export function buildSeedState() {
  const now = new Date();
  const ago = (days) => new Date(now.getTime() - days * 86400000);
  const ahead = (days) => new Date(now.getTime() + days * 86400000);
  const subId = "sub_nexus_demo";
  const pastWebinar = "webinar_design_past";
  const upcomingWebinar = "webinar_community_upcoming";
  const registration = (id, webinarId, name, email, status, daysAgo) => ({ id, webinarId, name, email, status, registeredAt: ago(daysAgo) });
  return {
    plans: [
      { id: "launch", name: "Launch", description: "For small, growing teams", priceCents: 1900, interval: "month" },
      { id: "growth", name: "Growth", description: "More room for your community", priceCents: 4900, interval: "month" },
      { id: "scale", name: "Scale", description: "More volume, more momentum", priceCents: 9900, interval: "month" },
    ],
    subscription: { id: subId, planId: "growth", status: "active", anchor: ago(8), currentPeriodStart: ago(8), currentPeriodEnd: ahead(22) },
    usage: [
      { id: "usage_webinar_seed", description: "Webinar registrations", quantity: 14, unitAmountCents: 15, recordedAt: ago(3) },
      { id: "usage_email_seed", description: "Email sends", quantity: 120, unitAmountCents: 2, recordedAt: ago(1) },
    ],
    invoices: [{ id: "seed-invoice-old", subscriptionId: subId, periodStart: new Date(now.getFullYear(), now.getMonth() - 1, 1), periodEnd: new Date(now.getFullYear(), now.getMonth(), 1), lines: [{ description: "Growth subscription", quantity: 1, unitAmountCents: 4900, amountCents: 4900 }], subtotalCents: 4900, totalCents: 4900, status: "paid", idempotencyKey: `${subId}:seed-old-period`, paymentReference: "sim_seed_invoice_old", createdAt: new Date(now.getFullYear(), now.getMonth(), 1) }],
    campaigns: [
      { id: "camp_welcome", name: "Welcome to the community", subject: "A little something to get you started", preview: "Your next chapter starts here.", text: "Thanks for joining us. We are glad you are here.", status: "sent", audience: "All subscribers", recipients: ["alex@example.test", "sam@example.test", "lee@example.test"], createdAt: ago(32), sentAt: ago(32), opens: 42, clicks: 17, generatedBy: "starter" },
      { id: "camp_summit", name: "Summit early access", subject: "Your early access invite is here", preview: "Save your seat for the summit.", text: "Get early access to our upcoming summit.", status: "sent", audience: "All subscribers", recipients: ["alex@example.test", "sam@example.test", "lee@example.test"], createdAt: ago(61), sentAt: ago(61), opens: 31, clicks: 9, generatedBy: "starter" },
    ],
    campaignEvents: [],
    sites: [{ id: "site_nexus_demo", slug: "nexus-studio", title: "Nexus Studio", status: "published", templateId: "community", content: { headline: "Make what’s next", subheading: "A community for curious people building better ideas.", buttonText: "Join the next session" }, createdAt: ago(45), updatedAt: ago(2), publishedAt: ago(2) }],
    webinars: [
      { id: pastWebinar, siteId: "site_nexus_demo", title: "Designing for what’s next", slug: "designing-for-whats-next", description: "A conversation about turning early ideas into useful products.", status: "completed", startsAt: ago(30), endsAt: new Date(ago(30).getTime() + 3600000), joinUrl: "https://example.com/replay/design", createdAt: ago(45) },
      { id: upcomingWebinar, siteId: "site_nexus_demo", title: "Building a community that lasts", slug: "community-that-lasts", description: "Practical ways to help a community grow with care.", status: "published", startsAt: ahead(5), endsAt: new Date(ahead(5).getTime() + 3600000), joinUrl: "https://example.com/join/community", createdAt: ago(2) },
    ],
    registrations: [
      registration("reg_past_alex", pastWebinar, "Alex Morgan", "alex@example.test", "attended", 40),
      registration("reg_past_sam", pastWebinar, "Sam Taylor", "sam@example.test", "attended", 39),
      registration("reg_past_lee", pastWebinar, "Lee Jordan", "lee@example.test", "registered", 38),
      registration("reg_upcoming_ada", upcomingWebinar, "Ada Lovelace", "ada@example.test", "registered", 1),
      registration("reg_upcoming_grace", upcomingWebinar, "Grace Hopper", "grace@example.test", "registered", 0),
    ],
    attendance: [
      { id: "att_past_alex", webinarId: pastWebinar, registrationId: "reg_past_alex", checkedInAt: ago(30), source: "seed" },
      { id: "att_past_sam", webinarId: pastWebinar, registrationId: "reg_past_sam", checkedInAt: ago(30), source: "seed" },
    ],
  };
}
