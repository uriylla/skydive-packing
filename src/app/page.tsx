import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/db";
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
  // TODO(M3): requireStation() — only unlocked devices may see this screen.
  await connection(); // "today" depends on request time
  const [{ packers, parachutes }, summary] = await Promise.all([
    getStationData(db),
    getDaySummary(db, dayKey()),
  ]);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
      <PackStation packers={packers} parachutes={parachutes} timeZone={APP_TIMEZONE} />
      <TodayPanel summary={summary} />
    </div>
  );
}
