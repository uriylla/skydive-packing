import { Suspense } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Empty, PageHeader, Table, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { requireSupervisor } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { listPeople, ROLE_LABEL } from "@/lib/people";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Plegadores · Plegados" };

/** Static shell; the session check and data load stream in (instant navigation). */
export default function PackersPage(props: PageProps<"/admin/packers">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PackersPageContent {...props} />
    </Suspense>
  );
}

async function PackersPageContent(props: PageProps<"/admin/packers">) {
  await requireSupervisor("/admin/packers");
  const inactive = (await props.searchParams).inactive === "1";
  const people = await listPeople(db, { active: !inactive });

  return (
    <>
      <PageHeader
        title="Plegadores"
        actions={<ButtonLink href="/admin/packers/new">+ Nueva persona</ButtonLink>}
      >
        <p className="mt-1 text-sm opacity-70">
          Personas que registran plegados. Los responsables además gestionan la aplicación.
          {REQUIRE_PACKER_PIN && " El PIN es obligatorio para registrar plegados."}
        </p>
      </PageHeader>

      <nav className="mb-4 flex gap-4 text-sm">
        <Link
          href="/admin/packers"
          className={inactive ? "opacity-60 hover:underline" : "font-semibold"}
        >
          Activos
        </Link>
        <Link
          href="/admin/packers?inactive=1"
          className={inactive ? "font-semibold" : "opacity-60 hover:underline"}
        >
          Desactivados
        </Link>
      </nav>

      {people.length === 0 ? (
        <Empty>{inactive ? "No hay personas desactivadas." : "Todavía no hay plegadores."}</Empty>
      ) : (
        <Table head={["Nombre", "Rol", "PIN", "Plegados", "Último plegado"]}>
          {people.map((p) => (
            <tr key={p.id}>
              <td className="py-2 pr-4 font-semibold">
                <Link href={`/admin/packers/${p.id}`} className="text-blue-600 hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="py-2 pr-4">
                {p.role === "supervisor" ? (
                  <Badge tone="blue">
                    {ROLE_LABEL.supervisor} · {p.username}
                  </Badge>
                ) : (
                  ROLE_LABEL.packer
                )}
              </td>
              <td className="py-2 pr-4">{p.hasPin ? "Sí" : "—"}</td>
              <td className="py-2 pr-4 tabular-nums">{p.packCount}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {p.lastPackedAt ? formatDateTime(new Date(p.lastPackedAt)) : "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
