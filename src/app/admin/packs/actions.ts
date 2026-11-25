"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { formValues, type FormState } from "@/lib/form-state";
import { KINDS, MAX_EXTERNAL_LABEL } from "@/lib/kinds";
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

const CorrectionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("registered"),
    packerId: z.coerce.number().int().positive(),
    parachuteNumber: z.string().trim().min(1, "Indica el paracaídas.").max(20),
    reason: z.string().trim().max(200),
  }),
  z.object({
    mode: z.literal("external"),
    packerId: z.coerce.number().int().positive(),
    kind: z.enum(KINDS, "Elige el tipo."),
    externalLabel: z
      .string()
      .trim()
      .min(1, "Describe el paracaídas externo.")
      .max(MAX_EXTERNAL_LABEL),
    reason: z.string().trim().max(200),
  }),
]);

const CORRECTION_FIELDS = [
  "mode",
  "packerId",
  "parachuteNumber",
  "kind",
  "externalLabel",
  "reason",
];

export async function correctPackAction(
  id: number,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const actor = await requireSupervisor(`/admin/packs/${id}`);
  const values = formValues(fd, CORRECTION_FIELDS);
  const parsed = CorrectionSchema.safeParse(values);
  if (!parsed.success) return { errors: { form: parsed.error.issues[0].message }, values };
  const d = parsed.data;
  const res = await correctPack(
    db,
    id,
    {
      packerId: d.packerId,
      reason: d.reason,
      ...(d.mode === "external"
        ? { external: { kind: d.kind, label: d.externalLabel } }
        : { parachuteNumber: d.parachuteNumber }),
    },
    actor.id,
  );
  if (!res.ok) return { errors: { form: res.error }, values };
  redirect(`/admin/packs/${res.id}`);
}
