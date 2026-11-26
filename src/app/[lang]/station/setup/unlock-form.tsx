"use client";

import { useActionState } from "react";
import { Field, FormError, primaryButtonClass } from "@/components/form";
import { useI18n } from "@/i18n/client";
import { unlockStationAction, type UnlockState } from "./actions";

/** Authorizes this device, or renames it when `currentName` is set. */
export function UnlockForm({ currentName }: { currentName?: string }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<UnlockState, FormData>(
    unlockStationAction,
    {},
  );
  const renaming = currentName !== undefined;
  return (
    <form action={formAction} className="space-y-4">
      <Field
        label={d.setup.nameLabel}
        name="name"
        placeholder={d.setup.namePlaceholder}
        defaultValue={currentName}
        maxLength={60}
        required
        autoFocus
      />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {renaming
          ? pending
            ? d.common.saving
            : d.setup.rename
          : pending
            ? d.setup.authorizing
            : d.setup.authorize}
      </button>
    </form>
  );
}
