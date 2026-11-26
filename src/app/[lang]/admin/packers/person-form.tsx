"use client";

import { useState } from "react";
import { Field, SelectField } from "@/components/form";
import { Link } from "@/components/link";
import { buttonClass } from "@/components/ui";
import { useFormAction } from "@/components/use-form-action";
import { useI18n } from "@/i18n/client";
import type { FormState } from "@/lib/form-state";

type Values = { name: string; role: string; username: string };

export function PersonForm({
  action,
  initial,
  roles,
  isEdit,
  hadLogin,
  cancelHref,
  submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Values;
  roles: [string, string][];
  isEdit: boolean;
  /** Already a supervisor with a password (blank password keeps it). */
  hadLogin: boolean;
  cancelHref: string;
  submitLabel: string;
}) {
  const { d } = useI18n();
  const { state, pending, onSubmit } = useFormAction(action);
  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <PersonFields
        values={{ ...initial, ...state.values } as Values}
        errors={state.errors ?? {}}
        roles={roles}
        keepsPassword={isEdit && hadLogin}
      />
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

function PersonFields({
  values: v,
  errors: e,
  roles,
  keepsPassword,
}: {
  values: Values;
  errors: Record<string, string | undefined>;
  roles: [string, string][];
  keepsPassword: boolean;
}) {
  const { d } = useI18n();
  const [role, setRole] = useState(v.role);
  return (
    <>
      <Field label={d.field.name} name="name" defaultValue={v.name} error={e.name} required autoFocus />
      <SelectField
        label={d.field.role}
        name="role"
        value={role}
        onChange={(ev) => setRole(ev.target.value)}
        options={roles}
        error={e.role}
      />
      {role === "supervisor" && (
        <div className="space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <p className="text-sm opacity-70">{d.packers.supervisorNote}</p>
          <Field
            label={d.field.username}
            name="username"
            defaultValue={v.username}
            error={e.username}
            autoCapitalize="none"
            autoComplete="off"
            required
          />
          <Field
            label={keepsPassword ? d.field.newPassword : d.field.password}
            name="password"
            type="password"
            autoComplete="new-password"
            error={e.password}
            required={!keepsPassword}
            hint={keepsPassword ? d.packers.keepPassword : d.packers.minPassword}
          />
        </div>
      )}
    </>
  );
}
