import { Suspense } from "react";
import { logoutAction } from "@/app/[lang]/login/actions";
import { getI18n } from "@/i18n/server";
import { getSupervisor } from "@/lib/auth";
import { LanguagePicker } from "./language-picker";
import { Link } from "./link";

export async function Nav() {
  const { d, locale } = await getI18n();
  const links = [
    { href: "/", label: d.nav.register },
    { href: "/admin/days", label: d.nav.days },
    { href: "/admin/history", label: d.nav.history },
    { href: "/admin/parachutes", label: d.nav.parachutes },
    { href: "/admin/packers", label: d.nav.packers },
    { href: "/admin/stations", label: d.nav.stations },
  ];
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
        <span className="mr-2 font-semibold">{d.nav.brand}</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm hover:underline">
            {l.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-4 text-sm">
          <Suspense>
            <SessionBadge />
          </Suspense>
          {/* Reads the URL, so it renders after the static shell. */}
          <Suspense fallback={<span className="text-xs uppercase opacity-60">{locale}</span>}>
            <LanguagePicker />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

async function SessionBadge() {
  const [{ d }, user] = await Promise.all([getI18n(), getSupervisor()]);
  if (!user) {
    return (
      <Link href="/login" className="opacity-70 hover:underline">
        {d.nav.login}
      </Link>
    );
  }
  return (
    <form action={logoutAction} className="flex items-center gap-2">
      <span className="opacity-70">{user.name}</span>
      <button type="submit" className="hover:underline">
        {d.nav.logout}
      </button>
    </form>
  );
}
