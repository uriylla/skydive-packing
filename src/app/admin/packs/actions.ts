"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import type { FormState } from "@/lib/form-state";
import { correctPack, restorePack, voidPack } from "@/lib/history";

export async function voidPackAction(
  id: number,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const actor = await requireSupervisor(`/admin/packs/${id}`);
  const reason = String(fd.get("reason") ?? "");
  const res = await voidPack(db, id, reason, actor.id);
  if (!res.ok) return { errors: { reason: res.error }, values: { reason } };
  refresh();
  return {};
}

export async function restorePackAction(id: number): Promise<FormState> {
  await requireSupervisor(`/admin/packs/${id}`);
  const res = await restorePack(db, id);
  if (!res.ok) return { errors: { form: res.error } };
  refresh();
  return {};
}

const CorrectionSchema = z.object({
  packerId: z.coerce.number().int().positive(),
  parachuteNumber: z.string().trim().min(1, "Indica el paracaídas.").max(20),
  reason: z.string().trim().max(200),
});

export async function correctPackAction(
  id: number,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const actor = await requireSupervisor(`/admin/packs/${id}`);
  const values = {
    packerId: String(fd.get("packerId") ?? ""),
    parachuteNumber: String(fd.get("parachuteNumber") ?? ""),
    reason: String(fd.get("reason") ?? ""),
  };
  const parsed = CorrectionSchema.safeParse(values);
  if (!parsed.success) return { errors: { form: parsed.error.issues[0].message }, values };
  const res = await correctPack(db, id, parsed.data, actor.id);
  if (!res.ok) return { errors: { form: res.error }, values };
  redirect(`/admin/packs/${res.id}`);
}
