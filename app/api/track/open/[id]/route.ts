import { makeId, updateStore } from "@/lib/store";

export async function GET(_request: Request, context: RouteContext<"/api/track/open/[id]">) {
  const { id } = await context.params;
  await updateStore((state) => {
    const campaign = state.campaigns.find((item) => item.id === id);
    if (campaign) {
      campaign.opens += 1;
      state.campaignEvents.unshift({ id: makeId("event"), campaignId: id, kind: "open", createdAt: new Date() });
    }
  });
  const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2sAAAAASUVORK5CYII=", "base64");
  return new Response(pixel, { headers: { "Content-Type": "image/png", "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate", "Content-Length": String(pixel.length) } });
}
