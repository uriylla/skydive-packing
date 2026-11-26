import { getI18n } from "@/i18n/server";
import type { PackRow } from "@/lib/history";
import { formatDayKey, formatTime } from "@/lib/time";
import { KindBadge, ParachuteCell } from "./parachute-cell";
import { Link } from "./link";
import { Badge, Empty, Table } from "./ui";

/** Packs with links to the jornada, packer, parachute and the pack itself (to void/correct). */
export async function PackTable({
  rows,
  showDate = true,
  emptyText,
}: {
  rows: PackRow[];
  showDate?: boolean;
  emptyText?: string;
}) {
  const { d, f } = await getI18n();
  if (rows.length === 0) return <Empty>{emptyText ?? d.packs.empty}</Empty>;
  const head = [
    ...(showDate ? [d.field.day] : []),
    d.field.time,
    d.field.packer,
    d.field.parachute,
    d.field.kind,
    "",
  ];
  return (
    <Table head={head}>
      {rows.map((r) => (
        <tr key={r.id} className={r.voided ? "opacity-50" : undefined}>
          {showDate && (
            <td className="py-2 pr-4 whitespace-nowrap">
              <Link href={`/admin/days/${r.date}`} className="hover:underline">
                {formatDayKey(r.date)}
              </Link>
            </td>
          )}
          <td className={`py-2 pr-4 font-mono ${r.voided ? "line-through" : ""}`}>
            {formatTime(r.packedAt)}
          </td>
          <td className={`py-2 pr-4 ${r.voided ? "line-through" : ""}`}>
            <Link href={`/admin/packers/${r.packerId}`} className="hover:underline">
              {r.packerName}
            </Link>
          </td>
          <td className={`py-2 pr-4 font-semibold ${r.voided ? "line-through" : ""}`}>
            <ParachuteCell {...r} />
          </td>
          <td className="py-2 pr-4">
            <KindBadge kind={r.kind} />
          </td>
          <td className="py-2 text-right whitespace-nowrap">
            {r.voided && (
              <span className="mr-3">
                <Badge tone="gray">
                  {r.voidedReason
                    ? f(d.common.voidedWithReason, { reason: r.voidedReason })
                    : d.common.voided}
                </Badge>
              </span>
            )}
            {!r.voided && r.correctionOfId && (
              <span className="mr-3">
                <Badge tone="blue">{d.common.corrected}</Badge>
              </span>
            )}
            <Link href={`/admin/packs/${r.id}`} className="text-sm text-blue-600 hover:underline">
              {r.voided ? d.common.view : d.common.correct}
            </Link>
          </td>
        </tr>
      ))}
    </Table>
  );
}
