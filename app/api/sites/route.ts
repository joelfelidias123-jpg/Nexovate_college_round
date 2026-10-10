import { getStore, makeId, updateStore, type SiteStatus } from "@/lib/store";

const statuses: SiteStatus[] = ["draft", "published"];
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function GET() {
  const state = await getStore();
  return Response.json({ sites: state.sites.map((site) => ({ ...site, webinarCount: state.webinars.filter((w) => w.siteId === site.id).length })) });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = slugify(typeof body.slug === "string" ? body.slug : title);
  const status = (body.status ?? "draft") as SiteStatus;
  if (!title || !slug || !statuses.includes(status)) return Response.json({ error: "A title, slug, and valid status are required" }, { status: 400 });
  const state = await getStore();
  if (state.sites.some((site) => site.slug === slug)) return Response.json({ error: "That site slug is already in use" }, { status: 409 });
  const now = new Date();
  const site = { id: makeId("site"), slug, title, status, templateId: typeof body.templateId === "string" ? body.templateId : "landing-basic", content: body.content && typeof body.content === "object" ? body.content as Record<string, unknown> : {}, createdAt: now, updatedAt: now, ...(status === "published" ? { publishedAt: now } : {}) };
  await updateStore((draft) => { draft.sites.push(site); });
  return Response.json({ site }, { status: 201 });
}
