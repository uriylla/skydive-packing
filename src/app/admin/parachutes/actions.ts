"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { formValues, zodFieldErrors, type FormState } from "@/lib/form-state";
import {
  createParachute,
  ParachuteInput,
  setParachuteRetired,
  updateParachute,
} from "@/lib/parachutes";

const FIELDS = ["number", "kind", "model", "serialNumber", "owner", "status", "notes"] as const;

/** Create (id = null) or update a parachute. Bind the id before passing it to the form. */
export async function saveParachuteAction(
  id: number | null,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireSupervisor("/admin/parachutes");
  const values = formValues(fd, FIELDS);
  const parsed = ParachuteInput.safeParse(values);
  if (!parsed.success) return { errors: zodFieldErrors(parsed.error), values };

  const res = id
    ? await updateParachute(db, id, parsed.data)
    : await createParachute(db, parsed.data);
  if (!res.ok) return { errors: res.errors, values };
  redirect(`/admin/parachutes/${res.id}`);
}

export async function setParachuteRetiredAction(id: number, retired: boolean) {
  await requireSupervisor(`/admin/parachutes/${id}`);
  await setParachuteRetired(db, id, retired);
  refresh();
}
