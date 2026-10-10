import { draftCopy } from "@/lib/marketing";
import { getStore, updateStore, makeId } from "@/lib/store";

export async function GET() {
  const { campaigns } = await getStore();
  return Response.json({ campaigns });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  const topic = String(body.topic ?? "").trim();
  if (topic.length < 3) return Response.json({ error: "Tell us what the campaign is about (at least 3 characters)" }, { status: 400 });
  try {
    const copy = await draftCopy(topic);
    const { result: campaign } = await updateStore((state) => {
      const item = {
        id: makeId("camp"),
        name: String(body.name ?? topic).trim().slice(0, 80) || topic,
        ...copy,
        status: "draft" as const,
        audience: "All subscribers",
        recipients: ["alex@example.test", "sam@example.test", "lee@example.test"],
        createdAt: new Date(),
        opens: 0,
        clicks: 0,
      };
      state.campaigns.unshift(item);
      return item;
    });
    return Response.json({ campaign, generatedBy: copy.generatedBy }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not draft campaign" }, { status: 502 });
  }
}
