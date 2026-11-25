import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { operatingDays, packs, parachutes, users } from "@/db/schema";
import type { Db } from "./packs";

export type PackFilter = {
  parachuteId?: number;
  packerId?: number;
  /** Include voided packs (shown struck through). Default true. */
  includeVoided?: boolean;
};

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
};

function conditions(f: PackFilter): SQL | undefined {
  const where: (SQL | undefined)[] = [];
  if (f.parachuteId) where.push(eq(packs.parachuteId, f.parachuteId));
  if (f.packerId) where.push(eq(packs.packerId, f.packerId));
  if (f.includeVoided === false) where.push(eq(packs.voided, false));
  return and(...where);
}

/** Packs newest first, with the total (non-voided) count for the same filter. */
export async function listPacks(
  db: Db,
  filter: PackFilter,
  { limit = 50, offset = 0 } = {},
): Promise<{ rows: PackRow[]; total: number }> {
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
      })
      .from(packs)
      .innerJoin(operatingDays, eq(operatingDays.id, packs.dayId))
      .innerJoin(users, eq(users.id, packs.packerId))
      .innerJoin(parachutes, eq(parachutes.id, packs.parachuteId))
      .where(conditions(filter))
      .orderBy(desc(packs.packedAt), desc(packs.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(packs)
      .where(conditions({ ...filter, includeVoided: false })),
  ]);
  return { rows, total };
}
