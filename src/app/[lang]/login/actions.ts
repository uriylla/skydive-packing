"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { localePath, pathLocale } from "@/i18n/config";
import { getRequestI18n } from "@/i18n/request";
import { verifySupervisorLogin } from "@/lib/accounts";
import { clientIp, endSupervisorSession, startSupervisorSession } from "@/lib/auth";
import { checkLimits, clearFailures, lockedMessage, recordFailure } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

export type LoginState = { error?: string; username?: string };

/** Per username (guessing one account) and per IP (trying many accounts). */
const MAX_PER_USERNAME = 5;
const MAX_PER_IP = 20;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const i18n = await getRequestI18n();
  const username = String(formData.get("username") ?? "").slice(0, 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!username || !password) return { error: i18n.d.msg.loginMissing, username };

  const userKey = `login:${username.trim().toLowerCase()}`;
  const ipKey = `login-ip:${await clientIp()}`;
  const limit = await checkLimits(db, [
    { key: userKey, max: MAX_PER_USERNAME },
    { key: ipKey, max: MAX_PER_IP },
  ]);
  if (limit.locked) return { error: i18n.m(lockedMessage(limit.retryAfterSeconds)), username };

  const user = await verifySupervisorLogin(db, username, password);
  if (!user) {
    await recordFailure(db, [userKey, ipKey]);
    return { error: i18n.d.msg.loginWrong, username };
  }

  await clearFailures(db, [userKey]);
  await startSupervisorSession(user.id);
  // Redirects from actions skip the proxy, so make sure the target has a language.
  const next = safeNext(formData.get("next"), "/admin/days");
  redirect(pathLocale(next) ? next : localePath(i18n.locale, next));
}

export async function logoutAction() {
  await endSupervisorSession();
  const { locale } = await getRequestI18n();
  redirect(localePath(locale, "/"));
}
