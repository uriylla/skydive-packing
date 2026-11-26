"use client";

import { Field, SelectField, TextAreaField } from "@/components/form";
import { Link } from "@/components/link";
import { buttonClass } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import { useI18n } from "@/i18n/client";
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
  const { d } = useI18n();
  const { state, pending, onSubmit } = useFormAction(action);
  const v = { ...initial, ...state.values } as Values;
  const e = state.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={d.field.number}
          name="number"
          defaultValue={v.number}
          error={e.number}
          required
          autoFocus
          hint={d.parachutes.numberHint}
        />
        <SelectField
          label={d.field.kind}
          name="kind"
          defaultValue={v.kind}
          options={kinds}
          error={e.kind}
        />
        <SelectField
          label={d.field.status}
          name="status"
          defaultValue={v.status}
          options={statuses}
          error={e.status}
        />
        <Field label={d.field.model} name="model" defaultValue={v.model} error={e.model} />
        <Field
          label={d.field.serialNumber}
          name="serialNumber"
          defaultValue={v.serialNumber}
          error={e.serialNumber}
        />
        <Field label={d.field.owner} name="owner" defaultValue={v.owner} error={e.owner} />
      </div>
      <TextAreaField label={d.field.notes} name="notes" defaultValue={v.notes} error={e.notes} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={buttonClass.primary}>
          {pending ? d.common.saving : submitLabel}
        </button>
        <Link href={cancelHref} className={buttonClass.secondary}>
          {d.common.cancel}
        </Link>
      </div>
    </form>
  );
}
