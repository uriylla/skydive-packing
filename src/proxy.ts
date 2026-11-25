import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth-cookies";

/**
 * Optimistic check only: sends visitors without a supervisor cookie to the
 * login page. Real authorization happens in pages and Server Actions
 * (src/lib/auth.ts), which verify the token and the user in the database.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(ADMIN_COOKIE)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/station/setup"],
};
