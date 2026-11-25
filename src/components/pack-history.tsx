import Link from "next/link";
import type { PackRow } from "@/lib/history";
import { formatDateTime } from "@/lib/time";
import { KindBadge, ParachuteCell } from "./parachute-cell";
import { Empty, Table } from "./ui";

/** Pack list for a parachute or a packer (the other side is shown as a link). */
export function PackHistory({
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
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">
        Historial de plegados <span className="text-sm font-normal opacity-60">({total})</span>
      </h2>
      {rows.length === 0 ? (
        <Empty>Todavía no hay plegados.</Empty>
      ) : (
        <>
          <Table head={["Fecha y hora", show === "packer" ? "Plegador" : "Paracaídas", "Tipo", ""]}>
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
                  {r.voided && `Anulado: ${r.voidedReason ?? ""} `}
                  <Link href={`/admin/packs/${r.id}`} className="text-blue-600 hover:underline">
                    {r.voided ? "Ver" : "Corregir"}
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
          {total > rows.length && (
            <p className="mt-2 text-sm">
              <span className="opacity-60">Mostrando los {rows.length} más recientes. </span>
              <Link href={historyHref} className="text-blue-600 hover:underline">
                Ver todos en el historial
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}
