import { getI18n } from "@/i18n/server";
import type { PackRow } from "@/lib/history";
import { formatDateTime } from "@/lib/time";
import { KindBadge, ParachuteCell } from "./parachute-cell";
import { Link } from "./link";
import { Empty, Table } from "./ui";

/** Pack list for a parachute or a packer (the other side is shown as a link). */
export async function PackHistory({
  rows,
  total,
  show,
  historyHref,
}: {
  rows: PackRow[];
  total: number;
  show: "packer" | "parachute";
  /** Link to the full, filterable history for this parachute/packer. */
  historyHref: string;
}) {
  const { d, f } = await getI18n();
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">
        {d.packs.historyTitle} <span className="text-sm font-normal opacity-60">({total})</span>
      </h2>
      {rows.length === 0 ? (
        <Empty>{d.packs.noPacksYet}</Empty>
      ) : (
        <>
          <Table head={[
              d.field.dateTime,
              show === "packer" ? d.field.packer : d.field.parachute,
              d.field.kind,
              "",
            ]}>
            {rows.map((r) => (
              <tr key={r.id} className={r.voided ? "line-through opacity-50" : undefined}>
                <td className="py-2 pr-4 font-mono whitespace-nowrap">
                  {formatDateTime(r.packedAt)}
                </td>
                <td className="py-2 pr-4">
                  {show === "packer" ? (
                    <Link href={`/admin/packers/${r.packerId}`} className="hover:underline">
                      {r.packerName}
                    </Link>
                  ) : (
                    <ParachuteCell {...r} />
                  )}
                </td>
                <td className="py-2 pr-4">
                  <KindBadge kind={r.kind} />
                </td>
                <td className="py-2 text-right text-xs whitespace-nowrap">
                  {r.voided && `${f(d.common.voidedWithReason, { reason: r.voidedReason ?? "" })} `}
                  <Link href={`/admin/packs/${r.id}`} className="text-blue-600 hover:underline">
                    {r.voided ? d.common.view : d.common.correct}
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
          {total > rows.length && (
            <p className="mt-2 text-sm">
              <span className="opacity-60">{f(d.packs.showingRecent, { n: rows.length })} </span>
              <Link href={historyHref} className="text-blue-600 hover:underline">
                {d.packs.viewAll}
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
