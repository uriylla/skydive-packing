import { connection } from "next/server";
import { Suspense } from "react";
import { inputBaseClass } from "@/components/form";
import { Link } from "@/components/link";
import { PackTable } from "@/components/pack-table";
import { Pagination, parsePage } from "@/components/pagination";
import { buttonClass, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { getFilterOptions, listPacks, PackFilterSchema, type PackFilter } from "@/lib/history";
import { KINDS } from "@/lib/kinds";
import { dayKey } from "@/lib/time";

export const generateMetadata = pageTitle((d) => d.history.pageTitle);

const PAGE_SIZE = 50;

export default async function HistoryPage(props: PageProps<"/[lang]/admin/history">) {
  const { d } = await getI18n();
  return (
    <>
      <PageHeader title={d.history.title} />
      <Suspense fallback={<PageLoading />}>
        <History {...props} />
      </Suspense>
    </>
  );
}

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function History(props: PageProps<"/[lang]/admin/history">) {
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
  const [{ rows, total, tandem, normal }, options, { d, p }] = await Promise.all([
    listPacks(db, filter, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getFilterOptions(db),
    getI18n(),
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
          <span className={label}>{d.history.from}</span>
          <input
            type="date"
            name="from"
            defaultValue={filter.from}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>{d.history.to}</span>
          <input
            type="date"
            name="to"
            defaultValue={filter.to}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>{d.history.timeFrom}</span>
          <input
            type="time"
            name="timeFrom"
            defaultValue={filter.timeFrom}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>{d.history.timeTo}</span>
          <input
            type="time"
            name="timeTo"
            defaultValue={filter.timeTo}
            className={`${inputBaseClass} w-full`}
          />
        </label>
        <label>
          <span className={label}>{d.field.packer}</span>
          <select
            name="packerId"
            defaultValue={filter.packerId ?? ""}
            className={`${inputBaseClass} w-full`}
          >
            <option value="">{d.common.all}</option>
            {options.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.active ? "" : d.common.deactivatedSuffix}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{d.field.parachute}</span>
          <select
            name="parachuteId"
            defaultValue={filter.external ? "external" : (filter.parachuteId ?? "")}
            className={`${inputBaseClass} w-full`}
          >
            <option value="">{d.common.all}</option>
            <option value="external">{d.history.externalOption}</option>
            {options.chutes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}
                {c.retired ? d.history.retiredSuffix : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>{d.field.kind}</span>
          <select
            name="kind"
            defaultValue={filter.kind ?? ""}
            className={`${inputBaseClass} w-full`}
          >
            <option value="">{d.common.all}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {d.kind[k]}
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
            {d.history.includeVoided}
          </label>
          <button type="submit" className={buttonClass.primary}>
            {d.common.filter}
          </button>
          <Link href={`/admin/history?from=${today}&to=${today}`} className={buttonClass.secondary}>
            {d.history.today}
          </Link>
          {filtered && (
            <Link href="/admin/history" className="text-sm opacity-70 hover:underline">
              {d.history.clear}
            </Link>
          )}
        </div>
      </form>

      <p className="mb-2 text-sm">
        <strong>{total}</strong> {p(d.history.count, total)}
        {total > 0 && (
          <span className="opacity-70">
            {" "}
            · {d.kind.tandem} {tandem} · {d.kind.normal} {normal}
          </span>
        )}
        {filter.includeVoided ? d.history.includingVoided : ""}
      </p>
      <PackTable rows={rows} emptyText={d.history.empty} />
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
