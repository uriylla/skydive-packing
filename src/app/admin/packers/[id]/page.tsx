import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PackHistory } from "@/components/pack-history";
import { Badge, ButtonLink, DetailList, PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { listPacks } from "@/lib/history";
import { parseId } from "@/lib/ids";
import { getPerson, ROLE_LABEL } from "@/lib/people";
import { formatDateTime } from "@/lib/time";
import { setPersonActiveAction, setPinAction } from "../actions";
import { ActiveToggle, PinForm } from "../person-controls";

export const metadata = { title: "Plegador · Plegados" };

/** Static shell; the session check and data load stream in (instant navigation). */
export default function PersonPage(props: PageProps<"/admin/packers/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PersonPageContent {...props} />
    </Suspense>
  );
}

async function PersonPageContent(props: PageProps<"/admin/packers/[id]">) {
  const id = parseId((await props.params).id);
  const actor = await requireSupervisor(`/admin/packers/${id}`);
  const [p, history] = await Promise.all([getPerson(db, id), listPacks(db, { packerId: id })]);
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
                p.role === "supervisor" && <Badge tone="blue">{ROLE_LABEL.supervisor}</Badge>
              ) : (
                <Badge tone="gray">Desactivado</Badge>
              )}
            </span>
          </>
        }
        back={{ href: "/admin/packers", label: "Plegadores" }}
        actions={
          <>
            <ButtonLink href={`/admin/packers/${id}/edit`} variant="secondary">
              Editar
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
          Desactivado: no aparece en la pantalla de plegado
          {p.role === "supervisor" && " ni puede entrar como responsable"}. Su historial se
          conserva.
        </p>
      )}

      <DetailList
        items={[
          ["Rol", ROLE_LABEL[p.role]],
          ...(p.role === "supervisor"
            ? ([["Usuario", p.username]] as [string, string | null][])
            : []),
          ["Plegados", history.total],
          ["Último plegado", lastPack ? formatDateTime(lastPack.packedAt) : null],
          ["Alta", formatDateTime(p.createdAt)],
        ]}
      />

      <section className="mt-8">
        <h2 className="text-lg font-semibold">PIN de plegado</h2>
        <p className="mt-1 mb-3 text-sm opacity-70">
          {REQUIRE_PACKER_PIN
            ? "El PIN es obligatorio para registrar plegados."
            : "Ahora mismo no se pide PIN al registrar plegados (REQUIRE_PACKER_PIN desactivado), pero puedes asignarlo por adelantado."}{" "}
          {p.hasPin ? "Tiene PIN asignado." : "No tiene PIN."}
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
