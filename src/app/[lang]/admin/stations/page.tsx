import { Suspense } from "react";
import { Link } from "@/components/link";
import { PageLoading } from "@/components/ui";
import { db } from "@/db";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { listStations } from "@/lib/accounts";
import { getStation, requireSupervisor } from "@/lib/auth";
import { APP_TIMEZONE } from "@/lib/time";
import { revokeStationAction } from "./actions";

export const generateMetadata = pageTitle((d) => d.stations.title);

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: APP_TIMEZONE,
  dateStyle: "short",
  timeStyle: "short",
});

export default async function StationsPage() {
  const { d } = await getI18n();
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{d.stations.title}</h1>
      <p className="text-sm opacity-70">{d.stations.intro}</p>
      <Suspense fallback={<PageLoading />}>
        <StationList />
      </Suspense>
    </section>
  );
}

async function StationList() {
  await requireSupervisor("/admin/stations");
  const [stations, current, { d, f }] = await Promise.all([
    listStations(db),
    getStation(),
    getI18n(),
  ]);
  return (
    <div className="space-y-4">
      {current ? (
        <p className="text-sm">
          {d.stations.currentBefore} <strong>{current.name}</strong>.{" "}
          <Link href="/station/setup" className="text-blue-600 hover:underline">
            {d.stations.rename}
          </Link>
        </p>
      ) : (
        <Link
          href="/station/setup"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {d.stations.authorize}
        </Link>
      )}
      {stations.length === 0 ? (
        <p className="text-sm opacity-60">{d.stations.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 opacity-70 dark:border-white/10">
              <tr>
                <th className="py-2 pr-4 font-medium">{d.field.name}</th>
                <th className="py-2 pr-4 font-medium">{d.stations.authorizedAt}</th>
                <th className="py-2 pr-4 font-medium">{d.stations.lastSeen}</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {stations.map((s) => (
                <tr key={s.id} className={s.revokedAt ? "opacity-50" : undefined}>
                  <td className="py-2 pr-4 font-medium">
                    {s.name}
                    {s.id === current?.id && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-100">
                        {d.stations.thisDevice}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {dateFmt.format(s.createdAt)}
                    {s.createdBy && <span className="opacity-70"> · {s.createdBy}</span>}
                  </td>
                  <td className="py-2 pr-4">{s.lastSeenAt ? dateFmt.format(s.lastSeenAt) : "—"}</td>
                  <td className="py-2 text-right">
                    {s.revokedAt ? (
                      <span>{f(d.stations.revokedAt, { date: dateFmt.format(s.revokedAt) })}</span>
                    ) : (
                      <form action={revokeStationAction}>
                        <input type="hidden" name="stationId" value={s.id} />
                        <button type="submit" className="text-red-600 hover:underline">
                          {d.stations.revoke}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
