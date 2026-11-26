"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getRequestI18n } from "@/i18n/request";
import { requireSupervisor } from "@/lib/auth";
import { formValues, zodMessage, type FormState } from "@/lib/form-state";
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
  if (!res.ok) {
    const { m } = await getRequestI18n();
    return { errors: { reason: m(res.error) }, values: { reason } };
  }
  refresh();
  return {};
}

export async function restorePackAction(id: number): Promise<FormState> {
  await requireSupervisor(`/admin/packs/${id}`);
  const res = await restorePack(db, id);
  if (!res.ok) return { errors: { form: (await getRequestI18n()).m(res.error) } };
  refresh();
  return {};
}

const CorrectionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("registered"),
    packerId: z.coerce.number().int().positive(),
    parachuteNumber: z.string().trim().min(1, "parachuteNumberRequired").max(20),
    reason: z.string().trim().max(200),
  }),
  z.object({
    mode: z.literal("external"),
    packerId: z.coerce.number().int().positive(),
    kind: z.enum(KINDS, "chooseKind"),
    externalLabel: z
      .string()
      .trim()
      .min(1, "externalLabelRequired")
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
  const i18n = await getRequestI18n();
  const values = formValues(fd, CORRECTION_FIELDS);
  const parsed = CorrectionSchema.safeParse(values);
  if (!parsed.success) return { errors: { form: zodMessage(parsed.error.issues[0], i18n) }, values };
  const d = parsed.data;
  const res = await correctPack(
    db,
    id,
    {
      packerId: d.packerId,
      reason: d.reason,
      defaultReason: i18n.d.pack.defaultReason,
      ...(d.mode === "external"
        ? { external: { kind: d.kind, label: d.externalLabel } }
        : { parachuteNumber: d.parachuteNumber }),
    },
    actor.id,
  );
  if (!res.ok) return { errors: { form: i18n.m(res.error) }, values };
  redirect(localePath(i18n.locale, `/admin/packs/${res.id}`));
}
