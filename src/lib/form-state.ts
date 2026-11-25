import type { z } from "zod";

/** State returned by form Server Actions to useActionState. */
export type FormState = {
  errors?: Record<string, string | undefined>;
  /** Submitted values, to refill the form after an error. */
  values?: Record<string, string>;
};

export function formValues(fd: FormData, fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(fd.get(f) ?? "")]));
}

/** First message per field. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
