import { Suspense } from "react";
import { requireSupervisor } from "@/lib/auth";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-sm opacity-50">Cargando…</p>}>
      <SupervisorGate>{children}</SupervisorGate>
    </Suspense>
  );
}

async function SupervisorGate({ children }: { children: React.ReactNode }) {
  await requireSupervisor("/admin/days");
  return children;
}
