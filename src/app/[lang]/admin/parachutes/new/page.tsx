import { Suspense } from "react";
import { KINDS } from "@/lib/kinds";
import { PageHeader, PageLoading } from "@/components/ui";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { PARACHUTE_STATUSES } from "@/lib/parachutes";
import { saveParachuteAction } from "../actions";
import { ParachuteForm } from "../parachute-form";

export const generateMetadata = pageTitle((d) => d.parachutes.newTitle);

/** Static shell; the session check streams in (instant navigation). */
export default function NewParachutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewParachutePageContent />
    </Suspense>
  );
}

async function NewParachutePageContent() {
  await requireSupervisor("/admin/parachutes/new");
  const { d } = await getI18n();
  return (
    <>
      <PageHeader
        title={d.parachutes.newTitle}
        back={{ href: "/admin/parachutes", label: d.parachutes.title }}
      />
      <ParachuteForm
        action={saveParachuteAction.bind(null, null)}
        initial={{
          number: "",
          kind: "",
          model: "",
          serialNumber: "",
          owner: "",
          status: "active",
          notes: "",
        }}
        statuses={PARACHUTE_STATUSES.map((s) => [s, d.status[s]])}
        kinds={[["", d.parachutes.choose], ...KINDS.map((k): [string, string] => [k, d.kind[k]])]}
        cancelHref="/admin/parachutes"
        submitLabel={d.parachutes.create}
      />
    </>
  );
}
