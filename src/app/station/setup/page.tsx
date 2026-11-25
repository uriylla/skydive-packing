import { Suspense } from "react";
import { requireSupervisor } from "@/lib/auth";
import { UnlockForm } from "./unlock-form";

export const metadata = { title: "Autorizar dispositivo · Plegados" };

export default function StationSetupPage() {
  return (
    <section className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-semibold">Autorizar dispositivo</h1>
      <p className="mt-1 mb-6 text-sm opacity-70">
        Este navegador podrá registrar plegados durante 90 días, o hasta que se revoque desde
        «Dispositivos».
      </p>
      <Suspense fallback={<p className="text-sm opacity-50">Cargando…</p>}>
        <Gate />
      </Suspense>
    </section>
  );
}

async function Gate() {
  await requireSupervisor("/station/setup");
  return <UnlockForm />;
}
