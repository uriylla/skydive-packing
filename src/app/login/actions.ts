"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { verifySupervisorLogin } from "@/lib/accounts";
import { endSupervisorSession, startSupervisorSession } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export type LoginState = { error?: string; username?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").slice(0, 100);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  if (!username || !password) return { error: "Introduce usuario y contraseña.", username };

  const user = await verifySupervisorLogin(db, username, password);
  if (!user) return { error: "Usuario o contraseña incorrectos.", username };

  await startSupervisorSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await endSupervisorSession();
  redirect("/");
}
