import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  lte,
  max,
  min,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { operatingDays, packs, parachutes, users } from "@/db/schema";
import { findParachute, type Db } from "./packs";
import { APP_TIMEZONE } from "./time";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** History filters, as they come from the URL. Invalid values are dropped. */
export const PackFilterSchema = z.object({
  /** Jornada date range (YYYY-MM-DD), inclusive. */
  from: z.string().regex(DATE).optional().catch(undefined),
  to: z.string().regex(DATE).optional().catch(undefined),
  /** Time of day range (HH:MM, app time zone), inclusive. */
  timeFrom: z.string().regex(TIME).optional().catch(undefined),
  timeTo: z.string().regex(TIME).optional().catch(undefined),
  packerId: z.coerce.number().int().positive().optional().catch(undefined),
  parachuteId: z.coerce.number().int().positive().optional().catch(undefined),
  /** Include voided packs (shown struck through). */
  includeVoided: z
    .union([z.boolean(), z.literal("1").transform(() => true)])
    .optional()
    .catch(undefined),
});
export type PackFilter = z.output<typeof PackFilterSchema>;

export type PackRow = {
  id: number;
  packedAt: Date;
  date: string;
  packerId: number;
  packerName: string;
  parachuteId: number;
  parachuteNumber: string;
  voided: boolean;
  voidedReason: string | null;
  correctionOfId: number | null;
};

/** Time of day of the pack in the app time zone. */
const localTime = sql`(${packs.packedAt} at time zone ${APP_TIMEZONE})::time`;

function conditions(f: PackFilter): SQL | undefined {
  const where: (SQL | undefined)[] = [];
  if (f.parachuteId) where.push(eq(packs.parachuteId, f.parachuteId));
  if (f.packerId) where.push(eq(packs.packerId, f.packerId));
  if (f.from) where.push(gte(operatingDays.date, f.from));
  if (f.to) where.push(lte(operatingDays.date, f.to));
  if (f.timeFrom) where.push(sql`${localTime} >= ${f.timeFrom}::time`);
  // Inclusive of the whole "to" minute.
  if (f.timeTo) where.push(sql`${localTime} < ${f.timeTo}::time + interval '1 minute'`);
  if (!f.includeVoided) where.push(eq(packs.voided, false));
  return and(...where);
}

/** Packs newest first, plus the count for the same filter. */
export async function listPacks(
  db: Db,
  filter: PackFilter,
  { limit = 50, offset = 0 } = {},
): Promise<{ rows: PackRow[]; total: number }> {
  const where = conditions(filter);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: packs.id,
        packedAt: packs.packedAt,
        date: operatingDays.date,
        packerId: users.id,
        packerName: users.name,
        parachuteId: parachutes.id,
        parachuteNumber: parachutes.number,
        voided: packs.voided,
        voidedReason: packs.voidedReason,
        correctionOfId: packs.correctionOfId,
      })
      .from(packs)
      .innerJoin(operatingDays, eq(operatingDays.id, packs.dayId))
      .innerJoin(users, eq(users.id, packs.packerId))
      .innerJoin(parachutes, eq(parachutes.id, packs.parachuteId))
      .where(where)
      .orderBy(desc(packs.packedAt), desc(packs.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(packs)
      .innerJoin(operatingDays, eq(operatingDays.id, packs.dayId))
      .where(where),
  ]);
  return { rows, total };
}

/** Jornadas, newest first, with totals (voided packs excluded). */
export async function listDays(db: Db, { limit = 30, offset = 0 } = {}) {
  const live = and(eq(packs.dayId, operatingDays.id), eq(packs.voided, false));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        date: operatingDays.date,
        packs: count(packs.id),
        packers: countDistinct(packs.packerId),
        parachutes: countDistinct(packs.parachuteId),
        first: min(packs.packedAt),
        last: max(packs.packedAt),
      })
      .from(operatingDays)
      .leftJoin(packs, live)
      .groupBy(operatingDays.id)
      .orderBy(desc(operatingDays.date))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(operatingDays),
  ]);
  return { rows, total };
}

/** Everything about one jornada: all packs (incl. voided) and per-packer counts. */
export async function getDay(db: Db, date: string) {
  const [day] = await db.select().from(operatingDays).where(eq(operatingDays.date, date));
  if (!day) return null;
  const [all, byPacker] = await Promise.all([
    listPacks(db, { from: date, to: date, includeVoided: true }, { limit: 2000 }),
    db
      .select({ packerId: users.id, name: users.name, count: count() })
      .from(packs)
      .innerJoin(users, eq(users.id, packs.packerId))
      .where(and(eq(packs.dayId, day.id), eq(packs.voided, false)))
      .groupBy(users.id, users.name)
      .orderBy(desc(count()), asc(users.name)),
  ]);
  return {
    day,
    rows: all.rows,
    total: byPacker.reduce((n, p) => n + p.count, 0),
    byPacker,
  };
}

