import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { parseId } from "@/lib/ids";
import { getPerson, ROLE_LABEL, ROLES } from "@/lib/people";
import { savePersonAction } from "../../actions";
import { PersonForm } from "../../person-form";

export const metadata = { title: "Editar persona · Plegados" };

export default async function EditPersonPage(props: PageProps<"/admin/packers/[id]/edit">) {
  const id = parseId((await props.params).id);
  await requireSupervisor(`/admin/packers/${id}/edit`);
  const p = await getPerson(db, id);
  if (!p) notFound();

  return (
    <>
      <PageHeader
        title={`Editar ${p.name}`}
        back={{ href: `/admin/packers/${id}`, label: p.name }}
      />
      <PersonForm
        action={savePersonAction.bind(null, id)}
        initial={{ name: p.name, role: p.role, username: p.username ?? "" }}
        roles={ROLES.map((r) => [r, ROLE_LABEL[r]])}
        isEdit
        hadLogin={p.role === "supervisor"}
        cancelHref={`/admin/packers/${id}`}
        submitLabel="Guardar cambios"
      />
    </>
  );
}
