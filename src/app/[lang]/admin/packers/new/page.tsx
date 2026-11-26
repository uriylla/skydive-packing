import { Suspense } from "react";
import { PageHeader, PageLoading } from "@/components/ui";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { ROLES } from "@/lib/people";
import { savePersonAction } from "../actions";
import { PersonForm } from "../person-form";

export const generateMetadata = pageTitle((d) => d.packers.newTitle);

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
  const { d } = await getI18n();
  return (
    <>
      <PageHeader
        title={d.packers.newTitle}
        back={{ href: "/admin/packers", label: d.packers.title }}
      />
      <PersonForm
        action={savePersonAction.bind(null, null)}
        initial={{ name: "", role: "packer", username: "" }}
        roles={ROLES.map((r) => [r, d.role[r]])}
        isEdit={false}
        hadLogin={false}
        cancelHref="/admin/packers"
        submitLabel={d.packers.create}
      />
    </>
  );
}
