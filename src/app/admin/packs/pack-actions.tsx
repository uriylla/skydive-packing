"use client";

import { useState } from "react";
import { Field, FormError, SelectField } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import type { FormState } from "@/lib/form-state";
import { KIND_LABEL, KINDS, MAX_EXTERNAL_LABEL } from "@/lib/kinds";

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

type CorrectValues = {
  packerId: string;
  mode: string;
  parachuteNumber: string;
  kind: string;
  externalLabel: string;
};

export function CorrectForm({
  action,
  people,
  initial,
}: {
  action: Action;
  people: [string, string][];
  initial: CorrectValues;
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const v = { ...initial, reason: "", ...state.values } as CorrectValues & { reason: string };
  const [mode, setMode] = useState(v.mode);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <SelectField label="Plegador" name="packerId" defaultValue={v.packerId} options={people} />
      <fieldset className="flex gap-4 text-sm">
        <legend className="mb-1 text-sm font-medium">Paracaídas</legend>
        {(
          [
            ["registered", "Registrado"],
            ["external", "Externo (no registrado)"],
          ] as const
        ).map(([value, text]) => (
          <label key={value} className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {text}
          </label>
        ))}
      </fieldset>
      {mode === "registered" ? (
        <Field
          label="Número de paracaídas"
          name="parachuteNumber"
          defaultValue={v.parachuteNumber}
          required
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <SelectField
            label="Tipo"
            name="kind"
            defaultValue={v.kind}
            options={KINDS.map((k) => [k, KIND_LABEL[k]])}
          />
          <Field
            label="Descripción"
            name="externalLabel"
            defaultValue={v.externalLabel}
            maxLength={MAX_EXTERNAL_LABEL}
            required
          />
        </div>
      )}
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
