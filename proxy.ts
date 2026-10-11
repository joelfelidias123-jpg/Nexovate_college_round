import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  // Billing is admin-only
  if (pathname.startsWith("/billing") && session.role !== "ADMIN") {
    const url = request.nextUrl.clone();
    url.pathname = "/crm";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*", "/analytics/:path*", "/billing/:path*", "/marketing/:path*"],
  matcher: ["/crm/:path*", "/analytics/:path*", "/billing/:path*", "/marketing/:path*", "/agent/:path*"],
};
  