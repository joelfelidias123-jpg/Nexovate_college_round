import { db } from "@/lib/db";

const WORKSPACE_ID = "ws_demo";
const DAYS = 14;

export async function getAnalytics() {
  const leads = await db.lead.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { status: true, source: true, createdAt: true },
  });

  const now = new Date();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  const perDay = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) {
    perDay.set(dayKey(new Date(now.getTime() - i * 86400000)), 0);
  }

  const weekAgo = now.getTime() - 7 * 86400000;
  let newThisWeek = 0;
  const byStatus = { NEW: 0, CONTACTED: 0, QUALIFIED: 0, WON: 0 };
  const bySource = { SITE: 0, WEBINAR: 0 };

  for (const lead of leads) {
    byStatus[lead.status]++;
    bySource[lead.source]++;
    if (lead.createdAt.getTime() >= weekAgo) newThisWeek++;
    const key = dayKey(lead.createdAt);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const total = leads.length;
  return {
    total,
    newThisWeek,
    webinarLeads: bySource.WEBINAR,
    won: byStatus.WON,
    conversionRate: total ? Math.round((byStatus.WON / total) * 100) : 0,
    byStatus,
    perDay: [...perDay].map(([date, count]) => ({ date, count })),
  };
}