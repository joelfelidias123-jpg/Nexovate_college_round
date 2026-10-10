import { getStore, updateStore, type SiteStatus } from "@/lib/store";

const statuses: SiteStatus[] = ["draft", "published"];
type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const site = (await getStore()).sites.find((item) => item.slug === slug);
  return site ? Response.json({ site }) : Response.json({ error: "Site not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const { slug } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const { result } = await updateStore((state) => {
    const site = state.sites.find((item) => item.slug === slug);
    if (!site) return null;
    if (typeof body.title === "string" && body.title.trim()) site.title = body.title.trim();
    if (typeof body.templateId === "string" && body.templateId.trim()) site.templateId = body.templateId.trim();
    if (body.content && typeof body.content === "object" && !Array.isArray(body.content)) site.content = body.content as Record<string, unknown>;
    if (body.status !== undefined) {
      if (!statuses.includes(body.status as SiteStatus)) return "invalid-status";
      site.status = body.status as SiteStatus;
      if (site.status === "published" && !site.publishedAt) site.publishedAt = new Date();
    }
    site.updatedAt = new Date();
    return site;
  });
  if (!result) return Response.json({ error: "Site not found" }, { status: 404 });
  if (result === "invalid-status") return Response.json({ error: "Invalid site status" }, { status: 400 });
  return Response.json({ site: result });
}
