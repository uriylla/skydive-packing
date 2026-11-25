import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KindBadge, ParachuteCell } from "@/components/parachute-cell";
import { Badge, DetailList, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { getFilterOptions, getPack } from "@/lib/history";
import { parseId } from "@/lib/ids";
import { formatDateTime, formatDayKey, formatTime } from "@/lib/time";
import { correctPackAction, restorePackAction, voidPackAction } from "../actions";
import { CorrectForm, RestoreForm, VoidForm } from "../pack-actions";

export const metadata = { title: "Plegado · Plegados" };

export default function PackPage(props: PageProps<"/admin/packs/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PackContent {...props} />
    </Suspense>
  );
}

async function PackContent(props: PageProps<"/admin/packs/[id]">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/packs/${id}`);
  const [p, options] = await Promise.all([getPack(db, id), getFilterOptions(db)]);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={
          <>
            {formatTime(p.packedAt)} — {p.packerName} —{" "}
            {p.parachuteNumber ?? `Externo: ${p.externalLabel}`}{" "}
            <span className="align-middle">
              {p.voided ? (
                <Badge tone="gray">Anulado</Badge>
              ) : (
                p.correctionOfId && <Badge tone="blue">Corregido</Badge>
              )}
            </span>
          </>
        }
        back={{ href: `/admin/days/${p.date}`, label: `Jornada ${formatDayKey(p.date)}` }}
      />

      <DetailList
        items={[
          ["Fecha y hora", formatDateTime(p.packedAt)],
          [
            "Plegador",
            <Link key="p" href={`/admin/packers/${p.packerId}`} className="hover:underline">
              {p.packerName}
            </Link>,
          ],
          ["Paracaídas", <ParachuteCell key="c" {...p} />],
          ["Tipo", <KindBadge key="k" kind={p.kind} />],
          ...(p.voided
            ? ([
                [
                  "Anulado",
                  `${p.voidedAt ? formatDateTime(p.voidedAt) : ""}${p.voidedByName ? ` · ${p.voidedByName}` : ""}`,
                ],
                ["Motivo", p.voidedReason],
              ] as [string, string | null][])
            : []),
        ]}
      />

      {p.correctionOfId && (
        <p className="mt-4 text-sm">
          Corrige un{" "}
          <Link href={`/admin/packs/${p.correctionOfId}`} className="text-blue-600 hover:underline">
            registro anterior
          </Link>
          .
        </p>
      )}
      {p.correctedById && (
        <p className="mt-4 text-sm">
          Se corrigió con{" "}
          <Link href={`/admin/packs/${p.correctedById}`} className="text-blue-600 hover:underline">
            este registro
          </Link>
          .
        </p>
      )}

      {p.voided ? (
        !p.correctedById && (
          <section className="mt-8">
            <h2 className="mb-2 text-lg font-semibold">Deshacer</h2>
            <p className="mb-3 text-sm opacity-70">Vuelve a contar este plegado.</p>
            <RestoreForm action={restorePackAction.bind(null, id)} />
          </section>
        )
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-1 text-lg font-semibold">Corregir</h2>
            <p className="mb-3 text-sm opacity-70">
              Si el plegador, el paracaídas o el tipo no eran los correctos. Se mantiene la hora y
              queda constancia del registro original.
            </p>
            <CorrectForm
              action={correctPackAction.bind(null, id)}
              people={options.people.map((o) => [
                String(o.id),
                o.active ? o.name : `${o.name} (desactivado)`,
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
            <h2 className="mb-1 text-lg font-semibold">Anular</h2>
            <p className="mb-3 text-sm opacity-70">
              Si el plegado no debía registrarse (p. ej. duplicado). Deja de contar, pero sigue
              visible en el historial.
            </p>
            <VoidForm action={voidPackAction.bind(null, id)} />
          </section>
        </div>
      )}
    </>
  );
}
