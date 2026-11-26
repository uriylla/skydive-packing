import { KindBadge } from "@/components/parachute-cell";
import { KINDS, type Kind } from "@/lib/kinds";
import { Suspense } from "react";
import { inputBaseClass } from "@/components/form";
import { Link } from "@/components/link";
import {
  Badge,
  ButtonLink,
  buttonClass,
  Empty,
  PageHeader,
  Table,
  PageLoading,
} from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import {
  listParachutes,
  PARACHUTE_STATUSES,
  type ParachuteStatus,
} from "@/lib/parachutes";
import { formatDateTime } from "@/lib/time";
import { StatusBadge } from "./status-badge";

export const generateMetadata = pageTitle((d) => d.parachutes.title);

/** Static shell; the session check and data load stream in (instant navigation). */
export default function ParachutesPage(props: PageProps<"/[lang]/admin/parachutes">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ParachutesPageContent {...props} />
    </Suspense>
  );
}

async function ParachutesPageContent(props: PageProps<"/[lang]/admin/parachutes">) {
  await requireSupervisor("/admin/parachutes");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = PARACHUTE_STATUSES.includes(sp.status as ParachuteStatus)
    ? (sp.status as ParachuteStatus)
    : undefined;
  const retired = sp.retired === "1";
  const kind = KINDS.includes(sp.kind as Kind) ? (sp.kind as Kind) : undefined;
  const [rows, { d }] = await Promise.all([
    listParachutes(db, { q, status, kind, retired }),
    getI18n(),
  ]);

  return (
    <>
      <PageHeader
        title={d.parachutes.title}
        actions={<ButtonLink href="/admin/parachutes/new">{d.parachutes.newButton}</ButtonLink>}
      />

      <form className="mb-4 flex flex-wrap items-end gap-3" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder={d.parachutes.searchPlaceholder}
          aria-label={d.parachutes.search}
          className={`${inputBaseClass} w-full max-w-xs`}
        />
        <select
          name="kind"
          defaultValue={kind ?? ""}
          aria-label={d.field.kind}
          className={inputBaseClass}
        >
          <option value="">{d.parachutes.allKinds}</option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {d.kind[k]}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          aria-label={d.field.status}
          className={inputBaseClass}
        >
          <option value="">{d.parachutes.allStatuses}</option>
          {PARACHUTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {d.status[s]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="retired" value="1" defaultChecked={retired} />
          {d.parachutes.showRetired}
        </label>
        <button type="submit" className={buttonClass.secondary}>
          {d.common.filter}
        </button>
      </form>

      {rows.length === 0 ? (
        <Empty>
          {q || status || kind || retired
            ? d.parachutes.noMatch
            : d.parachutes.empty}
        </Empty>
      ) : (
        <Table
          head={[
            d.field.number,
            d.field.kind,
            d.field.model,
            d.field.serialNumberShort,
            d.field.owner,
            d.field.status,
            d.field.packs,
            d.field.lastPack,
          ]}
        >
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="py-2 pr-4 font-semibold">
                <Link href={`/admin/parachutes/${p.id}`} className="text-blue-600 hover:underline">
                  {p.number}
                </Link>
              </td>
              <td className="py-2 pr-4">
                <KindBadge kind={p.kind} />
              </td>
              <td className="py-2 pr-4">{p.model ?? "—"}</td>
              <td className="py-2 pr-4">{p.serialNumber ?? "—"}</td>
              <td className="py-2 pr-4">{p.owner ?? "—"}</td>
              <td className="py-2 pr-4">
                {p.retired ? (
                  <Badge tone="gray">{d.common.retired}</Badge>
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
