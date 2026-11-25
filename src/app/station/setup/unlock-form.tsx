"use client";

import { useActionState } from "react";
import { Field, FormError, primaryButtonClass } from "@/components/form";
import { unlockStationAction, type UnlockState } from "./actions";

/** Authorizes this device, or renames it when `currentName` is set. */
export function UnlockForm({ currentName }: { currentName?: string }) {
  const [state, formAction, pending] = useActionState<UnlockState, FormData>(
    unlockStationAction,
    {},
  );
  const renaming = currentName !== undefined;
  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Nombre del dispositivo"
        name="name"
        placeholder="PC zona de plegado"
        defaultValue={currentName}
        maxLength={60}
        required
        autoFocus
      />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {renaming
          ? pending
            ? "Guardando…"
            : "Cambiar nombre"
          : pending
            ? "Autorizando…"
            : "Autorizar este dispositivo"}
      </button>
    </form>
  );
}
