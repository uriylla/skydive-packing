"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { formValues, zodFieldErrors, type FormState } from "@/lib/form-state";
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
  const values = formValues(fd, FIELDS);
  const parsed = PersonInput.safeParse(values);
  // Never send the password back to the browser.
  const safeValues = { ...values, password: "" };
  if (!parsed.success) return { errors: zodFieldErrors(parsed.error), values: safeValues };

  const res = id
    ? await updatePerson(db, id, parsed.data, actor.id)
    : await createPerson(db, parsed.data);
  if (!res.ok) return { errors: res.errors, values: safeValues };
  redirect(`/admin/packers/${res.id}`);
}

export type SimpleState = { error?: string; message?: string };

export async function setPersonActiveAction(id: number, active: boolean): Promise<SimpleState> {
  const actor = await requireSupervisor(`/admin/packers/${id}`);
  const res = await setPersonActive(db, id, active, actor.id);
  if (!res.ok) return { error: res.error };
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
  if (fd.get("intent") === "clear") {
    await setPersonPin(db, id, null);
    refresh();
    return { message: "PIN eliminado." };
  }
  const pin = String(fd.get("pin") ?? "").trim();
  if (!PIN_REGEX.test(pin)) return { error: "El PIN debe tener de 4 a 8 cifras." };
  await setPersonPin(db, id, pin);
  refresh();
  return { message: "PIN guardado." };
}
