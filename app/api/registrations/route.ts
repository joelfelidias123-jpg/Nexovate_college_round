import { sendEmail } from "@/lib/email";
import { getStore, makeId, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = await getStore();
  const registrations = state.registrations.filter((item) => !url.searchParams.get("webinarId") || item.webinarId === url.searchParams.get("webinarId"));
  return Response.json({ registrations });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const webinarId = typeof body.webinarId === "string" ? body.webinarId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!webinarId || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "webinarId, name, and a valid email are required" }, { status: 400 });
  const initial = await getStore();
  const webinar = initial.webinars.find((item) => item.id === webinarId || item.slug === webinarId);
  if (!webinar || webinar.status !== "published") return Response.json({ error: "Published webinar not found" }, { status: 404 });
  if (initial.registrations.some((item) => item.webinarId === webinar.id && item.email === email)) return Response.json({ error: "This email is already registered" }, { status: 409 });
  const registration = { id: makeId("registration"), webinarId: webinar.id, name, email, status: "registered" as const, registeredAt: new Date() };
  await updateStore((state) => { state.registrations.push(registration); });
  const sent = await sendEmail({ to: email, subject: `You're registered: ${webinar.title}`, text: `Hi ${name},\n\nYou're registered for ${webinar.title}.\nWhen: ${webinar.startsAt.toLocaleString()}\n${webinar.joinUrl ? `Join: ${webinar.joinUrl}\n` : ""}\nWe look forward to seeing you.` });
  return Response.json({ registration, confirmationEmail: sent.ok ? "sent" : "failed", ...(sent.ok ? {} : { emailError: sent.error }) }, { status: 201 });
}