export async function getPack(db: Db, id: number) {
  const [row] = await db
    .select({
      id: packs.id,
      packedAt: packs.packedAt,
      date: operatingDays.date,
      packerId: users.id,
      packerName: users.name,
      parachuteId: parachutes.id,
      parachuteNumber: parachutes.number,
      voided: packs.voided,
      voidedReason: packs.voidedReason,
      voidedAt: packs.voidedAt,
      voidedById: packs.voidedById,
      correctionOfId: packs.correctionOfId,
      createdAt: packs.createdAt,
    })
    .from(packs)
    .innerJoin(operatingDays, eq(operatingDays.id, packs.dayId))
    .innerJoin(users, eq(users.id, packs.packerId))
    .innerJoin(parachutes, eq(parachutes.id, packs.parachuteId))
    .where(eq(packs.id, id));
  if (!row) return null;
  const [voidedBy, correctedBy] = await Promise.all([
    row.voidedById
      ? db.select({ name: users.name }).from(users).where(eq(users.id, row.voidedById))
      : Promise.resolve([]),
    db.select({ id: packs.id }).from(packs).where(eq(packs.correctionOfId, id)),
  ]);
  return {
    ...row,
    voidedByName: voidedBy[0]?.name ?? null,
    correctedById: correctedBy[0]?.id ?? null,
  };
}

export type CorrectionResult = { ok: true; id: number } | { ok: false; error: string };

/** "Anular": the pack stays in the history, struck through, with the reason. */
export async function voidPack(
  db: Db,
  id: number,
  reason: string,
  actorId: number,
  now = new Date(),
): Promise<CorrectionResult> {
  const text = reason.trim();
  if (!text) return { ok: false, error: "Indica el motivo." };
  const res = await db
    .update(packs)
    .set({ voided: true, voidedReason: text.slice(0, 200), voidedById: actorId, voidedAt: now })
    .where(and(eq(packs.id, id), eq(packs.voided, false)))
    .returning({ id: packs.id });
  if (res.length === 0) return { ok: false, error: "El plegado ya estaba anulado o no existe." };
  return { ok: true, id };
}

/** Undo a void. Not allowed for packs replaced by a correction (restore the correction instead). */
export async function restorePack(db: Db, id: number): Promise<CorrectionResult> {
  const [replacement] = await db
    .select({ id: packs.id })
    .from(packs)
    .where(and(eq(packs.correctionOfId, id), eq(packs.voided, false)));
  if (replacement) {
    return { ok: false, error: "Este plegado se corrigió con otro registro; anula ese primero." };
  }
  await db
    .update(packs)
    .set({ voided: false, voidedReason: null, voidedById: null, voidedAt: null })
    .where(eq(packs.id, id));
  return { ok: true, id };
}

/**
 * "Corregir": voids the pack and records a corrected copy (same time, jornada
 * and device) with another packer and/or parachute.
 */
export async function correctPack(
  db: Db,
  id: number,
  change: { packerId: number; parachuteNumber: string; reason?: string },
  actorId: number,
  now = new Date(),
): Promise<CorrectionResult> {
  const [original] = await db.select().from(packs).where(eq(packs.id, id));
  if (!original) return { ok: false, error: "El plegado no existe." };
  if (original.voided) return { ok: false, error: "No se puede corregir un plegado anulado." };

  const [packer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, change.packerId));
  if (!packer) return { ok: false, error: "Plegador no encontrado." };
  // Historical corrections may name a since-retired parachute, so no status check here.
  const { match: chute, ambiguous } = await findParachute(db, change.parachuteNumber);
  if (ambiguous)
    return { ok: false, error: "Hay varios paracaídas con ese número; escríbelo completo." };
  if (!chute) return { ok: false, error: `No existe el paracaídas "${change.parachuteNumber}".` };
  if (chute.id === original.parachuteId && packer.id === original.packerId) {
    return { ok: false, error: "No has cambiado nada." };
  }

  const reason = change.reason?.trim() || "Corregido";
  return db.transaction(async (tx) => {
    await tx
      .update(packs)
      .set({ voided: true, voidedReason: reason.slice(0, 200), voidedById: actorId, voidedAt: now })
      .where(eq(packs.id, id));
    const [created] = await tx
      .insert(packs)
      .values({
        clientId: randomUUID(),
        packerId: packer.id,
        parachuteId: chute.id,
        dayId: original.dayId,
        stationId: original.stationId,
        packedAt: original.packedAt,
        correctionOfId: id,
      })
      .returning({ id: packs.id });
    return { ok: true as const, id: created.id };
  });
}

/** Options for the history filter selects (including inactive/retired ones). */
export async function getFilterOptions(db: Db) {
  const [people, chutes] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, active: users.active })
      .from(users)
      .orderBy(desc(users.active), asc(users.name)),
    db
      .select({ id: parachutes.id, number: parachutes.number, retired: parachutes.retired })
      .from(parachutes)
      .orderBy(asc(sql`length(${parachutes.number})`), asc(parachutes.number)),
  ]);
  return { people, chutes };
}
