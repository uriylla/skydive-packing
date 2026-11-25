import Link from "next/link";
import { Suspense } from "react";
import { getStation, requireSupervisor } from "@/lib/auth";
import { UnlockForm } from "./unlock-form";

export const metadata = { title: "Autorizar dispositivo · Plegados" };

export default function StationSetupPage() {
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">Autorizar dispositivo</h1>
      <Suspense fallback={<p className="mt-4 text-sm opacity-50">Cargando…</p>}>
        <Gate />
      </Suspense>
    </section>
  );
}

async function Gate() {
  await requireSupervisor("/station/setup");
  const current = await getStation();

  if (current) {
    return (
      <>
        <p className="mt-1 mb-6 text-sm opacity-70">
          Este dispositivo ya está autorizado como <strong>{current.name}</strong>. Puedes{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            ir a registrar plegados
          </Link>{" "}
          o cambiarle el nombre.
        </p>
        <UnlockForm currentName={current.name} />
      </>
    );
  }

  return (
    <>
      <p className="mt-1 mb-6 text-sm opacity-70">
        Este navegador podrá registrar plegados durante 90 días, o hasta que se revoque desde
        «Dispositivos».
      </p>
      <UnlockForm />
    </>
  );
}
