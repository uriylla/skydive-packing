import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/request";
import { getActiveStation, getActiveSupervisor } from "./accounts";
import { ADMIN_COOKIE, STATION_COOKIE } from "./auth-cookies";
import { signToken, TOKEN_TTL_SECONDS, verifyToken, type TokenPayload } from "./tokens";

/**
 * Data Access Layer for authentication. Every page and Server Action that
 * needs a session goes through these helpers (proxy.ts only does a cheap,
 * optimistic cookie-presence check).
 */
const cookieFor = { admin: ADMIN_COOKIE, station: STATION_COOKIE } as const;

async function setSessionCookie(payload: Extract<TokenPayload, { kind: "admin" | "station" }>) {
  const token = await signToken(payload);
  (await cookies()).set(cookieFor[payload.kind], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS[payload.kind],
  });
}

export async function startSupervisorSession(userId: number) {
  await setSessionCookie({ kind: "admin", uid: userId });
}

export async function endSupervisorSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function startStationSession(stationId: number) {
  await setSessionCookie({ kind: "station", sid: stationId });
}

/** The logged-in supervisor, or null. Re-checks the DB so deactivation takes effect at once. */
export async function getSupervisor() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const payload = await verifyToken(token, "admin");
  if (!payload) return null;
  return getActiveSupervisor(db, payload.uid);
}

/**
 * For pages and actions: redirects to the login page (and back to `next`
 * afterwards). `next` is an app path without the language ("/admin/days").
 */
export async function requireSupervisor(next: string) {
  const user = await getSupervisor();
  if (!user) return redirectToLogin(next);
  return user;
}

export async function redirectToLogin(next: string): Promise<never> {
  const locale = await getRequestLocale();
  redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(localePath(locale, next))}`);
}

/** The unlocked station this device belongs to, or null (also null once revoked). */
export async function getStation() {
  const token = (await cookies()).get(STATION_COOKIE)?.value;
  const payload = await verifyToken(token, "station");
  if (!payload) return null;
  return getActiveStation(db, payload.sid);
}

/** Best-effort client IP (Vercel and most proxies set x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
