import { sendScheduledCampaigns } from "@/lib/marketing";

export async function POST(request: Request) {
  const secret = process.env.SCHEDULER_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await sendScheduledCampaigns());
}
