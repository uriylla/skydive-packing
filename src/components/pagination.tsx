import Link from "next/link";

/** "Anterior / Página 2 de 5 / Siguiente" links that keep the other query params. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const link =
    "rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5 dark:border-white/20";
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link}>
          ← Anterior
        </Link>
      ) : (
        <span className={`${link} opacity-40`}>← Anterior</span>
      )}
      <span className="opacity-70">
        Página {page} de {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={link}>
          Siguiente →
        </Link>
      ) : (
        <span className={`${link} opacity-40`}>Siguiente →</span>
      )}
    </nav>
  );
}

export function parsePage(raw: unknown): number {
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}
