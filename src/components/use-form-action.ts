"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "@/lib/form-state";

/**
 * useActionState for forms whose fields must survive a failed submit.
 *
 * With `<form action={…}>` React resets the form after the action runs, and a
 * reset puts every <select> back on its first option, silently changing what
 * gets submitted next time. Submitting through `onSubmit` skips that reset, so
 * the fields keep exactly what the user entered.
 */
export function useFormAction(action: (prev: FormState, fd: FormData) => Promise<FormState>) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }
  return { state, pending, onSubmit };
}
