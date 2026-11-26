import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Link } from "@/components/link";
import { KindBadge, ParachuteCell } from "@/components/parachute-cell";
import { Badge, DetailList, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { getFilterOptions, getPack } from "@/lib/history";
import { parseId } from "@/lib/ids";
import { formatDateTime, formatDayKey, formatTime } from "@/lib/time";
import { correctPackAction, restorePackAction, voidPackAction } from "../actions";
import { CorrectForm, RestoreForm, VoidForm } from "../pack-actions";

export const generateMetadata = pageTitle((d) => d.pack.pageTitle);

export default function PackPage(props: PageProps<"/[lang]/admin/packs/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PackContent {...props} />
    </Suspense>
  );
}

async function PackContent(props: PageProps<"/[lang]/admin/packs/[id]">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/packs/${id}`);
  const [p, options, { d, f }] = await Promise.all([
    getPack(db, id),
    getFilterOptions(db),
    getI18n(),
  ]);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={
          <>
            {formatTime(p.packedAt)} — {p.packerName} —{" "}
            {p.parachuteNumber ?? f(d.common.externalWithLabel, { label: p.externalLabel ?? "" })}{" "}
            <span className="align-middle">
              {p.voided ? (
                <Badge tone="gray">{d.common.voided}</Badge>
              ) : (
                p.correctionOfId && <Badge tone="blue">{d.common.corrected}</Badge>
              )}
            </span>
          </>
        }
        back={{
          href: `/admin/days/${p.date}`,
          label: f(d.pack.backToDay, { date: formatDayKey(p.date) }),
        }}
      />

      <DetailList
        items={[
          [d.field.dateTime, formatDateTime(p.packedAt)],
          [
            d.field.packer,
            <Link key="p" href={`/admin/packers/${p.packerId}`} className="hover:underline">
              {p.packerName}
            </Link>,
          ],
          [d.field.parachute, <ParachuteCell key="c" {...p} />],
          [d.field.kind, <KindBadge key="k" kind={p.kind} />],
          ...(p.voided
            ? ([
                [
                  d.pack.voidedAt,
                  `${p.voidedAt ? formatDateTime(p.voidedAt) : ""}${p.voidedByName ? ` · ${p.voidedByName}` : ""}`,
                ],
                [d.field.reason, p.voidedReason],
              ] as [string, string | null][])
            : []),
        ]}
      />

      {p.correctionOfId && (
        <p className="mt-4 text-sm">
          {d.pack.correctsBefore}{" "}
          <Link href={`/admin/packs/${p.correctionOfId}`} className="text-blue-600 hover:underline">
            {d.pack.correctsLink}
          </Link>
          .
        </p>
      )}
      {p.correctedById && (
        <p className="mt-4 text-sm">
          {d.pack.correctedBefore}{" "}
          <Link href={`/admin/packs/${p.correctedById}`} className="text-blue-600 hover:underline">
            {d.pack.correctedLink}
          </Link>
          .
        </p>
      )}

      {p.voided ? (
        !p.correctedById && (
          <section className="mt-8">
            <h2 className="mb-2 text-lg font-semibold">{d.pack.undoTitle}</h2>
            <p className="mb-3 text-sm opacity-70">{d.pack.undoText}</p>
            <RestoreForm action={restorePackAction.bind(null, id)} />
          </section>
        )
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-1 text-lg font-semibold">{d.pack.correctTitle}</h2>
            <p className="mb-3 text-sm opacity-70">{d.pack.correctText}</p>
            <CorrectForm
              action={correctPackAction.bind(null, id)}
              people={options.people.map((o) => [
                String(o.id),
                o.active ? o.name : `${o.name}${d.common.deactivatedSuffix}`,
              ])}
              initial={{
                packerId: String(p.packerId),
                mode: p.parachuteId === null ? "external" : "registered",
                parachuteNumber: p.parachuteNumber ?? "",
                kind: p.kind,
                externalLabel: p.externalLabel ?? "",
              }}
            />
          </section>
          <section>
            <h2 className="mb-1 text-lg font-semibold">{d.pack.voidTitle}</h2>
            <p className="mb-3 text-sm opacity-70">{d.pack.voidText}</p>
            <VoidForm action={voidPackAction.bind(null, id)} />
          </section>
        </div>
      )}
    </>
  );
}
