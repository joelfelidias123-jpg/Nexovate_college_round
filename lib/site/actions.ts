import { updateStore, makeId, type Site } from "@/lib/store";
import { renderTemplate } from "@/lib/site/renderTemplate";

/**
 * Creates and saves a landing page using the specified template and metadata.
 * Uses the exact same store persistence logic as the Save route.
 */
export async function createLandingPage(
  template: string,
  title: string,
  slug: string
): Promise<{ siteId: string; slug: string; url: string }> {
  if (!template || !title || !slug) {
    throw new Error("Missing required inputs: template, title, and slug are required.");
  }

  const cleanSlug = decodeURIComponent(slug).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
  const siteId = makeId("site");

  const { html, css } = renderTemplate(template, { title, slug: cleanSlug });

  const { result } = await updateStore((draft) => {
    const now = new Date();

    if (cleanSlug && draft.sites.some((item) => item.slug.toLowerCase() === cleanSlug && item.id !== siteId)) {
      return { error: "Slug is already in use. Please pick another." };
    }

    const site: Site = {
      id: siteId,
      slug: cleanSlug,
      title: title.trim(),
      status: "draft",
      templateId: template,
      content: { html, css },
      createdAt: now,
      updatedAt: now,
    };

    draft.sites.push(site);
    return { siteId: site.id, slug: site.slug, url: `/s/${site.slug}` };
  });

  if ("error" in result) {
    throw new Error(result.error);
  }

  return result;
}

/**
 * Publishes an existing site by setting its status to published.
 * Uses the exact same persistence logic as the Publish route.
 */
export async function publishSite(
  siteId: string
): Promise<{ siteId: string; published: true; url: string }> {
  if (!siteId) {
    throw new Error("Missing required input: siteId is required.");
  }

  const targetId = siteId.trim();

  const { result } = await updateStore((draft) => {
    const now = new Date();
    let site = draft.sites.find((item) => item.id === targetId);

    if (!site) {
      site = {
        id: targetId,
        slug: `site-${targetId.slice(-6)}`,
        title: "Builder site",
        status: "draft",
        templateId: "builder",
        content: {},
        createdAt: now,
        updatedAt: now,
      };
      draft.sites.push(site);
    }

    site.status = "published";
    site.publishedAt = site.publishedAt || now;
    site.updatedAt = now;

    return {
      siteId: site.id,
      published: true as const,
      url: `/s/${site.slug}`,
    };
  });

  return result;
}
