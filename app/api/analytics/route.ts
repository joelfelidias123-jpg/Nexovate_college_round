import { NextResponse, connection } from "next/server";
import { getAnalytics } from "@/lib/analytics";

export async function GET() {
  await connection();
  return NextResponse.json(await getAnalytics());
}