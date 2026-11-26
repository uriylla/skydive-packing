import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PackHistory } from "@/components/pack-history";
import { Badge, ButtonLink, DetailList, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { listPacks } from "@/lib/history";
import { parseId } from "@/lib/ids";
import { getPerson } from "@/lib/people";
import { formatDateTime } from "@/lib/time";
import { setPersonActiveAction, setPinAction } from "../actions";
import { ActiveToggle, PinForm } from "../person-controls";

export const generateMetadata = pageTitle((d) => d.packers.pageTitle);

/** Static shell; the session check and data load stream in (instant navigation). */
export default function PersonPage(props: PageProps<"/[lang]/admin/packers/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PersonPageContent {...props} />
    </Suspense>
  );
}

async function PersonPageContent(props: PageProps<"/[lang]/admin/packers/[id]">) {
  const id = parseId((await props.params).id);
  const actor = await requireSupervisor(`/admin/packers/${id}`);
  const [p, history, { d }] = await Promise.all([
    getPerson(db, id),
    listPacks(db, { packerId: id }),
    getI18n(),
  ]);
  if (!p) notFound();
  const lastPack = history.rows.find((r) => !r.voided);
  const isSelf = actor.id === id;

  return (
    <>
      <PageHeader
        title={
          <>
            {p.name}{" "}
            <span className="align-middle">
              {p.active ? (
                p.role === "supervisor" && <Badge tone="blue">{d.role.supervisor}</Badge>
              ) : (
                <Badge tone="gray">{d.common.deactivated}</Badge>
              )}
            </span>
          </>
        }
        back={{ href: "/admin/packers", label: d.packers.title }}
        actions={
          <>
            <ButtonLink href={`/admin/packers/${id}/edit`} variant="secondary">
              {d.common.edit}
            </ButtonLink>
            {!isSelf && (
              <ActiveToggle
                active={p.active}
                action={setPersonActiveAction.bind(null, id, !p.active)}
              />
            )}
          </>
        }
      />
      {!p.active && (
        <p className="mb-4 text-sm opacity-70">
          {p.role === "supervisor"
            ? d.packers.deactivatedNoteSupervisor
            : d.packers.deactivatedNote}
        </p>
      )}

      <DetailList
        items={[
          [d.field.role, d.role[p.role]],
          ...(p.role === "supervisor"
            ? ([[d.field.username, p.username]] as [string, string | null][])
            : []),
          [d.field.packs, history.total],
          [d.field.lastPack, lastPack ? formatDateTime(lastPack.packedAt) : null],
          [d.field.createdAt, formatDateTime(p.createdAt)],
        ]}
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{d.packers.pinTitle}</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">
          {REQUIRE_PACKER_PIN ? d.packers.pinRequired : d.packers.pinOptional}{" "}
          {p.hasPin ? d.packers.hasPin : d.packers.noPin}
        </p>
        <PinForm hasPin={p.hasPin} action={setPinAction.bind(null, id)} />
      </section>

      <PackHistory
        rows={history.rows}
        total={history.total}
        show="parachute"
        historyHref={`/admin/history?packerId=${id}`}
      />
    </>
  );
}
