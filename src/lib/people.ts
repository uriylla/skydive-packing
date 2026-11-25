import { and, asc, count, desc, eq, max, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { packs, users, userRole } from "@/db/schema";
import { hashSecret } from "./accounts";
import type { Db } from "./packs";
import type { FieldErrors } from "./parachutes";

export const ROLES = userRole.enumValues;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = { packer: "Plegador", supervisor: "Responsable" };

export const PIN_REGEX = /^\d{4,8}$/;
export const MIN_PASSWORD = 8;

const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,30}$/, "3–30 caracteres: letras, números, punto, guion.");

/**
 * Create / edit a person. Supervisors need a username, and a password when
 * created or promoted (an empty password on edit keeps the current one).
 */
export const PersonInput = z
  .object({
    name: z.string().trim().min(1, "Obligatorio.").max(60, "Máximo 60 caracteres."),
    role: z.enum(ROLES),
    username: z.string().trim(),
    password: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.role !== "supervisor") return;
    const u = username.safeParse(v.username);
    if (!u.success)
      ctx.addIssue({ code: "custom", path: ["username"], message: u.error.issues[0].message });
    if (v.password && v.password.length < MIN_PASSWORD) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: `Mínimo ${MIN_PASSWORD} caracteres.`,
      });
    }
  })
  .transform((v) => ({
    name: v.name,
    role: v.role,
    username: v.role === "supervisor" ? v.username.toLowerCase() : null,
    password: v.role === "supervisor" && v.password ? v.password : null,
  }));
export type PersonInput = z.output<typeof PersonInput>;
type PersonFields = { name: string; role: string; username: string; password: string };

export type PersonResult =
  | { ok: true; id: number }
  | { ok: false; errors: FieldErrors<PersonFields> };

async function usernameTaken(db: Db, name: string, exceptId?: number) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.username, name), exceptId ? ne(users.id, exceptId) : undefined));
  return Boolean(row);
}

async function activeSupervisorCount(db: Db, exceptId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(users)
    .where(and(eq(users.role, "supervisor"), eq(users.active, true), ne(users.id, exceptId)));
  return row.n;
}

export async function createPerson(db: Db, input: PersonInput): Promise<PersonResult> {
  if (input.role === "supervisor") {
    if (!input.password)
      return { ok: false, errors: { password: "Obligatoria para responsables." } };
    if (await usernameTaken(db, input.username!)) {
      return { ok: false, errors: { username: "Ese usuario ya existe." } };
    }
  }
  const [row] = await db
    .insert(users)
    .values({
      name: input.name,
      role: input.role,
      username: input.username,
      passwordHash: input.password ? await hashSecret(input.password) : null,
    })
    .returning({ id: users.id });
  return { ok: true, id: row.id };
}

/**
 * `actorId` is the supervisor making the change: nobody can demote themselves,
 * and there must always be at least one active supervisor left.
 */
export async function updatePerson(
  db: Db,
  id: number,
  input: PersonInput,
  actorId: number,
): Promise<PersonResult> {
  const current = await getPerson(db, id);
  if (!current) return { ok: false, errors: { name: "No encontrado." } };

  const demoting = current.role === "supervisor" && input.role !== "supervisor";
  if (demoting) {
    if (id === actorId)
      return { ok: false, errors: { role: "No puedes quitarte el rol de responsable." } };
    if (current.active && (await activeSupervisorCount(db, id)) === 0) {
      return { ok: false, errors: { role: "Tiene que quedar al menos un responsable activo." } };
    }
  }

  if (input.role === "supervisor") {
    if (await usernameTaken(db, input.username!, id)) {
      return { ok: false, errors: { username: "Ese usuario ya existe." } };
    }
    if (current.role !== "supervisor" && !input.password) {
      return { ok: false, errors: { password: "Obligatoria al dar el rol de responsable." } };
    }
  }

  await db
    .update(users)
    .set({
      name: input.name,
      role: input.role,
      username: input.username,
      // Demotion clears the login; a blank password on edit keeps the current one.
      ...(input.role !== "supervisor"
        ? { passwordHash: null }
        : input.password
          ? { passwordHash: await hashSecret(input.password) }
          : {}),
    })
    .where(eq(users.id, id));
  return { ok: true, id };
}

export type SetActiveResult = { ok: true } | { ok: false; error: string };

export async function setPersonActive(
  db: Db,
  id: number,
  active: boolean,
  actorId: number,
): Promise<SetActiveResult> {
  if (!active) {
    if (id === actorId) return { ok: false, error: "No puedes desactivarte a ti mismo." };
    const person = await getPerson(db, id);
    if (person?.role === "supervisor" && (await activeSupervisorCount(db, id)) === 0) {
      return { ok: false, error: "Tiene que quedar al menos un responsable activo." };
    }
  }
  await db.update(users).set({ active }).where(eq(users.id, id));
  return { ok: true };
}

/** Sets a PIN, or clears it when `pin` is null. */
export async function setPersonPin(db: Db, id: number, pin: string | null) {
  if (pin !== null && !PIN_REGEX.test(pin)) throw new Error("Invalid PIN");
  await db
    .update(users)
    .set({ pinHash: pin === null ? null : await hashSecret(pin) })
    .where(eq(users.id, id));
}

export async function getPerson(db: Db, id: number) {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      username: users.username,
      active: users.active,
      hasPin: sql<boolean>`${users.pinHash} is not null`,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id));
  return row ?? null;
}

export async function listPeople(db: Db, opts: { active?: boolean } = {}) {
  return db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      username: users.username,
      active: users.active,
      hasPin: sql<boolean>`${users.pinHash} is not null`,
      packCount: count(packs.id),
      lastPackedAt: max(packs.packedAt),
    })
    .from(users)
    .leftJoin(packs, and(eq(packs.packerId, users.id), eq(packs.voided, false)))
    .where(eq(users.active, opts.active ?? true))
    .groupBy(users.id)
    .orderBy(desc(users.active), asc(users.name));
}
