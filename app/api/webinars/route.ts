import { makeId, getStore, updateStore, type WebinarStatus } from "@/lib/store";

const statuses: WebinarStatus[] = ["draft", "published", "completed", "canceled"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = await getStore();
  const webinars = state.webinars
    .filter((item) => url.searchParams.get("status") === null || item.status === url.searchParams.get("status"))
    .map((webinar) => ({ ...webinar, registrationCount: state.registrations.filter((r) => r.webinarId === webinar.id && r.status !== "canceled").length }));
  return Response.json({ webinars });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const startsAt = new Date(String(body.startsAt ?? ""));
  const endsAt = new Date(String(body.endsAt ?? ""));
  const status = (body.status ?? "draft") as WebinarStatus;
  if (!title || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt || !statuses.includes(status)) {
    return Response.json({ error: "Provide a title, valid start/end dates, and a valid status" }, { status: 400 });
  }
  const slug = (typeof body.slug === "string" ? body.slug : title).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return Response.json({ error: "A valid slug is required" }, { status: 400 });
  const state = await getStore();
  if (state.webinars.some((w) => w.slug === slug)) return Response.json({ error: "That webinar slug is already in use" }, { status: 409 });
  if (body.siteId && !state.sites.some((site) => site.id === body.siteId)) return Response.json({ error: "Site not found" }, { status: 404 });
  const webinar = {
    id: makeId("webinar"), title, slug, description: typeof body.description === "string" ? body.description : "",
    status, startsAt, endsAt, createdAt: new Date(),
    ...(typeof body.siteId === "string" ? { siteId: body.siteId } : {}),
    ...(typeof body.joinUrl === "string" ? { joinUrl: body.joinUrl } : {}),
  };
  await updateStore((draft) => { draft.webinars.push(webinar); });
  return Response.json({ webinar }, { status: 201 });
}
