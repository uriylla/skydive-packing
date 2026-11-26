"use client";

import { useState } from "react";
import { Field, FormError, SelectField } from "@/components/form";
import { buttonClass } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import { useI18n } from "@/i18n/client";
import type { FormState } from "@/lib/form-state";
import { KINDS, MAX_EXTERNAL_LABEL } from "@/lib/kinds";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

export function VoidForm({ action }: { action: Action }) {
  const { d } = useI18n();
  const { state, pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field
        label={d.field.reason}
        name="reason"
        defaultValue={state.values?.reason}
        error={state.errors?.reason}
        placeholder={d.pack.voidPlaceholder}
        maxLength={200}
        required
      />
      <button type="submit" disabled={pending} className={buttonClass.danger}>
        {pending ? d.pack.voiding : d.pack.void}
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
  const { d } = useI18n();
  const { state, pending, onSubmit } = useFormAction(action);
  const v = { ...initial, reason: "", ...state.values } as CorrectValues & { reason: string };
  const [mode, setMode] = useState(v.mode);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <SelectField label={d.field.packer} name="packerId" defaultValue={v.packerId} options={people} />
      <fieldset className="flex gap-4 text-sm">
        <legend className="mb-1 text-sm font-medium">{d.field.parachute}</legend>
        {(
          [
            ["registered", d.pack.registered],
            ["external", d.pack.externalOption],
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
          label={d.station.numberLabel}
          name="parachuteNumber"
          defaultValue={v.parachuteNumber}
          required
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <SelectField
            label={d.field.kind}
            name="kind"
            defaultValue={v.kind}
            options={KINDS.map((k) => [k, d.kind[k]])}
          />
          <Field
            label={d.pack.description}
            name="externalLabel"
            defaultValue={v.externalLabel}
            maxLength={MAX_EXTERNAL_LABEL}
            required
          />
        </div>
      )}
      <Field
        label={d.pack.reasonOptional}
        name="reason"
        defaultValue={v.reason}
        placeholder={d.pack.defaultReason}
        maxLength={200}
      />
      <FormError message={state.errors?.form} />
      <button type="submit" disabled={pending} className={buttonClass.primary}>
        {pending ? d.common.saving : d.pack.saveCorrection}
      </button>
    </form>
  );
}

export function RestoreForm({ action }: { action: () => Promise<FormState> }) {
  const { d } = useI18n();
  const { state, pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <button type="submit" disabled={pending} className={buttonClass.secondary}>
        {pending ? d.pack.restoring : d.pack.restore}
      </button>
      <FormError message={state.errors?.form} />
    </form>
  );
}
