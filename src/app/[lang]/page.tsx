import { connection } from "next/server";
import { Suspense } from "react";
import { Link } from "@/components/link";
import { PageLoading } from "@/components/ui";
import { db } from "@/db";
import { getI18n } from "@/i18n/server";
import { getStation } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { getDaySummary, getStationData } from "@/lib/packs";
import { APP_TIMEZONE, dayKey } from "@/lib/time";
import { PackStation } from "./_station/pack-station";
import { TodayPanel } from "./_station/today-panel";

export default async function Home() {
  const { d } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{d.station.title}</h1>
      <Suspense fallback={<PageLoading />}>
        <Station />
      </Suspense>
    </div>
  );
}

async function Station() {
  const station = await getStation();
  if (!station) return <UnauthorizedDevice />;

  await connection(); // "today" depends on request time
  const [{ packers, parachutes }, summary, { d, f }] = await Promise.all([
    getStationData(db),
    getDaySummary(db, dayKey()),
    getI18n(),
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
        <p className="mt-6 text-xs opacity-50">{f(d.station.device, { name: station.name })}</p>
      </div>
      <TodayPanel summary={summary} />
    </div>
  );
}

async function UnauthorizedDevice() {
  const { d } = await getI18n();
  return (
    <div className="max-w-md rounded-xl border border-black/10 p-6 dark:border-white/10">
      <h2 className="text-lg font-semibold">{d.station.unauthorizedTitle}</h2>
      <p className="mt-2 text-sm opacity-80">{d.station.unauthorizedText}</p>
      <Link
        href="/station/setup"
        className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white"
      >
        {d.station.authorize}
      </Link>
    </div>
  );
}
