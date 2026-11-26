"use server";

import { refresh } from "next/cache";
import { db } from "@/db";
import { revokeStation } from "@/lib/accounts";
import { requireSupervisor } from "@/lib/auth";

export async function revokeStationAction(formData: FormData) {
  await requireSupervisor("/admin/stations");
  const id = Number(formData.get("stationId"));
  if (!Number.isInteger(id) || id <= 0) return;
  await revokeStation(db, id);
  refresh();
}
