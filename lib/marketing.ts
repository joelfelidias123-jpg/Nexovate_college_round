import { sendEmail } from "@/lib/email";
import { getStore, updateStore, type Campaign } from "@/lib/store";

export async function draftCopy(topic: string): Promise<{ subject: string; preview: string; text: string; generatedBy: "gemini" | "starter" }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `Write friendly, concise marketing email copy for Nexus about: ${topic}. Return only JSON with string fields subject, preview, and text. Do not use markdown.` }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { subject: { type: "STRING" }, preview: { type: "STRING" }, text: { type: "STRING" } }, required: ["subject", "preview", "text"] } },
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) throw new Error(`Gemini draft failed (${response.status})`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned an empty draft");
    const parsed = JSON.parse(text) as { subject?: string; preview?: string; text?: string };
    if (!parsed.subject || !parsed.preview || !parsed.text) throw new Error("Gemini returned an incomplete draft");
    return { subject: parsed.subject, preview: parsed.preview, text: parsed.text, generatedBy: "gemini" };
  }
  return {
    subject: `A fresh update from Nexus: ${topic}`,
    preview: `Here is what is new with ${topic}.`,
    text: `Hi there,\n\nWe have something new to share about ${topic}. Take a look and let us know what you think.\n\nThe Nexus team`,
    generatedBy: "starter",
  };
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function emailHtml(campaign: Campaign): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const clickUrl = `${base}/api/track/click?campaign=${encodeURIComponent(campaign.id)}&url=${encodeURIComponent("https://example.com")}`;
  const openUrl = `${base}/api/track/open/${encodeURIComponent(campaign.id)}`;
  const body = escapeHtml(campaign.text).replace(/\n/g, "<br />");
  return `<div style="font:16px/1.6 Arial,sans-serif;color:#20342d;max-width:600px;margin:auto;padding:32px"><div style="color:#236b51;font-weight:700;letter-spacing:.14em">NEXUS</div><h1 style="font-size:28px">${escapeHtml(campaign.subject)}</h1><p>${body}</p><p><a href="${clickUrl}" style="display:inline-block;background:#276d54;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Explore Nexus</a></p><img src="${openUrl}" width="1" height="1" alt="" /></div>`;
}

export async function sendCampaign(id: string): Promise<{ ok: boolean; error?: string; campaign?: Campaign }> {
  const { result: campaign } = await updateStore((state) => {
    const entry = state.campaigns.find((item) => item.id === id);
    if (!entry) return undefined;
    if (entry.status === "sent") return entry;
    if (entry.status === "sending") return undefined;
    entry.status = "sending";
    entry.sendError = undefined;
    return entry;
  });
  if (!campaign) return { ok: false, error: "Campaign not found or already sending" };
  if (campaign.status === "sent") return { ok: true, campaign };

  const outcome = await sendEmail({
    to: campaign.recipients,
    subject: campaign.subject,
    text: `${campaign.text}\n\nExplore Nexus: https://example.com`,
    html: emailHtml(campaign),
  });
  const { result: updated } = await updateStore((state) => {
    const entry = state.campaigns.find((item) => item.id === id);
    if (!entry) return undefined;
    if (outcome.ok) {
      entry.status = "sent";
      entry.sentAt = new Date();
      entry.sendError = undefined;
    } else {
      entry.status = "failed";
      entry.sendError = outcome.error;
    }
    return entry;
  });
  return outcome.ok ? { ok: true, campaign: updated } : { ok: false, error: outcome.error, campaign: updated };
}

export async function sendScheduledCampaigns(now = new Date()): Promise<{ sent: number; failed: number }> {
  const state = await getStore();
  const due = state.campaigns.filter((campaign) => campaign.status === "scheduled" && campaign.scheduledAt && campaign.scheduledAt <= now);
  let sent = 0;
  let failed = 0;
  for (const campaign of due) {
    const result = await sendCampaign(campaign.id);
    if (result.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}
