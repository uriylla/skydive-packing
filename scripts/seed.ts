/**
 * Seeds an initial supervisor plus sample packers and parachutes.
 * Safe to run more than once. Usage: pnpm db:seed [--no-sample] [--demo-packs]
 *
 * --demo-packs adds two weeks of random packs (for trying out jornadas and
 * history). Development only.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { parachutes, users } from "../src/db/schema";
import { registerPack } from "../src/lib/packs";

const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema, casing: "snake_case" });

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password === "change-me") {
    console.warn("⚠ SEED_ADMIN_PASSWORD is unset or default. Change it before deploying.");
  }

  await db
    .insert(users)
    .values({
      name: "Responsable",
      role: "supervisor",
      username,
      passwordHash: await bcrypt.hash(password ?? "change-me", 10),
    })
    .onConflictDoNothing({ target: users.username });
  console.log(`✓ supervisor "${username}"`);

  if (process.argv.includes("--no-sample")) return;

  const existing = await db.select({ id: users.id }).from(users);
  if (existing.length <= 1) {
    await db
      .insert(users)
      .values(["Carlos", "Ana", "Juan"].map((name) => ({ name, role: "packer" as const })));
  }
  console.log("✓ sample packers");

  const sampleChutes = [12, 18, 23, 25, 31, 41, 45].map((n) => ({
    number: String(n).padStart(3, "0"),
    // 012 and 018 are the tandems in the sample data.
    kind: n === 12 || n === 18 ? ("tandem" as const) : ("normal" as const),
    model: n === 12 || n === 18 ? "Sigma 340" : n % 2 ? "Navigator 260" : "Sabre3 210",
    owner: "Saltamos",
    status: n === 45 ? ("out_of_service" as const) : ("active" as const),
  }));
  await db.insert(parachutes).values(sampleChutes).onConflictDoNothing({
    target: parachutes.number,
  });
  console.log("✓ sample parachutes");

  if (process.argv.includes("--demo-packs")) await demoPacks();
}

const CUSTOMER_RIGS = [
  "Pedro – Javelin azul",
  "Laura – Mirage negro",
  "Club Lleida – Vector",
  "Marc – Icon rojo",
];

async function demoPacks() {
  if (process.env.NODE_ENV === "production")
    throw new Error("--demo-packs is for development only");
  const packers = await db.select().from(users).where(eq(users.active, true));
  const chutes = await db
    .select()
    .from(parachutes)
    .where(and(eq(parachutes.retired, false), eq(parachutes.status, "active")));
  if (!packers.length || !chutes.length) return;
  const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const now = Date.now();
  let n = 0;
  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const day = new Date(now - daysAgo * 86_400_000);
    const count = 20 + Math.floor(Math.random() * 60);
    for (let i = 0; i < count; i++) {
      // Between 07:00 and 17:00 UTC (09:00–19:00 Madrid in summer).
      const at = new Date(day);
      at.setUTCHours(7, 0, 0, 0);
      at.setTime(at.getTime() + Math.floor(Math.random() * 10 * 3_600_000));
      // About 1 in 10 packs is a customer's own rig that isn't in the system.
      const external = Math.random() < 0.1;
      const res = await registerPack(
        db,
        {
          clientId: randomUUID(),
          packerId: pick(packers).id,
          ...(external
            ? { external: { kind: "normal" as const, label: pick(CUSTOMER_RIGS) } }
            : { parachuteNumber: pick(chutes).number }),
          packedAt: at,
        },
        at,
      );
      if (res.ok) n++;
    }
  }
  console.log(`✓ ${n} demo packs over 14 days`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
