import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
import { getStation } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { getDaySummary, getStationData } from "@/lib/packs";
import { APP_TIMEZONE, dayKey } from "@/lib/time";
import { PackStation } from "./_station/pack-station";
import { TodayPanel } from "./_station/today-panel";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Registrar plegado</h1>
      <Suspense fallback={<p className="text-sm opacity-50">Cargando…</p>}>
        <Station />
      </Suspense>
    </div>
  );
}

async function Station() {
  const station = await getStation();
  if (!station) return <UnauthorizedDevice />;

  await connection(); // "today" depends on request time
  const [{ packers, parachutes }, summary] = await Promise.all([
    getStationData(db),
    getDaySummary(db, dayKey()),
  ]);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
      <div>
        <PackStation
          packers={packers}
          parachutes={parachutes}
          timeZone={APP_TIMEZONE}
          requirePin={REQUIRE_PACKER_PIN}
        />
        <p className="mt-6 text-xs opacity-50">Dispositivo: {station.name}</p>
      </div>
      <TodayPanel summary={summary} />
    </div>
  );
}

function UnauthorizedDevice() {
  return (
    <div className="max-w-md rounded-xl border border-black/10 p-6 dark:border-white/10">
      <h2 className="text-lg font-semibold">Dispositivo no autorizado</h2>
      <p className="mt-2 text-sm opacity-80">
        Para registrar plegados desde este dispositivo, un responsable tiene que autorizarlo una
        vez.
      </p>
      <Link
        href="/station/setup"
        className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white"
      >
        Autorizar este dispositivo
      </Link>
    </div>
  );
}
