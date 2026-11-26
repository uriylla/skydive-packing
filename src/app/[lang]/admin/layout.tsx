import { Suspense } from "react";
import { PageLoading } from "@/components/ui";
import { requireSupervisor } from "@/lib/auth";

export default function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorGate>{children}</SupervisorGate>
    </Suspense>
  );
}

async function SupervisorGate({ children }: { children: React.ReactNode }) {
  await requireSupervisor("/admin/days");
  return children;
}
