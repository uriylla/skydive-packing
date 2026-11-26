import { Suspense } from "react";
import { Link } from "@/components/link";
import { Badge, ButtonLink, Empty, PageHeader, Table, PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { requireSupervisor } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { listPeople } from "@/lib/people";
import { formatDateTime } from "@/lib/time";

export const generateMetadata = pageTitle((d) => d.packers.title);

/** Static shell; the session check and data load stream in (instant navigation). */
export default function PackersPage(props: PageProps<"/[lang]/admin/packers">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PackersPageContent {...props} />
    </Suspense>
  );
}

async function PackersPageContent(props: PageProps<"/[lang]/admin/packers">) {
  await requireSupervisor("/admin/packers");
  const inactive = (await props.searchParams).inactive === "1";
  const [people, { d }] = await Promise.all([listPeople(db, { active: !inactive }), getI18n()]);

  return (
    <>
      <PageHeader
        title={d.packers.title}
        actions={<ButtonLink href="/admin/packers/new">{d.packers.newButton}</ButtonLink>}
      >
        <p className="mt-1 text-sm opacity-70">
          {d.packers.intro}
          {REQUIRE_PACKER_PIN && ` ${d.packers.pinRequired}`}
        </p>
      </PageHeader>

      <nav className="mb-4 flex gap-4 text-sm">
        <Link
          href="/admin/packers"
          className={inactive ? "opacity-60 hover:underline" : "font-semibold"}
        >
          {d.packers.active}
        </Link>
        <Link
          href="/admin/packers?inactive=1"
          className={inactive ? "font-semibold" : "opacity-60 hover:underline"}
        >
          {d.packers.inactive}
        </Link>
      </nav>

      {people.length === 0 ? (
        <Empty>{inactive ? d.packers.noInactive : d.packers.empty}</Empty>
      ) : (
        <Table
          head={[d.field.name, d.field.role, d.field.pin, d.field.packs, d.field.lastPack]}
        >
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
                    {d.role.supervisor} · {p.username}
                  </Badge>
                ) : (
                  d.role.packer
                )}
              </td>
              <td className="py-2 pr-4">{p.hasPin ? d.common.yes : "—"}</td>
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
