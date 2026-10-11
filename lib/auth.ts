import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

export async function getCurrentUser() {
  const store = await cookies();
  const session = readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true, workspaceId: true },
  });
}

// Use in API routes:
//   const { user, error } = await requireRole("ADMIN");
//   if (error) return error;
export async function requireRole(role?: Role) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (role && user.role !== role) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}