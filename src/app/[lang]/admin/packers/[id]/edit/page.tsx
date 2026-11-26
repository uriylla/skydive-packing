import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { parseId } from "@/lib/ids";
import { getPerson, ROLES } from "@/lib/people";
import { savePersonAction } from "../../actions";
import { PersonForm } from "../../person-form";

export const generateMetadata = pageTitle((d) => d.packers.editPageTitle);

/** Static shell; the session check and data load stream in (instant navigation). */
export default function EditPersonPage(props: PageProps<"/[lang]/admin/packers/[id]/edit">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <EditPersonPageContent {...props} />
    </Suspense>
  );
}

async function EditPersonPageContent(props: PageProps<"/[lang]/admin/packers/[id]/edit">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/packers/${id}/edit`);
  const [p, { d, f }] = await Promise.all([getPerson(db, id), getI18n()]);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={f(d.packers.editTitle, { name: p.name })}
        back={{ href: `/admin/packers/${id}`, label: p.name }}
      />
      <PersonForm
        action={savePersonAction.bind(null, id)}
        initial={{ name: p.name, role: p.role, username: p.username ?? "" }}
        roles={ROLES.map((r) => [r, d.role[r]])}
        isEdit
        hadLogin={p.role === "supervisor"}
        cancelHref={`/admin/packers/${id}`}
        submitLabel={d.common.saveChanges}
      />
    </>
  );
}
