import { getStore, updateStore, type WebinarStatus } from "@/lib/store";

const statuses: WebinarStatus[] = ["draft", "published", "completed", "canceled"];
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const state = await getStore();
  const webinar = state.webinars.find((item) => item.id === id || item.slug === id);
  return webinar ? Response.json({ webinar, registrations: state.registrations.filter((r) => r.webinarId === webinar.id) }) : Response.json({ error: "Webinar not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  let updated;
  const { state, result } = await updateStore((draft) => {
    const webinar = draft.webinars.find((item) => item.id === id || item.slug === id);
    if (!webinar) return null;
    if (typeof body.title === "string" && body.title.trim()) webinar.title = body.title.trim();
    if (typeof body.description === "string") webinar.description = body.description;
    if (typeof body.joinUrl === "string" || body.joinUrl === null) webinar.joinUrl = typeof body.joinUrl === "string" ? body.joinUrl : undefined;
    if (typeof body.slug === "string") {
      const slug = body.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug || draft.webinars.some((other) => other.id !== webinar.id && other.slug === slug)) return "invalid-slug";
      webinar.slug = slug;
    }
    if (typeof body.status === "string") {
      if (!statuses.includes(body.status as WebinarStatus)) return "invalid-status";
      webinar.status = body.status as WebinarStatus;
    }
    for (const key of ["startsAt", "endsAt"] as const) {
      if (body[key] !== undefined) {
        const date = new Date(String(body[key]));
        if (!Number.isFinite(date.getTime())) return "invalid-date";
        webinar[key] = date;
      }
    }
    if (webinar.endsAt <= webinar.startsAt) return "invalid-date";
    updated = webinar;
    return webinar;
  });
  if (!result) return Response.json({ error: "Webinar not found" }, { status: 404 });
  if (result === "invalid-slug" || result === "invalid-status" || result === "invalid-date") return Response.json({ error: `Invalid ${result.slice(8)}` }, { status: 400 });
  return Response.json({ webinar: updated ?? result, registrations: state.registrations.filter((r) => r.webinarId === result.id) });
}
