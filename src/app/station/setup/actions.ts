"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { createStation } from "@/lib/accounts";
import { getSupervisor, startStationSession } from "@/lib/auth";

export type UnlockState = { error?: string };

export async function unlockStationAction(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const supervisor = await getSupervisor();
  if (!supervisor) redirect("/login?next=/station/setup");

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { error: "Ponle un nombre al dispositivo (p. ej. «PC plegado»)." };

  const station = await createStation(db, name, supervisor.id);
  await startStationSession(station.id);
  redirect("/");
}
