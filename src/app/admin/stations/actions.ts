"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revokeStation } from "@/lib/accounts";
import { getSupervisor } from "@/lib/auth";

export async function revokeStationAction(formData: FormData) {
  if (!(await getSupervisor())) redirect("/login?next=/admin/stations");
  const id = Number(formData.get("stationId"));
  if (!Number.isInteger(id) || id <= 0) return;
  await revokeStation(db, id);
  refresh();
}
