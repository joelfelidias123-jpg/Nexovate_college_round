import { getStore, makeId, updateStore, type Site, type SiteStatus } from "@/lib/store";

export interface SiteRecord {
  siteId: string;
  slug?: string;
  published: boolean;
  html: string;
  css: string;
  updatedAt: string;
}

const statuses: SiteStatus[] = ["draft", "published"];
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const asBuilderRecord = (site: Site): SiteRecord => ({
  siteId: site.id,
  slug: site.slug,
  published: site.status === "published",
  html: typeof site.content.html === "string"
    ? site.content.html
    : `<section><h1>${escapeHtml(typeof site.content.headline === "string" ? site.content.headline : site.title)}</h1><p>${escapeHtml(typeof site.content.subheading === "string" ? site.content.subheading : "")}</p></section>`,
  css: typeof site.content.css === "string" ? site.content.css : "",
  updatedAt: site.updatedAt.toISOString(),
});

// Supports the P4 list API and the P2 builder's siteId/slug lookup contract.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get("siteId");
    const slug = searchParams.get("slug");
    const state = await getStore();

    if (siteId || slug) {
      let site = state.sites.find((item) => (siteId && item.id === siteId) || (slug && item.slug === slug));
      if (!site && (siteId === "site_default" || slug === "welcome")) {
        const now = new Date();
        const starter: Site = {
          id: "site_default", slug: "welcome", title: "Welcome to My Site", status: "published",
          templateId: "builder", content: { html: '<section class="hero p-16 text-center"><h1 class="text-5xl font-bold mb-4">Welcome to My Site</h1><p class="text-xl text-zinc-600 mb-8">Built with Nexus Builder</p></section>', css: "" },
          createdAt: now, updatedAt: now, publishedAt: now,
        };
        const { state: seeded } = await updateStore((draft) => {
          const existing = draft.sites.find((item) => item.id === starter.id);
          if (existing) return existing;
          draft.sites.push(starter);
          return starter;
        });
        site = seeded.sites.find((item) => (siteId && item.id === siteId) || (slug && item.slug === slug));
      }
      if (!site) return Response.json({ success: false, error: "Site not found" }, { status: 404 });
      return Response.json({ success: true, site: asBuilderRecord(site) });
    }

    return Response.json({ sites: state.sites.map((site) => ({
      ...site,
      webinarCount: state.webinars.filter((webinar) => webinar.siteId === site.id).length,
    })) });
  } catch (error) {
    console.error("Error in GET /api/sites:", error);
    return Response.json({ success: false, error: "Database or internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return Response.json({ success: false, error: "Invalid request body" }, { status: 400 }); }

    // Preserve P2's existing visual-builder request and response shape, backed by
    // the same persistent P4 store as the site list/editor API.
    if ("siteId" in body || "html" in body || "action" in body || "css" in body) {
      const siteId = typeof body.siteId === "string" ? body.siteId : "site_default";
      const html = body.html;
      const css = typeof body.css === "string" ? body.css : "";
      const action = body.action;
      const requestedSlug = body.slug;
      if (typeof html !== "string") return Response.json({ success: false, error: "HTML content required" }, { status: 400 });
      if (action === "publish" && (typeof requestedSlug !== "string" || !requestedSlug.trim())) {
        return Response.json({ success: false, error: "Slug is required for publishing" }, { status: 400 });
      }

      const { state, result } = await updateStore((draft) => {
        const now = new Date();
        const cleanSlug = action === "publish"
          ? (requestedSlug as string).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-")
          : undefined;
        if (cleanSlug && draft.sites.some((item) => item.slug === cleanSlug && item.id !== siteId)) {
          return { error: "Slug is already in use. Please pick another." };
        }
        let site = draft.sites.find((item) => item.id === siteId);
        if (!site) {
          site = { id: siteId, slug: siteId === "site_default" ? "welcome" : siteId, title: "Builder site", status: "draft", templateId: "builder", content: {}, createdAt: now, updatedAt: now };
          draft.sites.push(site);
        }
        if (action === "publish") {
          site.slug = cleanSlug!;
          site.status = "published";
          site.publishedAt ??= now;
        }
        site.content = { ...site.content, html, css };
        site.updatedAt = now;
        return { site: asBuilderRecord(site), published: action === "publish" };
      });
      if ("error" in result) return Response.json({ success: false, error: result.error }, { status: 409 });
      const site = state.sites.find((item) => item.id === siteId)!;
      return Response.json({
        success: true,
        message: result.published ? "Site published successfully" : "Site saved successfully",
        site: result.site,
        ...(result.published ? { url: `/s/${site.slug}` } : {}),
      });
    }

    // P4's existing create-site request remains unchanged.
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const slug = (typeof body.slug === "string" ? body.slug : title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const status = (body.status ?? "draft") as SiteStatus;
    if (!title || !slug || !statuses.includes(status)) return Response.json({ error: "A title, slug, and valid status are required" }, { status: 400 });
    const initial = await getStore();
    if (initial.sites.some((site) => site.slug === slug)) return Response.json({ error: "That site slug is already in use" }, { status: 409 });
    const now = new Date();
    const site = {
      id: makeId("site"), slug, title, status,
      templateId: typeof body.templateId === "string" ? body.templateId : "landing-basic",
      content: body.content && typeof body.content === "object" && !Array.isArray(body.content) ? body.content as Record<string, unknown> : {},
      createdAt: now, updatedAt: now, ...(status === "published" ? { publishedAt: now } : {}),
    } satisfies Site;
    const { result: created } = await updateStore((draft) => {
      if (draft.sites.some((item) => item.slug === slug)) return false;
      draft.sites.push(site);
      return true;
    });
    if (!created) return Response.json({ error: "That site slug is already in use" }, { status: 409 });
    return Response.json({ site }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/sites:", error);
    return Response.json({ success: false, error: "Database or internal server error" }, { status: 500 });
  }
}
