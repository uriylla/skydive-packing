"use client";

import { useActionState } from "react";
import { Field, FormError, primaryButtonClass } from "@/components/form";
import { unlockStationAction, type UnlockState } from "./actions";

export function UnlockForm() {
  const [state, formAction, pending] = useActionState<UnlockState, FormData>(
    unlockStationAction,
    {},
  );
  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Nombre del dispositivo"
        name="name"
        placeholder="PC zona de plegado"
        maxLength={60}
        required
        autoFocus
      />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Autorizando…" : "Autorizar este dispositivo"}
      </button>
    </form>
  );
}
