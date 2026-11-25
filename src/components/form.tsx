import type { ComponentProps } from "react";

export const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2.5 outline-none focus:border-blue-600 dark:border-white/20";

export function Field({ label, ...props }: { label: string } & ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-900/40 dark:text-red-100">
      {message}
    </p>
  );
}

export const primaryButtonClass =
  "w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50";
