import bcrypt from "bcryptjs";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { stations, users } from "@/db/schema";
import type { Db } from "./packs";

/** Hash compared against when the user doesn't exist, so timing doesn't leak usernames. */
const DUMMY_HASH = "$2b$10$wIriuN6p7gKfGd5x2/o9ueMHQC4yKtn0EdteODzoXmNFGTujmI6ye";

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

/** Checks supervisor credentials. Returns the user, or null. */
export async function verifySupervisorLogin(db: Db, username: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.trim().toLowerCase()));
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!ok || !user || !user.active || user.role !== "supervisor") return null;
  return { id: user.id, name: user.name };
}

/** Returns the user if they are still an active supervisor. */
export async function getActiveSupervisor(db: Db, userId: number) {
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.active, true), eq(users.role, "supervisor")));
  return user ?? null;
}

export type PinCheck =
  | { ok: true; packer: { id: number; name: string } }
  | { ok: false; error: "NOT_FOUND" | "INACTIVE" | "NO_PIN" | "WRONG_PIN" };

export async function verifyPackerPin(db: Db, packerId: number, pin: string): Promise<PinCheck> {
  const [user] = await db.select().from(users).where(eq(users.id, packerId));
  if (!user) return { ok: false, error: "NOT_FOUND" };
  if (!user.active) return { ok: false, error: "INACTIVE" };
  if (!user.pinHash) return { ok: false, error: "NO_PIN" };
  if (!(await bcrypt.compare(pin, user.pinHash))) return { ok: false, error: "WRONG_PIN" };
  return { ok: true, packer: { id: user.id, name: user.name } };
}

export async function createStation(db: Db, name: string, createdById: number) {
  const [row] = await db
    .insert(stations)
    .values({ name: name.trim(), createdById, lastSeenAt: new Date() })
    .returning();
  return row;
}

/** Returns the station if it exists and isn't revoked; refreshes last_seen_at at most hourly. */
export async function getActiveStation(db: Db, stationId: number, now = new Date()) {
  const [row] = await db
    .select({ id: stations.id, name: stations.name })
    .from(stations)
    .where(and(eq(stations.id, stationId), isNull(stations.revokedAt)));
  if (!row) return null;
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  await db
    .update(stations)
    .set({ lastSeenAt: now })
    .where(
      and(
        eq(stations.id, stationId),
        or(isNull(stations.lastSeenAt), lt(stations.lastSeenAt, hourAgo)),
      ),
    );
  return row;
}

export async function listStations(db: Db) {
  return db
    .select({
      id: stations.id,
      name: stations.name,
      createdAt: stations.createdAt,
      lastSeenAt: stations.lastSeenAt,
      revokedAt: stations.revokedAt,
      createdBy: users.name,
    })
    .from(stations)
    .leftJoin(users, eq(users.id, stations.createdById))
    .orderBy(stations.revokedAt, desc(stations.lastSeenAt));
}

export async function revokeStation(db: Db, stationId: number, now = new Date()) {
  await db
    .update(stations)
    .set({ revokedAt: now })
    .where(and(eq(stations.id, stationId), isNull(stations.revokedAt)));
}
