import { KindBadge } from "@/components/parachute-cell";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PackHistory } from "@/components/pack-history";
import {
  Badge,
  ButtonLink,
  buttonClass,
  DetailList,
  PageHeader,
  PageLoading,
} from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { listPacks } from "@/lib/history";
import { parseId } from "@/lib/ids";
import { getParachute } from "@/lib/parachutes";
import { formatDateTime } from "@/lib/time";
import { setParachuteRetiredAction } from "../actions";
import { StatusBadge } from "../status-badge";

export const generateMetadata = pageTitle((d) => d.parachutes.title);

/** Static shell; the session check and data load stream in (instant navigation). */
export default function ParachutePage(props: PageProps<"/[lang]/admin/parachutes/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ParachutePageContent {...props} />
    </Suspense>
  );
}

async function ParachutePageContent(props: PageProps<"/[lang]/admin/parachutes/[id]">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/parachutes/${id}`);
  const [p, history, { d, f }] = await Promise.all([
    getParachute(db, id),
    listPacks(db, { parachuteId: id }),
    getI18n(),
  ]);
  if (!p) notFound();
  const lastPack = history.rows.find((r) => !r.voided);

  return (
    <>
      <PageHeader
        title={
          <>
            {f(d.parachutes.detailTitle, { number: p.number })}{" "}
            <span className="align-middle">
              {p.retired ? (
                <Badge tone="gray">{d.common.retired}</Badge>
              ) : (
                <StatusBadge status={p.status} />
              )}
            </span>
          </>
        }
        back={{ href: "/admin/parachutes", label: d.parachutes.title }}
        actions={
          <>
            <ButtonLink href={`/admin/parachutes/${id}/edit`} variant="secondary">
              {d.common.edit}
            </ButtonLink>
            <form action={setParachuteRetiredAction.bind(null, id, !p.retired)}>
              <button
                type="submit"
                className={p.retired ? buttonClass.secondary : buttonClass.danger}
              >
                {p.retired ? d.common.reactivate : d.parachutes.retire}
              </button>
            </form>
          </>
        }
      />
      {p.retired && (
        <p className="mb-4 text-sm opacity-70">{d.parachutes.retiredNote}</p>
      )}
      <DetailList
        items={[
          [d.field.kind, <KindBadge key="k" kind={p.kind} />],
          [d.field.model, p.model],
          [d.field.serialNumber, p.serialNumber],
          [d.field.owner, p.owner],
          [d.field.packs, history.total],
          [d.field.lastPack, lastPack ? formatDateTime(lastPack.packedAt) : null],
          [d.field.createdAt, formatDateTime(p.createdAt)],
          [d.field.notes, p.notes],
        ]}
      />
      <PackHistory
        rows={history.rows}
        total={history.total}
        show="packer"
        historyHref={`/admin/history?parachuteId=${id}`}
      />
    </>
  );
}
