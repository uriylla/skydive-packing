import Link from "next/link";
import { inputBaseClass } from "@/components/form";
import { Badge, ButtonLink, buttonClass, Empty, PageHeader, Table } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import {
  listParachutes,
  PARACHUTE_STATUSES,
  STATUS_LABEL,
  type ParachuteStatus,
} from "@/lib/parachutes";
import { formatDateTime } from "@/lib/time";
import { StatusBadge } from "./status-badge";

export const metadata = { title: "Paracaídas · Plegados" };

export default async function ParachutesPage(props: PageProps<"/admin/parachutes">) {
  await requireSupervisor("/admin/parachutes");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = PARACHUTE_STATUSES.includes(sp.status as ParachuteStatus)
    ? (sp.status as ParachuteStatus)
    : undefined;
  const retired = sp.retired === "1";
  const rows = await listParachutes(db, { q, status, retired });

  return (
    <>
      <PageHeader
        title="Paracaídas"
        actions={<ButtonLink href="/admin/parachutes/new">+ Nuevo paracaídas</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar número, modelo, serie, propietario…"
          aria-label="Buscar"
          className={`${inputBaseClass} w-full max-w-xs`}
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label="Estado"
          className={inputBaseClass}
        >
          <option value="">Todos los estados</option>
          {PARACHUTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="retired" value="1" defaultChecked={retired} />
          Ver dados de baja
        </label>
        <button type="submit" className={buttonClass.secondary}>
          Filtrar
        </button>
      </form>

      {rows.length === 0 ? (
        <Empty>
          {q || status || retired
            ? "Ningún paracaídas coincide con el filtro."
            : "Todavía no hay paracaídas."}
        </Empty>
      ) : (
        <Table
          head={[
            "Número",
            "Modelo",
            "Nº de serie",
            "Propietario",
            "Estado",
            "Plegados",
            "Último plegado",
          ]}
        >
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="py-2 pr-4 font-semibold">
                <Link href={`/admin/parachutes/${p.id}`} className="text-blue-600 hover:underline">
                  {p.number}
                </Link>
              </td>
              <td className="py-2 pr-4">{p.model ?? "—"}</td>
              <td className="py-2 pr-4">{p.serialNumber ?? "—"}</td>
              <td className="py-2 pr-4">{p.owner ?? "—"}</td>
              <td className="py-2 pr-4">
                {p.retired ? (
                  <Badge tone="gray">Dado de baja</Badge>
                ) : (
                  <StatusBadge status={p.status} />
                )}
              </td>
              <td className="py-2 pr-4 tabular-nums">{p.packCount}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {p.lastPackedAt ? formatDateTime(new Date(p.lastPackedAt)) : "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
