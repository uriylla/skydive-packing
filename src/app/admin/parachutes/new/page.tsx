import { Suspense } from "react";
import { PageHeader, PageLoading } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { PARACHUTE_STATUSES, STATUS_LABEL } from "@/lib/parachutes";
import { saveParachuteAction } from "../actions";
import { ParachuteForm } from "../parachute-form";

export const metadata = { title: "Nuevo paracaídas · Plegados" };

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
  return (
    <>
      <PageHeader
        title="Nuevo paracaídas"
        back={{ href: "/admin/parachutes", label: "Paracaídas" }}
      />
      <ParachuteForm
        action={saveParachuteAction.bind(null, null)}
        initial={{
          number: "",
          model: "",
          serialNumber: "",
          owner: "",
          status: "active",
          notes: "",
        }}
        statuses={PARACHUTE_STATUSES.map((s) => [s, STATUS_LABEL[s]])}
        cancelHref="/admin/parachutes"
        submitLabel="Crear paracaídas"
      />
    </>
  );
}
