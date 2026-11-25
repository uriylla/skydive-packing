import Link from "next/link";
import { Suspense } from "react";
import { logoutAction } from "@/app/login/actions";
import { getSupervisor } from "@/lib/auth";

const links = [
  { href: "/", label: "Registrar" },
  { href: "/admin/days", label: "Jornadas" },
  { href: "/admin/history", label: "Historial" },
  { href: "/admin/parachutes", label: "Paracaídas" },
  { href: "/admin/packers", label: "Plegadores" },
  { href: "/admin/stations", label: "Dispositivos" },
];

export function Nav() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <span className="mr-2 font-semibold">Plegados</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm hover:underline">
            {l.label}
          </Link>
        ))}
        <div className="ml-auto text-sm">
          <Suspense>
            <SessionBadge />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

async function SessionBadge() {
  const user = await getSupervisor();
  if (!user) {
    return (
      <Link href="/login" className="opacity-70 hover:underline">
        Entrar
      </Link>
    );
  }
  return (
    <form action={logoutAction} className="flex items-center gap-2">
      <span className="opacity-70">{user.name}</span>
      <button type="submit" className="hover:underline">
        Salir
      </button>
    </form>
  );
}
