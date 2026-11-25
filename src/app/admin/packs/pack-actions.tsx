"use client";

import { Field, FormError, SelectField } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function VoidForm({ action }: { action: Action }) {
  const { state, pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field
        label="Motivo"
        name="reason"
        defaultValue={state.values?.reason}
        error={state.errors?.reason}
        placeholder="p. ej. Registrado dos veces"
        maxLength={200}
        required
      />
      <button type="submit" disabled={pending} className={buttonClass.danger}>
        {pending ? "Anulando…" : "Anular plegado"}
      </button>
    </form>
  );
}

export function CorrectForm({
  action,
  people,
  initial,
}: {
  action: Action;
  people: [string, string][];
  initial: { packerId: string; parachuteNumber: string };
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const v = { ...initial, reason: "", ...state.values };
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Plegador" name="packerId" defaultValue={v.packerId} options={people} />
        <Field
          label="Paracaídas"
          name="parachuteNumber"
          defaultValue={v.parachuteNumber}
          required
        />
      </div>
      <Field
        label="Motivo (opcional)"
        name="reason"
        defaultValue={v.reason}
        placeholder="Corregido"
        maxLength={200}
      />
      <FormError message={state.errors?.form} />
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? "Guardando…" : "Guardar corrección"}
      </button>
    </form>
  );
}

export function RestoreForm({ action }: { action: () => Promise<FormState> }) {
  const { state, pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <button type="submit" disabled={pending} className={buttonClass.secondary}>
        {pending ? "Restaurando…" : "Deshacer anulación"}
      </button>
      <FormError message={state.errors?.form} />
    </form>
  );
}
