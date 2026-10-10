import { updateStore } from "@/lib/store";
import { sendCampaign } from "@/lib/marketing";

export async function POST(request: Request, context: RouteContext<"/api/campaigns/[id]">) {
  const { id } = await context.params;
  let body: { action?: string; scheduledAt?: string };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }

  if (body.action === "send_now") {
    const result = await sendCampaign(id);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }
  if (body.action === "schedule") {
    const scheduledAt = new Date(body.scheduledAt ?? "");
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return Response.json({ error: "Choose a schedule time in the future" }, { status: 400 });
    }
    const { result } = await updateStore((state) => {
      const campaign = state.campaigns.find((item) => item.id === id);
      if (!campaign) return undefined;
      if (campaign.status === "sending" || campaign.status === "sent") return undefined;
      campaign.status = "scheduled";
      campaign.scheduledAt = scheduledAt;
      return campaign;
    });
    return result ? Response.json({ campaign: result }) : Response.json({ error: "Campaign not found or already sent" }, { status: 404 });
  }
  return Response.json({ error: "Action must be send_now or schedule" }, { status: 400 });
}

export async function PATCH(request: Request, context: RouteContext<"/api/campaigns/[id]">) {
  const { id } = await context.params;
  let body: { name?: string; subject?: string; preview?: string; text?: string };
  try { body = await request.json() as typeof body; }
  catch { return Response.json({ error: "Request body must be valid JSON" }, { status: 400 }); }
  if (![body.name, body.subject, body.preview, body.text].every((value) => typeof value === "string" && value.trim())) {
    return Response.json({ error: "Name, subject, preview, and email text are required" }, { status: 400 });
  }
  const { result } = await updateStore((state) => {
    const campaign = state.campaigns.find((item) => item.id === id);
    if (!campaign || campaign.status === "sending" || campaign.status === "sent") return undefined;
    campaign.name = body.name!.trim().slice(0, 80);
    campaign.subject = body.subject!.trim().slice(0, 160);
    campaign.preview = body.preview!.trim().slice(0, 180);
    campaign.text = body.text!.trim().slice(0, 12000);
    return campaign;
  });
  return result ? Response.json({ campaign: result }) : Response.json({ error: "Campaign not found or already sent" }, { status: 404 });
}
