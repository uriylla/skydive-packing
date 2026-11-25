import { Suspense } from "react";
import { PageHeader, PageLoading } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";
import { ROLE_LABEL, ROLES } from "@/lib/people";
import { savePersonAction } from "../actions";
import { PersonForm } from "../person-form";

export const metadata = { title: "Nueva persona · Plegados" };

/** Static shell; the session check streams in (instant navigation). */
export default function NewPersonPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewPersonPageContent />
    </Suspense>
  );
}

async function NewPersonPageContent() {
  await requireSupervisor("/admin/packers/new");
  return (
    <>
      <PageHeader title="Nueva persona" back={{ href: "/admin/packers", label: "Plegadores" }} />
      <PersonForm
        action={savePersonAction.bind(null, null)}
        initial={{ name: "", role: "packer", username: "" }}
        roles={ROLES.map((r) => [r, ROLE_LABEL[r]])}
        isEdit={false}
        hadLogin={false}
        cancelHref="/admin/packers"
        submitLabel="Crear"
      />
    </>
  );
}
