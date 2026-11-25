import Link from "next/link";
import type { PackRow } from "@/lib/history";
import { formatDayKey, formatTime } from "@/lib/time";
import { Badge, Empty, Table } from "./ui";

/** Packs with links to the jornada, packer, parachute and the pack itself (to void/correct). */
export function PackTable({
  rows,
  showDate = true,
  emptyText = "No hay plegados.",
}: {
  rows: PackRow[];
  showDate?: boolean;
  emptyText?: string;
}) {
  if (rows.length === 0) return <Empty>{emptyText}</Empty>;
  const head = [...(showDate ? ["Jornada"] : []), "Hora", "Plegador", "Paracaídas", ""];
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
            <Link href={`/admin/parachutes/${r.parachuteId}`} className="hover:underline">
              {r.parachuteNumber}
            </Link>
          </td>
          <td className="py-2 text-right whitespace-nowrap">
            {r.voided && (
              <span className="mr-3">
                <Badge tone="gray">Anulado{r.voidedReason ? `: ${r.voidedReason}` : ""}</Badge>
              </span>
            )}
            {!r.voided && r.correctionOfId && (
              <span className="mr-3">
                <Badge tone="blue">Corregido</Badge>
              </span>
            )}
            <Link href={`/admin/packs/${r.id}`} className="text-sm text-blue-600 hover:underline">
              {r.voided ? "Ver" : "Corregir"}
            </Link>
          </td>
        </tr>
      ))}
    </Table>
  );
}
