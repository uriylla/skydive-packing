import { Suspense } from "react";
import { Link } from "@/components/link";
import { PageLoading } from "@/components/ui";
import { pageTitle } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { getStation, requireSupervisor } from "@/lib/auth";
import { UnlockForm } from "./unlock-form";

export const generateMetadata = pageTitle((d) => d.setup.title);

export default async function StationSetupPage() {
  const { d } = await getI18n();
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">{d.setup.title}</h1>
      <Suspense fallback={<PageLoading className="mt-4 text-sm opacity-50" />}>
        <Gate />
      </Suspense>
    </section>
  );
}

async function Gate() {
  await requireSupervisor("/station/setup");
  const [current, { d }] = await Promise.all([getStation(), getI18n()]);

  if (current) {
    return (
      <>
        <p className="mt-1 mb-6 text-sm opacity-70">
          {d.setup.alreadyBefore} <strong>{current.name}</strong>
          {d.setup.alreadyMiddle}{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            {d.setup.goRegister}
          </Link>{" "}
          {d.setup.alreadyAfter}
        </p>
        <UnlockForm currentName={current.name} />
      </>
    );
  }

  return (
    <>
      <p className="mt-1 mb-6 text-sm opacity-70">{d.setup.intro}</p>
      <UnlockForm />
    </>
  );
}
