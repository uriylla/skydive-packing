import { Suspense } from "react";
import { Link } from "@/components/link";
import { Pagination, parsePage } from "@/components/pagination";
import { Empty, PageHeader, PageLoading, Table } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { listDays } from "@/lib/history";
import { formatDayKey, formatTime } from "@/lib/time";

export const generateMetadata = pageTitle((d) => d.days.title);

const PAGE_SIZE = 30;

export default async function DaysPage(props: PageProps<"/[lang]/admin/days">) {
  const { d } = await getI18n();
  return (
    <>
      <PageHeader title={d.days.title} />
      <Suspense fallback={<PageLoading />}>
        <DaysList {...props} />
      </Suspense>
    </>
  );
}

async function DaysList(props: PageProps<"/[lang]/admin/days">) {
  await requireSupervisor("/admin/days");
  const page = parsePage((await props.searchParams).page);
  const [{ rows, total }, { d }] = await Promise.all([
    listDays(db, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getI18n(),
  ]);
  if (total === 0) return <Empty>{d.days.empty}</Empty>;

  return (
    <>
      <Table
        head={[
          d.field.day,
          d.field.packs,
          d.kind.tandem,
          d.kind.normal,
          d.nav.packers,
          d.nav.parachutes,
          d.days.first,
          d.days.last,
        ]}
      >
        {rows.map((r) => (
          <tr key={r.date}>
            <td className="py-2 pr-4 font-semibold">
              <Link href={`/admin/days/${r.date}`} className="text-blue-600 hover:underline">
                {formatDayKey(r.date)}
              </Link>
            </td>
            <td className="py-2 pr-4 text-base font-semibold tabular-nums">{r.packs}</td>
            <td className="py-2 pr-4 tabular-nums">{r.tandem}</td>
            <td className="py-2 pr-4 tabular-nums">{r.normal}</td>
            <td className="py-2 pr-4 tabular-nums">{r.packers}</td>
            <td className="py-2 pr-4 tabular-nums">{r.parachutes}</td>
            <td className="py-2 pr-4 font-mono">{r.first ? formatTime(new Date(r.first)) : "—"}</td>
            <td className="py-2 pr-4 font-mono">{r.last ? formatTime(new Date(r.last)) : "—"}</td>
          </tr>
        ))}
      </Table>
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        basePath="/admin/days"
        params={{}}
      />
    </>
  );
}
