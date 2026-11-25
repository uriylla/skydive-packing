import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/db";
import { listStations } from "@/lib/accounts";
import { requireSupervisor } from "@/lib/auth";
import { APP_TIMEZONE } from "@/lib/time";
import { revokeStationAction } from "./actions";

export const metadata = { title: "Dispositivos · Plegados" };

const dateFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: APP_TIMEZONE,
  dateStyle: "short",
  timeStyle: "short",
});

export default function StationsPage() {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">Dispositivos</h1>
        <Link href="/station/setup" className="text-sm font-medium text-blue-600 hover:underline">
          + Autorizar este dispositivo
        </Link>
      </div>
      <p className="text-sm opacity-70">
        Dispositivos que pueden registrar plegados. Revoca uno si se pierde o deja de usarse.
      </p>
      <Suspense fallback={<p className="text-sm opacity-50">Cargando…</p>}>
        <StationList />
      </Suspense>
    </section>
  );
}

async function StationList() {
  await requireSupervisor("/admin/stations");
  const stations = await listStations(db);
  if (stations.length === 0) {
    return <p className="text-sm opacity-60">Todavía no hay dispositivos autorizados.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 opacity-70 dark:border-white/10">
          <tr>
            <th className="py-2 pr-4 font-medium">Nombre</th>
            <th className="py-2 pr-4 font-medium">Autorizado</th>
            <th className="py-2 pr-4 font-medium">Último uso</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/10">
          {stations.map((s) => (
            <tr key={s.id} className={s.revokedAt ? "opacity-50" : undefined}>
              <td className="py-2 pr-4 font-medium">{s.name}</td>
              <td className="py-2 pr-4">
                {dateFmt.format(s.createdAt)}
                {s.createdBy && <span className="opacity-70"> · {s.createdBy}</span>}
              </td>
              <td className="py-2 pr-4">{s.lastSeenAt ? dateFmt.format(s.lastSeenAt) : "—"}</td>
              <td className="py-2 text-right">
                {s.revokedAt ? (
                  <span>Revocado {dateFmt.format(s.revokedAt)}</span>
                ) : (
                  <form action={revokeStationAction}>
                    <input type="hidden" name="stationId" value={s.id} />
                    <button type="submit" className="text-red-600 hover:underline">
                      Revocar
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
