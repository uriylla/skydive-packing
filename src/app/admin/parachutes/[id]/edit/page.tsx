import { Suspense } from "react";
import { notFound } from "next/navigation";
import { KIND_LABEL, KINDS } from "@/lib/kinds";
import { PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { parseId } from "@/lib/ids";
import { getParachute, PARACHUTE_STATUSES, STATUS_LABEL } from "@/lib/parachutes";
import { saveParachuteAction } from "../../actions";
import { ParachuteForm } from "../../parachute-form";

export const metadata = { title: "Editar paracaídas · Plegados" };

/** Static shell; the session check and data load stream in (instant navigation). */
export default function EditParachutePage(props: PageProps<"/admin/parachutes/[id]/edit">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditParachutePageContent {...props} />
    </Suspense>
  );
}

async function EditParachutePageContent(props: PageProps<"/admin/parachutes/[id]/edit">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/parachutes/${id}/edit`);
  const p = await getParachute(db, id);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={`Editar paracaídas ${p.number}`}
        back={{ href: `/admin/parachutes/${id}`, label: `Paracaídas ${p.number}` }}
      />
      <ParachuteForm
        action={saveParachuteAction.bind(null, id)}
        initial={{
          number: p.number,
          kind: p.kind,
          model: p.model ?? "",
          serialNumber: p.serialNumber ?? "",
          owner: p.owner ?? "",
          status: p.status,
          notes: p.notes ?? "",
        }}
        statuses={PARACHUTE_STATUSES.map((s) => [s, STATUS_LABEL[s]])}
        kinds={KINDS.map((k) => [k, KIND_LABEL[k]])}
        cancelHref={`/admin/parachutes/${id}`}
        submitLabel="Guardar cambios"
      />
    </>
  );
}
