import { and, asc, count, desc, eq, ilike, max, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { packs, parachutes, parachuteStatus } from "@/db/schema";
import { normalizeNumber, type Db } from "./packs";

export const PARACHUTE_STATUSES = parachuteStatus.enumValues;
export type ParachuteStatus = (typeof PARACHUTE_STATUSES)[number];

export const STATUS_LABEL: Record<ParachuteStatus, string> = {
  active: "Activo",
  maintenance: "En mantenimiento",
  out_of_service: "Fuera de servicio",
};

const optionalText = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen, `Máximo ${maxLen} caracteres.`)
    .transform((v) => (v === "" ? null : v));

export const ParachuteInput = z.object({
  number: z
    .string()
    .trim()
    .min(1, "Obligatorio.")
    .max(20, "Máximo 20 caracteres.")
    .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones."),
  model: optionalText(80),
  serialNumber: optionalText(80),
  owner: optionalText(80),
  status: z.enum(PARACHUTE_STATUSES),
  notes: optionalText(1000),
});
export type ParachuteInput = z.output<typeof ParachuteInput>;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
export type SaveResult<T> = { ok: true; id: number } | { ok: false; errors: FieldErrors<T> };

/** Another parachute already uses this number (or the same number with other leading zeros). */
async function numberTaken(db: Db, number: string, exceptId?: number) {
  const normalizedCol = sql`coalesce(nullif(ltrim(lower(${parachutes.number}), '0'), ''), '0')`;
  const [row] = await db
    .select({ number: parachutes.number })
    .from(parachutes)
    .where(
      and(
        sql`${normalizedCol} = ${normalizeNumber(number)}`,
        exceptId ? ne(parachutes.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return row?.number ?? null;
}

export async function createParachute(
  db: Db,
  input: ParachuteInput,
): Promise<SaveResult<ParachuteInput>> {
  const taken = await numberTaken(db, input.number);
  if (taken) return { ok: false, errors: { number: `Ya existe el paracaídas ${taken}.` } };
  const [row] = await db.insert(parachutes).values(input).returning({ id: parachutes.id });
  return { ok: true, id: row.id };
}

export async function updateParachute(
  db: Db,
  id: number,
  input: ParachuteInput,
): Promise<SaveResult<ParachuteInput>> {
  const taken = await numberTaken(db, input.number, id);
  if (taken) return { ok: false, errors: { number: `Ya existe el paracaídas ${taken}.` } };
  await db.update(parachutes).set(input).where(eq(parachutes.id, id));
  return { ok: true, id };
}

/** "Dar de baja" (and undo). History is kept. */
export async function setParachuteRetired(db: Db, id: number, retired: boolean) {
  await db.update(parachutes).set({ retired }).where(eq(parachutes.id, id));
}

export async function getParachute(db: Db, id: number) {
  const [row] = await db.select().from(parachutes).where(eq(parachutes.id, id));
  return row ?? null;
}

export type ParachuteFilter = {
  status?: ParachuteStatus;
  /** Include parachutes that have been "dados de baja". */
  retired?: boolean;
  q?: string;
};

export async function listParachutes(db: Db, filter: ParachuteFilter = {}) {
  const where: (SQL | undefined)[] = [eq(parachutes.retired, filter.retired ?? false)];
  if (filter.status) where.push(eq(parachutes.status, filter.status));
  const q = filter.q?.trim();
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(
      or(
        ilike(parachutes.number, like),
        ilike(parachutes.model, like),
        ilike(parachutes.serialNumber, like),
        ilike(parachutes.owner, like),
      ),
    );
  }

  return db
    .select({
      id: parachutes.id,
      number: parachutes.number,
      model: parachutes.model,
      serialNumber: parachutes.serialNumber,
      owner: parachutes.owner,
      status: parachutes.status,
      retired: parachutes.retired,
      packCount: count(packs.id),
      lastPackedAt: max(packs.packedAt),
    })
    .from(parachutes)
    .leftJoin(packs, and(eq(packs.parachuteId, parachutes.id), eq(packs.voided, false)))
    .where(and(...where))
    .groupBy(parachutes.id)
    .orderBy(asc(sql`length(${parachutes.number})`), asc(parachutes.number), desc(parachutes.id));
}
