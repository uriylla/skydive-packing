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
import { requireSupervisor } from "@/lib/auth";
import { listPacks } from "@/lib/history";
import { parseId } from "@/lib/ids";
import { getParachute } from "@/lib/parachutes";
import { formatDateTime } from "@/lib/time";
import { setParachuteRetiredAction } from "../actions";
import { StatusBadge } from "../status-badge";

export const metadata = { title: "Paracaídas · Plegados" };

/** Static shell; the session check and data load stream in (instant navigation). */
export default function ParachutePage(props: PageProps<"/admin/parachutes/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ParachutePageContent {...props} />
    </Suspense>
  );
}

async function ParachutePageContent(props: PageProps<"/admin/parachutes/[id]">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/parachutes/${id}`);
  const [p, history] = await Promise.all([
    getParachute(db, id),
    listPacks(db, { parachuteId: id }),
  ]);
  if (!p) notFound();
  const lastPack = history.rows.find((r) => !r.voided);

  return (
    <>
      <PageHeader
        title={
          <>
            Paracaídas {p.number}{" "}
            <span className="align-middle">
              {p.retired ? (
                <Badge tone="gray">Dado de baja</Badge>
              ) : (
                <StatusBadge status={p.status} />
              )}
            </span>
          </>
        }
        back={{ href: "/admin/parachutes", label: "Paracaídas" }}
        actions={
          <>
            <ButtonLink href={`/admin/parachutes/${id}/edit`} variant="secondary">
              Editar
            </ButtonLink>
            <form action={setParachuteRetiredAction.bind(null, id, !p.retired)}>
              <button
                type="submit"
                className={p.retired ? buttonClass.secondary : buttonClass.danger}
              >
                {p.retired ? "Reactivar" : "Dar de baja"}
              </button>
            </form>
          </>
        }
      />
      {p.retired && (
        <p className="mb-4 text-sm opacity-70">
          Dado de baja: no aparece en la pantalla de plegado y no se puede registrar. Su historial
          se conserva.
        </p>
      )}
      <DetailList
        items={[
          ["Modelo", p.model],
          ["Número de serie", p.serialNumber],
          ["Propietario", p.owner],
          ["Plegados", history.total],
          ["Último plegado", lastPack ? formatDateTime(lastPack.packedAt) : null],
          ["Alta", formatDateTime(p.createdAt)],
          ["Observaciones", p.notes],
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
