import { and, count, eq, gte, inArray, lt, min } from "drizzle-orm";
import { authFailures } from "@/db/schema";
import type { Db } from "./packs";

/** Failures allowed per key within the window, before the key is locked. */
export type Limit = { key: string; max: number };

export const WINDOW_MS = 15 * 60 * 1000;

export type LimitCheck = { locked: false } | { locked: true; retryAfterSeconds: number };

/** Is any of these keys over its limit? */
export async function checkLimits(db: Db, limits: Limit[], now = new Date()): Promise<LimitCheck> {
  const since = new Date(now.getTime() - WINDOW_MS);
  let retryAfter = 0;
  for (const { key, max } of limits) {
    const [row] = await db
      .select({ n: count(), oldest: min(authFailures.createdAt) })
      .from(authFailures)
      .where(and(eq(authFailures.key, key), gte(authFailures.createdAt, since)));
    if (row.n >= max && row.oldest) {
      // Unlocks once the oldest failure in the window expires.
      const until = new Date(row.oldest).getTime() + WINDOW_MS;
      retryAfter = Math.max(retryAfter, Math.ceil((until - now.getTime()) / 1000));
    }
  }
  return retryAfter > 0 ? { locked: true, retryAfterSeconds: retryAfter } : { locked: false };
}

export async function recordFailure(db: Db, keys: string[], now = new Date()) {
  if (keys.length === 0) return;
  await db.insert(authFailures).values(keys.map((key) => ({ key, createdAt: now })));
  // Opportunistic cleanup of old rows.
  await db
    .delete(authFailures)
    .where(lt(authFailures.createdAt, new Date(now.getTime() - 24 * 3600_000)));
}

export async function clearFailures(db: Db, keys: string[]) {
  if (keys.length === 0) return;
  await db.delete(authFailures).where(inArray(authFailures.key, keys));
}

export function lockedMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Demasiados intentos fallidos. Prueba de nuevo en ${minutes} minuto${minutes === 1 ? "" : "s"}.`;
}
