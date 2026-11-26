import type { z } from "zod";
import type { I18n, MsgKey } from "@/i18n/translate";

/** State returned by form Server Actions to useActionState (messages already translated). */
export type FormState = {
  errors?: Record<string, string | undefined>;
  /** Submitted values, to refill the form after an error. */
  values?: Record<string, string>;
};

export function formValues(fd: FormData, fields: readonly string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(fd.get(f) ?? "")]));
}

/**
 * First message per field. Schema messages are message keys ("required",
 * "maxChars"…); limits from the issue fill their placeholders.
 */
export function zodFieldErrors(error: z.ZodError, i18n: I18n): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= zodMessage(issue, i18n);
  }
  return out;
}

export function zodMessage(issue: z.core.$ZodIssue, i18n: I18n): string {
  const key = (issue.message in i18n.d.msg ? issue.message : "invalid") as MsgKey;
  const values: Record<string, number> = {};
  if (issue.code === "too_big") values.max = Number(issue.maximum);
  if (issue.code === "too_small") values.min = Number(issue.minimum);
  return i18n.m({ key, values });
}

/** Translate a library result's field errors. */
export function translateErrors(
  errors: Partial<Record<string, { key: MsgKey; values?: Record<string, string | number> }>>,
  i18n: I18n,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, m] of Object.entries(errors)) if (m) out[field] = i18n.m(m);
  return out;
}
