import type { DaySummary } from "@/lib/packs";
import { formatTime } from "@/lib/time";

export function TodayPanel({ summary }: { summary: DaySummary }) {
  const [y, m, d] = summary.date.split("-");
  return (
    <section aria-labelledby="today-heading" className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-baseline justify-between">
        <h2 id="today-heading" className="font-semibold">
          Hoy · {d}/{m}/{y}
        </h2>
        <p className="text-sm">
          Total: <strong className="text-lg">{summary.total}</strong>
        </p>
      </div>

      {summary.byPacker.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-80">
          {summary.byPacker.map((p) => (
            <li key={p.packerId}>
              {p.name} — {p.count}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-medium opacity-70">Últimos plegados</h3>
      {summary.recent.length === 0 ? (
        <p className="mt-1 text-sm opacity-60">Todavía no hay plegados hoy.</p>
      ) : (
        <ol className="mt-1 divide-y divide-black/5 font-mono text-sm dark:divide-white/10">
          {summary.recent.map((r) => (
            <li key={r.id} className="py-1.5">
              {formatTime(new Date(r.packedAt))} — {r.packerName} — {r.parachuteNumber}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
