"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { verifySupervisorLogin } from "@/lib/accounts";
import { clientIp, endSupervisorSession, startSupervisorSession } from "@/lib/auth";
import { checkLimits, clearFailures, lockedMessage, recordFailure } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-next";

export type LoginState = { error?: string; username?: string };

/** Per username (guessing one account) and per IP (trying many accounts). */
const MAX_PER_USERNAME = 5;
const MAX_PER_IP = 20;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").slice(0, 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!username || !password) return { error: "Introduce usuario y contraseña.", username };

  const userKey = `login:${username.trim().toLowerCase()}`;
  const ipKey = `login-ip:${await clientIp()}`;
  const limit = await checkLimits(db, [
    { key: userKey, max: MAX_PER_USERNAME },
    { key: ipKey, max: MAX_PER_IP },
  ]);
  if (limit.locked) return { error: lockedMessage(limit.retryAfterSeconds), username };

  const user = await verifySupervisorLogin(db, username, password);
  if (!user) {
    await recordFailure(db, [userKey, ipKey]);
    return { error: "Usuario o contraseña incorrectos.", username };
  }

  await clearFailures(db, [userKey]);
  await startSupervisorSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await endSupervisorSession();
  redirect("/");
}
