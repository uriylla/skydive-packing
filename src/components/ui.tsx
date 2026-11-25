import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10",
  danger:
    "inline-flex items-center justify-center rounded-lg border border-red-600/40 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950",
};

export function ButtonLink({
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonClass }) {
  return <Link className={buttonClass[variant]} {...props} />;
}

export function PageHeader({
  title,
  back,
  actions,
  children,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm opacity-70 hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

const badgeTone = {
  green: "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  red: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  gray: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70",
  blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
};

export function Badge({ tone, children }: { tone: keyof typeof badgeTone; children: ReactNode }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${badgeTone[tone]}`}>
      {children}
    </span>
  );
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 opacity-70 dark:border-white/10">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="py-2 pr-4 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-sm opacity-60">{children}</p>;
}

export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="opacity-60">{k}</dt>
          <dd className="mt-0.5 font-medium whitespace-pre-line">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageLoading() {
  return <p className="text-sm opacity-50">Cargando…</p>;
}
