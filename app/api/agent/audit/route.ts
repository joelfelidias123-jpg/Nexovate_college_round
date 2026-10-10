import { connection, NextResponse } from "next/server";
import { getAuditLog } from "@/lib/agent/audit";

export async function GET() {
  await connection();
  const log = await getAuditLog();
  return NextResponse.json({ log }, { status: 200 });
}
