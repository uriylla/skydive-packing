"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getRequestI18n } from "@/i18n/request";
import { createStation, renameStation } from "@/lib/accounts";
import { getStation, requireSupervisor, startStationSession } from "@/lib/auth";

export type UnlockState = { error?: string };

export async function unlockStationAction(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const supervisor = await requireSupervisor("/station/setup");
  const { d, locale } = await getRequestI18n();

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return { error: d.msg.stationNameRequired };

  // Already authorized: just rename it, so the device doesn't end up listed twice.
  const current = await getStation();
  if (current) {
    await renameStation(db, current.id, name);
    redirect(localePath(locale, "/admin/stations"));
  }

  const station = await createStation(db, name, supervisor.id);
  await startStationSession(station.id);
  redirect(localePath(locale, "/"));
}
