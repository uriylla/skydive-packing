import { getI18n } from "@/i18n/server";
import type { DaySummary } from "@/lib/packs";
import { formatDayKey, formatTime } from "@/lib/time";

export async function TodayPanel({ summary }: { summary: DaySummary }) {
  const { d, f } = await getI18n();
  const T = d.kindShort.tandem;
  const N = d.kindShort.normal;
  return (
    <section
      aria-labelledby="today-heading"
      className="rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="today-heading" className="font-semibold">
          {f(d.station.today, { date: formatDayKey(summary.date) })}
        </h2>
        <p className="text-sm">
          {d.station.total} <strong className="text-lg">{summary.total}</strong>
          {summary.total > 0 && (
            <span className="opacity-70">
              {" "}
              · {summary.tandem} {T} · {summary.normal} {N}
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
                  · {p.tandem} {T} · {p.normal} {N}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-4 text-sm font-medium opacity-70">{d.station.recent}</h3>
      {summary.recent.length === 0 ? (
        <p className="mt-1 text-sm opacity-60">{d.station.noPacksToday}</p>
      ) : (
        <ol className="mt-1 divide-y divide-black/5 text-sm dark:divide-white/10">
          {summary.recent.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 py-1.5">
              <span className="font-mono">
                {formatTime(new Date(r.packedAt))} — {r.packerName} —{" "}
                {r.parachuteNumber ?? <span className="font-sans italic">{r.externalLabel}</span>}
              </span>
              <span className="opacity-60" title={d.kind[r.kind]}>
                {d.kindShort[r.kind]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
