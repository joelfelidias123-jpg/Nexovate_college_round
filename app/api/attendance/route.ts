import { sendEmail } from "@/lib/email";
import { getStore, makeId, updateStore } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = await getStore();
  const attendance = state.attendance.filter((item) => !url.searchParams.get("webinarId") || item.webinarId === url.searchParams.get("webinarId"));
  return Response.json({ attendance });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be JSON" }, { status: 400 }); }
  const initial = await getStore();
  let registration = typeof body.registrationId === "string" ? initial.registrations.find((r) => r.id === body.registrationId) : undefined;
  if (!registration && typeof body.webinarId === "string" && typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    registration = initial.registrations.find((r) => r.webinarId === body.webinarId && r.email === email);
  }
  if (!registration) return Response.json({ error: "Registration not found" }, { status: 404 });
  const existed = initial.attendance.find((item) => item.registrationId === registration!.id);
  if (existed) return Response.json({ attendance: existed, alreadyCheckedIn: true });
  const attendance = { id: makeId("attendance"), webinarId: registration.webinarId, registrationId: registration.id, checkedInAt: new Date(), source: typeof body.source === "string" ? body.source : "manual" };
  await updateStore((state) => {
    const current = state.registrations.find((item) => item.id === registration!.id);
    if (!current) throw new Error("Registration no longer exists");
    current.status = "attended";
    state.attendance.push(attendance);
  });
  const webinar = initial.webinars.find((item) => item.id === registration!.webinarId);
  const sent = await sendEmail({ to: registration.email, subject: `Thanks for attending${webinar ? `: ${webinar.title}` : ""}`, text: `Hi ${registration.name},\n\nThanks for attending${webinar ? ` ${webinar.title}` : " our webinar"}. We hope you found it useful.` });
  return Response.json({ attendance, followUpEmail: sent.ok ? "sent" : "failed", ...(sent.ok ? {} : { emailError: sent.error }) }, { status: 201 });
}
