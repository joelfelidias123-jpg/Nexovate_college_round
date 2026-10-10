import { makeId, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaign");
  const target = url.searchParams.get("url");
  if (!campaignId || !target) return Response.json({ error: "Missing campaign or destination" }, { status: 400 });
  let destination: URL;
  try { destination = new URL(target); }
  catch { return Response.json({ error: "Invalid destination" }, { status: 400 }); }
  if (destination.protocol !== "https:" && destination.protocol !== "http:") return Response.json({ error: "Invalid destination protocol" }, { status: 400 });
  await updateStore((state) => {
    const campaign = state.campaigns.find((item) => item.id === campaignId);
    if (campaign) {
      campaign.clicks += 1;
      state.campaignEvents.unshift({ id: makeId("event"), campaignId, kind: "click", targetUrl: destination.toString(), createdAt: new Date() });
    }
  });
  return Response.redirect(destination.toString(), 302);
}
