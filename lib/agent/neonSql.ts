export const DEFAULT_WORKSPACE_ID = "ws_demo";
export const DEFAULT_ADMIN_USER_ID = "cmv2ljnbn0001vbo0ljpqvbwq";
export const DEFAULT_MEMBER_USER_ID = "cmv2ljnxm0003vbo0352oxiw9";

export async function neonQuery<T = Record<string, any>>(
  query: string,
  params: unknown[] = []
): Promise<T[] | null> {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || !rawUrl.startsWith("postgres") || rawUrl.includes("user:password@host")) return null;

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    parsed.searchParams.delete("channel_binding");
    const cleanConn = parsed.toString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://${host}/sql`, {
      method: "POST",
      headers: {
        "Neon-Connection-String": cleanConn,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, params }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    return (data.rows as T[]) ?? [];
  } catch {
    return null;
  }
}

export function resolveNeonUserId(userId?: string, role?: string): string {
  if (userId && userId.startsWith("cm")) return userId;
  if (role === "member" || userId?.includes("member")) return DEFAULT_MEMBER_USER_ID;
  return DEFAULT_ADMIN_USER_ID;
}
