export function createLandingPage(template: string, title: string, slug: string) {
  if (!template || !title || !slug) {
    throw new Error("Missing required inputs: template, title, and slug are required.");
  }
  const siteId = "site_" + Math.random().toString(36).substring(2, 9);
  return {
    siteId,
    slug,
    url: `https://nexus.app/s/${slug}`,
  };
}

export function publishSite(siteId: string) {
  if (!siteId) {
    throw new Error("Missing required input: siteId is required.");
  }
  return {
    siteId,
    published: true,
    url: `https://nexus.app/published/${siteId}`,
  };
}
