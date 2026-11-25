import Link from "next/link";
import type { PackRow } from "@/lib/history";
import { formatDateTime } from "@/lib/time";
import { Empty, Table } from "./ui";

/** Pack list for a parachute or a packer (the other side is shown as a link). */
export function PackHistory({
  rows,
  total,
  show,
}: {
  rows: PackRow[];
  total: number;
  show: "packer" | "parachute";
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
          <Table head={["Fecha y hora", show === "packer" ? "Plegador" : "Paracaídas", ""]}>
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
                    <Link href={`/admin/parachutes/${r.parachuteId}`} className="hover:underline">
                      {r.parachuteNumber}
                    </Link>
                  )}
                </td>
                <td className="py-2 text-xs">{r.voided && `Anulado: ${r.voidedReason ?? ""}`}</td>
              </tr>
            ))}
          </Table>
          {total > rows.length && (
            <p className="mt-2 text-sm opacity-60">
              Mostrando los {rows.length} más recientes. El historial completo con filtros llega en
              la sección Historial.
            </p>
          )}
        </>
      )}
    </section>
  );
}
