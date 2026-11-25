import Link from "next/link";
import { Suspense } from "react";
import { Pagination, parsePage } from "@/components/pagination";
import { Empty, PageHeader, PageLoading, Table } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { listDays } from "@/lib/history";
import { formatDayKey, formatTime } from "@/lib/time";

export const metadata = { title: "Jornadas · Plegados" };

const PAGE_SIZE = 30;

export default function DaysPage(props: PageProps<"/admin/days">) {
  return (
    <>
      <PageHeader title="Jornadas" />
      <Suspense fallback={<PageLoading />}>
        <DaysList {...props} />
      </Suspense>
    </>
  );
}

async function DaysList(props: PageProps<"/admin/days">) {
  await requireSupervisor("/admin/days");
  const page = parsePage((await props.searchParams).page);
  const { rows, total } = await listDays(db, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  if (total === 0)
    return <Empty>Todavía no hay jornadas. Se crean solas con el primer plegado del día.</Empty>;

  return (
    <>
      <Table
        head={[
          "Jornada",
          "Plegados",
          "Tándem",
          "Normal",
          "Plegadores",
          "Paracaídas",
          "Primero",
          "Último",
        ]}
      >
        {rows.map((d) => (
          <tr key={d.date}>
            <td className="py-2 pr-4 font-semibold">
              <Link href={`/admin/days/${d.date}`} className="text-blue-600 hover:underline">
                {formatDayKey(d.date)}
              </Link>
            </td>
            <td className="py-2 pr-4 text-base font-semibold tabular-nums">{d.packs}</td>
            <td className="py-2 pr-4 tabular-nums">{d.tandem}</td>
            <td className="py-2 pr-4 tabular-nums">{d.normal}</td>
            <td className="py-2 pr-4 tabular-nums">{d.packers}</td>
            <td className="py-2 pr-4 tabular-nums">{d.parachutes}</td>
            <td className="py-2 pr-4 font-mono">{d.first ? formatTime(new Date(d.first)) : "—"}</td>
            <td className="py-2 pr-4 font-mono">{d.last ? formatTime(new Date(d.last)) : "—"}</td>
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
