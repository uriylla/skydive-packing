import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Link } from "@/components/link";
import { PackTable } from "@/components/pack-table";
import { ButtonLink, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { getDay } from "@/lib/history";
import { formatDayKey } from "@/lib/time";

export const generateMetadata = pageTitle((d) => d.day.pageTitle);

export default function DayPage(props: PageProps<"/[lang]/admin/days/[date]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <DayContent {...props} />
    </Suspense>
  );
}

async function DayContent(props: PageProps<"/[lang]/admin/days/[date]">) {
  const { date } = await props.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  await requireSupervisor(`/admin/days/${date}`);
  const [day, { d, f }] = await Promise.all([getDay(db, date), getI18n()]);
  if (!day) notFound();

  return (
    <>
      <PageHeader
        title={f(d.day.title, { date: formatDayKey(date) })}
        back={{ href: "/admin/days", label: d.days.title }}
        actions={
          <ButtonLink href={`/admin/history?from=${date}&to=${date}`} variant="secondary">
            {d.day.filterInHistory}
          </ButtonLink>
        }
      />
      <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="text-lg">
          {d.day.total} <strong className="text-2xl">{day.total}</strong>{" "}
          <span className="text-base opacity-70">
            · {d.kind.tandem} <strong>{day.tandem}</strong> · {d.kind.normal}{" "}
            <strong>{day.normal}</strong>
          </span>
        </p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {day.byPacker.map((p) => (
            <li key={p.packerId}>
              <Link href={`/admin/packers/${p.packerId}`} className="hover:underline">
                {p.name}
              </Link>{" "}
              — <strong>{p.count}</strong>{" "}
              <span className="opacity-60">
                ({p.tandem} {d.kindShort.tandem} · {p.normal} {d.kindShort.normal})
              </span>
            </li>
          ))}
        </ul>
      </div>
      <PackTable rows={day.rows} showDate={false} emptyText={d.day.empty} />
    </>
  );
}
