import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { inputBaseClass } from "@/components/form";
import { PackTable } from "@/components/pack-table";
import { Pagination, parsePage } from "@/components/pagination";
import { buttonClass, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { getFilterOptions, listPacks, PackFilterSchema, type PackFilter } from "@/lib/history";
import { KIND_LABEL, KINDS } from "@/lib/kinds";
import { dayKey } from "@/lib/time";

export const metadata = { title: "Historial · Plegados" };

const PAGE_SIZE = 50;

export default function HistoryPage(props: PageProps<"/admin/history">) {
  return (
    <>
      <PageHeader title="Historial de plegados" />
      <Suspense fallback={<PageLoading />}>
        <History {...props} />
      </Suspense>
    </>
  );
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function History(props: PageProps<"/admin/history">) {
  await requireSupervisor("/admin/history");
  await connection(); // "Hoy" depends on request time
  const sp = await props.searchParams;
  const raw = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, first(v) || undefined]));
  // The parachute select has an "Externos" option.
  if (raw.parachuteId === "external") {
    raw.parachuteId = undefined;
    raw.external = "1";
  }
  const filter: PackFilter = PackFilterSchema.parse(raw);
  const page = parsePage(first(sp.page));
  const [{ rows, total, tandem, normal }, options] = await Promise.all([
    listPacks(db, filter, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getFilterOptions(db),
  ]);

  const params = {
    from: filter.from,
    to: filter.to,
    timeFrom: filter.timeFrom,
    timeTo: filter.timeTo,
    packerId: filter.packerId?.toString(),
    parachuteId: filter.external ? "external" : filter.parachuteId?.toString(),
    kind: filter.kind,
    includeVoided: filter.includeVoided ? "1" : undefined,
  };
  const filtered = Object.values(params).some(Boolean);
  const today = dayKey();
  const label = "mb-1 block text-xs font-medium opacity-70";

  return (
    <>
      <form className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7" role="search">
        <label>
          <span className={label}>Desde</span>
          <input
            type="date"
            name="from"
            defaultValue={filter.from}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>Hasta</span>
          <input
            type="date"
            name="to"
            defaultValue={filter.to}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>Hora desde</span>
          <input
            type="time"
            name="timeFrom"
            defaultValue={filter.timeFrom}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>Hora hasta</span>
          <input
            type="time"
            name="timeTo"
            defaultValue={filter.timeTo}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>Plegador</span>
          <select
            name="packerId"
            defaultValue={filter.packerId ?? ""}
            className={`${inputBaseClass} w-full`}
          >
            <option value="">Todos</option>
            {options.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.active ? "" : " (desactivado)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Paracaídas</span>
          <select
            name="parachuteId"
            defaultValue={filter.external ? "external" : (filter.parachuteId ?? "")}
            className={`${inputBaseClass} w-full`}
          >
            <option value="">Todos</option>
            <option value="external">Externos (no registrados)</option>
            {options.chutes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}
                {c.retired ? " (baja)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Tipo</span>
          <select
            name="kind"
            defaultValue={filter.kind ?? ""}
            className={`${inputBaseClass} w-full`}
          >
            <option value="">Todos</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-full flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="includeVoided"
              value="1"
              defaultChecked={filter.includeVoided}
            />
            Incluir anulados
          </label>
          <button type="submit" className={buttonClass.primary}>
            Filtrar
          </button>
          <Link href={`/admin/history?from=${today}&to=${today}`} className={buttonClass.secondary}>
            Hoy
          </Link>
          {filtered && (
            <Link href="/admin/history" className="text-sm opacity-70 hover:underline">
              Quitar filtros
            </Link>
          )}
        </div>
      </form>

      <p className="mb-2 text-sm">
        <strong>{total}</strong> plegado{total === 1 ? "" : "s"}
        {total > 0 && (
          <span className="opacity-70">
            {" "}
            · Tándem {tandem} · Normal {normal}
          </span>
        )}
        {filter.includeVoided ? " (incluidos anulados)" : ""}
      </p>
      <PackTable rows={rows} emptyText="Ningún plegado coincide con el filtro." />
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        basePath="/admin/history"
        params={params}
      />
    </>
  );
}
