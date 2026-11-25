"use client";

import Link from "next/link";
import { Field, SelectField, TextAreaField } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";

type Values = {
  number: string;
  kind: string;
  model: string;
  serialNumber: string;
  owner: string;
  status: string;
  notes: string;
};

export function ParachuteForm({
  action,
  initial,
  statuses,
  kinds,
  cancelHref,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Values;
  statuses: [string, string][];
  kinds: [string, string][];
  cancelHref: string;
  submitLabel: string;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const v = { ...initial, ...state.values } as Values;
  const e = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Número"
          name="number"
          defaultValue={v.number}
          error={e.number}
          required
          autoFocus
          hint="El número pintado en el equipo, p. ej. 023."
        />
        <SelectField
          label="Tipo"
          name="kind"
          defaultValue={v.kind}
          options={kinds}
          error={e.kind}
        />
        <SelectField
          label="Estado"
          name="status"
          defaultValue={v.status}
          options={statuses}
          error={e.status}
        />
        <Field label="Modelo" name="model" defaultValue={v.model} error={e.model} />
        <Field
          label="Número de serie"
          name="serialNumber"
          defaultValue={v.serialNumber}
          error={e.serialNumber}
        />
        <Field label="Propietario" name="owner" defaultValue={v.owner} error={e.owner} />
      </div>
      <TextAreaField label="Observaciones" name="notes" defaultValue={v.notes} error={e.notes} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? "Guardando…" : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass.secondary}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
