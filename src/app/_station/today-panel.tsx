import { KIND_SHORT } from "@/lib/kinds";
import type { DaySummary } from "@/lib/packs";
import { formatTime } from "@/lib/time";

export function TodayPanel({ summary }: { summary: DaySummary }) {
  const [y, m, d] = summary.date.split("-");
  return (
    <section
      aria-labelledby="today-heading"
      className="rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="today-heading" className="font-semibold">
          Hoy · {d}/{m}/{y}
        </h2>
        <p className="text-sm">
          Total: <strong className="text-lg">{summary.total}</strong>
          {summary.total > 0 && (
            <span className="opacity-70">
              {" "}
              · {summary.tandem} T · {summary.normal} N
            </span>
          )}
        </p>
      </div>

      {summary.byPacker.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-sm">
          {summary.byPacker.map((p) => (
            <li key={p.packerId} className="flex justify-between gap-3">
              <span>{p.name}</span>
              <span className="tabular-nums">
                <strong>{p.count}</strong>
                <span className="opacity-60">
                  {" "}
                  · {p.tandem} T · {p.normal} N
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-medium opacity-70">Últimos plegados</h3>
      {summary.recent.length === 0 ? (
        <p className="mt-1 text-sm opacity-60">Todavía no hay plegados hoy.</p>
      ) : (
        <ol className="mt-1 divide-y divide-black/5 text-sm dark:divide-white/10">
          {summary.recent.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 py-1.5">
              <span className="font-mono">
                {formatTime(new Date(r.packedAt))} — {r.packerName} —{" "}
                {r.parachuteNumber ?? <span className="font-sans italic">{r.externalLabel}</span>}
              </span>
              <span className="opacity-60" title={r.kind === "tandem" ? "Tándem" : "Normal"}>
                {KIND_SHORT[r.kind]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
