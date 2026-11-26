"use client";

import { useActionState } from "react";
import { Field, FormError, primaryButtonClass } from "@/components/form";
import { useI18n } from "@/i18n/client";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        label={d.field.username}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        defaultValue={state.username}
        required
        autoFocus
      />
      <Field
        label={d.field.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? d.login.submitting : d.login.submit}
      </button>
    </form>
  );
}
