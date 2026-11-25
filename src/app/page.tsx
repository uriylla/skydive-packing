import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

// Placeholder for the register-pack screen (milestone 2).
// For now it lists active packers to prove the DB connection works.
export default function Home() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">Registrar plegado</h1>
      <p className="mt-1 text-sm opacity-70">Pantalla pendiente (M2). Plegadores activos:</p>
      <Suspense fallback={<p className="mt-4 text-sm opacity-50">Cargando…</p>}>
        <ActivePackers />
      </Suspense>
    </section>
  );
}

async function ActivePackers() {
  const packers = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.active, true))
    .orderBy(asc(schema.users.name));

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {packers.map((p) => (
        <li
          key={p.id}
          className="rounded-lg border border-black/10 p-4 text-center text-lg dark:border-white/10"
        >
          {p.name}
        </li>
      ))}
    </ul>
  );
}
