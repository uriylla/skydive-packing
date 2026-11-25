import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PackTable } from "@/components/pack-table";
import { ButtonLink, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { getDay } from "@/lib/history";
import { formatDayKey } from "@/lib/time";

export const metadata = { title: "Jornada · Plegados" };

export default function DayPage(props: PageProps<"/admin/days/[date]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <DayContent {...props} />
    </Suspense>
  );
}

async function DayContent(props: PageProps<"/admin/days/[date]">) {
  const { date } = await props.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  await requireSupervisor(`/admin/days/${date}`);
  const day = await getDay(db, date);
  if (!day) notFound();

  return (
    <>
      <PageHeader
        title={`Jornada — ${formatDayKey(date)}`}
        back={{ href: "/admin/days", label: "Jornadas" }}
        actions={
          <ButtonLink href={`/admin/history?from=${date}&to=${date}`} variant="secondary">
            Filtrar en el historial
          </ButtonLink>
        }
      />
      <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="text-lg">
          Total de plegados: <strong className="text-2xl">{day.total}</strong>
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {day.byPacker.map((p) => (
            <li key={p.packerId}>
              <Link href={`/admin/packers/${p.packerId}`} className="hover:underline">
                {p.name}
              </Link>{" "}
              — <strong>{p.count}</strong>
            </li>
          ))}
        </ul>
      </div>
      <PackTable rows={day.rows} showDate={false} emptyText="No hay plegados en esta jornada." />
    </>
  );
}
