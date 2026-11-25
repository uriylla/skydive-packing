"use client";

import { useActionState } from "react";
import { inputBaseClass } from "@/components/form";
import { buttonClass } from "@/components/ui";
import type { SimpleState } from "./actions";

export function ActiveToggle({
  active,
  action,
}: {
  active: boolean;
  action: () => Promise<SimpleState>;
}) {
  const [state, formAction, pending] = useActionState<SimpleState>(action, {});
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className={active ? buttonClass.danger : buttonClass.secondary}
      >
        {active ? "Desactivar" : "Reactivar"}
      </button>
      {state.error && (
        <span role="alert" className="text-sm text-red-700 dark:text-red-300">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function PinForm({
  hasPin,
  action,
}: {
  hasPin: boolean;
  action: (prev: SimpleState, fd: FormData) => Promise<SimpleState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={4}
          maxLength={8}
          autoComplete="off"
          placeholder={hasPin ? "Nuevo PIN" : "PIN (4–8 cifras)"}
          aria-label="PIN"
          className={`${inputBaseClass} w-40`}
        />
        <button
          type="submit"
          name="intent"
          value="set"
          disabled={pending}
          className={buttonClass.secondary}
        >
          {hasPin ? "Cambiar PIN" : "Asignar PIN"}
        </button>
        {hasPin && (
          <button
            type="submit"
            name="intent"
            value="clear"
            formNoValidate
            disabled={pending}
            className={buttonClass.danger}
          >
            Quitar PIN
          </button>
        )}
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="text-sm text-green-700 dark:text-green-300">{state.message}</p>
      )}
    </form>
  );
}
