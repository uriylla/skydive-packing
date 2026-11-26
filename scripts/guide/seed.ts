/**
 * Wipes the guide database and fills it with a fixed, realistic dataset for
 * the user-guide screenshots. Never point this at a real database.
 */
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../../src/db/schema";
import { parachutes, users } from "../../src/db/schema";
import { correctPack, voidPack } from "../../src/lib/history";
import { registerPack } from "../../src/lib/packs";

export const GUIDE_ADMIN = { username: "admin", password: "guia-password-123" };

/** Small deterministic PRNG so every run produces the same screenshots. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export async function seedGuide(url: string, now = new Date()) {
  if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("The guide seed only runs on a local database");
  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema, casing: "snake_case" });
  const random = rng(42);
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)];
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.execute(
      sql`TRUNCATE packs, operating_days, parachutes, stations, users, auth_failures RESTART IDENTITY CASCADE`,
    );
    const [admin] = await db
      .insert(users)
      .values({
        name: "Sergio",
        role: "supervisor",
        username: GUIDE_ADMIN.username,
        passwordHash: await bcrypt.hash(GUIDE_ADMIN.password, 10),
        pinHash: await bcrypt.hash("1234", 10),
      })
      .returning();
    const packers = await db
      .insert(users)
      .values(
        ["Ana", "Carlos", "Juan", "Laura", "Marta", "Pau"].map((name) => ({
          name,
          pinHash: name === "Pau" ? null : bcrypt.hashSync("1234", 4),
        })),
      )
      .returning();
    await db.insert(users).values({ name: "Jordi", active: false });

    const rigs: (typeof parachutes.$inferInsert)[] = [
      { number: "012", kind: "tandem", model: "Sigma 340", serialNumber: "SG-34012", owner: "Saltamos" },
      { number: "014", kind: "tandem", model: "Sigma 370", serialNumber: "SG-37014", owner: "Saltamos" },
      { number: "018", kind: "tandem", model: "Strong Dual Hawk", serialNumber: "DH-1802", owner: "Saltamos" },
      { number: "021", kind: "normal", model: "Navigator 260", serialNumber: "NV-26021", owner: "Saltamos" },
      { number: "023", kind: "normal", model: "Navigator 260", serialNumber: "NV-26023", owner: "Saltamos" },
      { number: "025", kind: "normal", model: "Navigator 240", serialNumber: "NV-24025", owner: "Saltamos" },
      { number: "031", kind: "normal", model: "Sabre3 210", serialNumber: "S3-21031", owner: "Saltamos" },
      { number: "033", kind: "normal", model: "Pilot 188", serialNumber: "PL-18833", owner: "Saltamos" },
      { number: "041", kind: "normal", model: "Safire 3 209", serialNumber: "SF-20941", owner: "Saltamos",
        status: "maintenance", notes: "Cambiar slider" },
      { number: "045", kind: "normal", model: "Navigator 280", serialNumber: "NV-28045", owner: "Saltamos",
        status: "out_of_service", notes: "Pendiente de inspección del reserva" },
      { number: "050", kind: "normal", model: "Spectre 190", owner: "Club", retired: true },
    ];
    await db.insert(parachutes).values(rigs);
    const usable = rigs.filter((r) => !r.retired && (r.status ?? "active") === "active");

    const customers = ["Pedro – Javelin azul", "Laura – Mirage negro", "Club Lleida – Vector", "Marc – Icon rojo"];
    const register = async (at: Date, packerId: number) => {
      const external = random() < 0.08;
      // Tandems are a bit more frequent than their share of the fleet.
      const rig = random() < 0.4 ? pick(usable.filter((r) => r.kind === "tandem")) : pick(usable);
      const res = await registerPack(
        db,
        {
          clientId: randomUUID(),
          packerId,
          ...(external
            ? { external: { kind: "normal" as const, label: pick(customers) } }
            : { parachuteNumber: rig.number }),
          packedAt: at,
        },
        at,
      );
      if (!res.ok) throw new Error(JSON.stringify(res));
      return res.pack.id;
    };

    const ids: number[] = [];
    // Twelve past days, skipping a couple of quiet weekdays.
    for (let daysAgo = 12; daysAgo >= 1; daysAgo--) {
      if (daysAgo === 5 || daysAgo === 9) continue;
      const day = new Date(now.getTime() - daysAgo * 86_400_000);
      const crew = packers.filter(() => random() < 0.75);
      const count = 18 + Math.floor(random() * 40);
      for (let i = 0; i < count; i++) {
        const at = new Date(day);
        at.setUTCHours(7, 30, 0, 0); // 09:30 Madrid in summer, 08:30 in winter
        at.setTime(at.getTime() + Math.floor(random() * 9 * 3_600_000));
        ids.push(await register(at, pick(crew.length ? crew : packers).id));
      }
    }
    // Today: a morning's work, every ~15 minutes from 09:30 (or the last
    // few hours when it's still early), always ending before now.
    const morning = new Date(now);
    morning.setUTCHours(7, 30, 0, 0);
    const start = Math.min(morning.getTime(), now.getTime() - 4 * 3_600_000);
    for (let i = 0; i < 14; i++) {
      const at = new Date(start + i * 15 * 60_000 + Math.floor(random() * 5) * 60_000);
      if (at >= now) break;
      ids.push(await register(at, pick(packers.slice(0, 4)).id));
    }

    // A couple of corrections so the history shows what they look like.
    await voidPack(db, ids[ids.length - 30], "Registrado dos veces", admin.id);
    const carlos = packers.find((p) => p.name === "Carlos")!;
    await correctPack(db, ids[ids.length - 40], { packerId: carlos.id, parachuteNumber: "023", defaultReason: "Corregido" }, admin.id);
    await db.update(users).set({ active: true }).where(eq(users.id, admin.id));
  } finally {
    await client.end();
  }
}
