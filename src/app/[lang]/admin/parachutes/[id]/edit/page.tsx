import { Suspense } from "react";
import { notFound } from "next/navigation";
import { KINDS } from "@/lib/kinds";
import { PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { parseId } from "@/lib/ids";
import { getParachute, PARACHUTE_STATUSES } from "@/lib/parachutes";
import { saveParachuteAction } from "../../actions";
import { ParachuteForm } from "../../parachute-form";

export const generateMetadata = pageTitle((d) => d.parachutes.title);

/** Static shell; the session check and data load stream in (instant navigation). */
export default function EditParachutePage(props: PageProps<"/[lang]/admin/parachutes/[id]/edit">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditParachutePageContent {...props} />
    </Suspense>
  );
}

async function EditParachutePageContent(props: PageProps<"/[lang]/admin/parachutes/[id]/edit">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/parachutes/${id}/edit`);
  const [p, { d, f }] = await Promise.all([getParachute(db, id), getI18n()]);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={f(d.parachutes.editTitle, { number: p.number })}
        back={{
          href: `/admin/parachutes/${id}`,
          label: f(d.parachutes.detailTitle, { number: p.number }),
        }}
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
        statuses={PARACHUTE_STATUSES.map((s) => [s, d.status[s]])}
        kinds={KINDS.map((k) => [k, d.kind[k]])}
        cancelHref={`/admin/parachutes/${id}`}
        submitLabel={d.common.saveChanges}
      />
    </>
  );
}
