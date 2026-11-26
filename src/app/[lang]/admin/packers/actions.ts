"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { localePath } from "@/i18n/config";
import { getRequestI18n } from "@/i18n/request";
import { requireSupervisor } from "@/lib/auth";
import { formValues, translateErrors, zodFieldErrors, type FormState } from "@/lib/form-state";
import {
  createPerson,
  PersonInput,
  PIN_REGEX,
  setPersonActive,
  setPersonPin,
  updatePerson,
} from "@/lib/people";

const FIELDS = ["name", "role", "username", "password"] as const;

export async function savePersonAction(
  id: number | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const actor = await requireSupervisor("/admin/packers");
  const i18n = await getRequestI18n();
  const values = formValues(fd, FIELDS);
  const parsed = PersonInput.safeParse(values);
  // Never send the password back to the browser.
  const safeValues = { ...values, password: "" };
  if (!parsed.success) return { errors: zodFieldErrors(parsed.error, i18n), values: safeValues };

  const res = id
    ? await updatePerson(db, id, parsed.data, actor.id)
    : await createPerson(db, parsed.data);
  if (!res.ok) return { errors: translateErrors(res.errors, i18n), values: safeValues };
  redirect(localePath(i18n.locale, `/admin/packers/${res.id}`));
}

export type SimpleState = { error?: string; message?: string };

export async function setPersonActiveAction(id: number, active: boolean): Promise<SimpleState> {
  const actor = await requireSupervisor(`/admin/packers/${id}`);
  const res = await setPersonActive(db, id, active, actor.id);
  if (!res.ok) return { error: (await getRequestI18n()).m(res.error) };
  refresh();
  return {};
}

/** Submit with intent=set (and a pin) or intent=clear. */
export async function setPinAction(
  id: number,
  _prev: SimpleState,
  fd: FormData,
): Promise<SimpleState> {
  await requireSupervisor(`/admin/packers/${id}`);
  const { d } = await getRequestI18n();
  if (fd.get("intent") === "clear") {
    await setPersonPin(db, id, null);
    refresh();
    return { message: d.packers.pinCleared };
  }
  const pin = String(fd.get("pin") ?? "").trim();
  if (!PIN_REGEX.test(pin)) return { error: d.msg.pinFormat };
  await setPersonPin(db, id, pin);
  refresh();
  return { message: d.packers.pinSaved };
}
