import Link from "next/link";

const links = [
  { href: "/", label: "Registrar" },
  { href: "/admin/days", label: "Jornadas" },
  { href: "/admin/history", label: "Historial" },
  { href: "/admin/parachutes", label: "Paracaídas" },
  { href: "/admin/packers", label: "Plegadores" },
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
      </nav>
    </header>
  );
}
