import { useId, type ComponentProps } from "react";

/** Input look without a width, for inline controls. */
export const inputBaseClass =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2.5 outline-none focus:border-blue-600 dark:border-white/20";
export const inputClass = `w-full ${inputBaseClass}`;

export function Field({
  label,
  error,
  hint,
  ...props
}: { label: string; error?: string; hint?: string } & ComponentProps<"input">) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        {...props}
      />
      <FieldNote id={noteId} error={error} hint={hint} />
    </div>
  );
}

function FieldNote({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <span id={id} className="mt-1 block text-sm text-red-700 dark:text-red-300">
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span id={id} className="mt-1 block text-xs opacity-60">
        {hint}
      </span>
    );
  }
  return null;
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-900/40 dark:text-red-100"
    >
      {message}
    </p>
  );
}

export const primaryButtonClass =
  "w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50";

export function SelectField({
  label,
  options,
  error,
  ...props
}: { label: string; options: [string, string][]; error?: string } & ComponentProps<"select">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-note` : undefined}
        {...props}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
      <FieldNote id={`${id}-note`} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  ...props
}: { label: string; error?: string } & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        className={inputClass}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-note` : undefined}
        {...props}
      />
      <FieldNote id={`${id}-note`} error={error} />
    </div>
  );
}
