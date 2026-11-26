import { NextResponse, type NextRequest } from "next/server";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  negotiateLocale,
  pathLocale,
} from "@/i18n/config";
import { ADMIN_COOKIE } from "@/lib/auth-cookies";

const ONE_YEAR = 365 * 24 * 3600;

/** Pages behind the supervisor login (after the language prefix). */
const ADMIN_PATHS = /^\/(admin(\/|$)|station\/setup$)/;

/**
 * 1. Every page lives under a language prefix (/es, /en, /ca). Paths without
 *    one are redirected to the device's language: the one it last used, else
 *    the browser's, else DEFAULT_LOCALE (English if unset).
 * 2. Remembers the language in a cookie, and passes it to Server Actions in a
 *    request header.
 * 3. Optimistic login check only: sends visitors without a supervisor cookie
 *    to the login page. Real authorization happens in pages and Server Actions
 *    (src/lib/auth.ts), which verify the token and the user in the database.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const locale = pathLocale(pathname);

  if (!locale) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const preferred = isLocale(saved)
      ? saved
      : (negotiateLocale(request.headers.get("accept-language")) ?? defaultLocale());
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const rest = pathname.slice(locale.length + 1) || "/";
  if (ADMIN_PATHS.test(rest) && !request.cookies.has(ADMIN_COOKIE)) {
    const url = new URL(`/${locale}/login`, request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  const response = NextResponse.next({ request: { headers } });
  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  // Everything except Next internals and files with an extension (favicon.ico, images…).
  matcher: ["/((?!_next/|.*\\.[^/]+$).*)"],
};
