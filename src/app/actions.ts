"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { verifyPackerPin } from "@/lib/accounts";
import { getStation } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { registerPack, type RegisterPackResult } from "@/lib/packs";
import { signToken, verifyToken } from "@/lib/tokens";

const RegisterPackSchema = z.object({
  clientId: z.uuid(),
  packerId: z.number().int().positive(),
  parachuteNumber: z.string().trim().min(1).max(20),
  packedAt: z.iso.datetime().optional(),
  /** Issued by selectPackerAction when PINs are required. */
  packerToken: z.string().max(1000).optional(),
});

export type RegisterPackActionInput = z.input<typeof RegisterPackSchema>;

export type RegisterPackActionResult =
  | RegisterPackResult
  | {
      ok: false;
      error: "INVALID_INPUT" | "STATION_UNAUTHORIZED" | "PACKER_PIN_REQUIRED";
      message: string;
    };

const UNAUTHORIZED_MESSAGE =
  "Este dispositivo no está autorizado. Pide a un responsable que lo autorice.";

export async function registerPackAction(
  input: RegisterPackActionInput,
): Promise<RegisterPackActionResult> {
  const station = await getStation();
  if (!station) {
    return { ok: false, error: "STATION_UNAUTHORIZED", message: UNAUTHORIZED_MESSAGE };
  }

  const parsed = RegisterPackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT", message: "Datos no válidos." };
  }
  const { packedAt, packerToken, ...rest } = parsed.data;

  if (REQUIRE_PACKER_PIN) {
    const token = await verifyToken(packerToken, "packer");
    if (!token || token.pid !== rest.packerId) {
      return {
        ok: false,
        error: "PACKER_PIN_REQUIRED",
        message: "Tu sesión ha caducado. Vuelve a seleccionar tu nombre e introduce el PIN.",
      };
    }
  }

  const result = await registerPack(db, {
    ...rest,
    packedAt: packedAt ? new Date(packedAt) : undefined,
    stationId: station.id,
  });
  if (result.ok) refresh();
  return result;
}

const SelectPackerSchema = z.object({
  packerId: z.number().int().positive(),
  pin: z.string().regex(/^\d{4,8}$/),
});

export type SelectPackerResult = { ok: true; token: string } | { ok: false; message: string };

/** PIN mode only: checks the packer's PIN and returns a token to attach to their packs. */
export async function selectPackerAction(input: {
  packerId: number;
  pin: string;
}): Promise<SelectPackerResult> {
  if (!(await getStation())) return { ok: false, message: UNAUTHORIZED_MESSAGE };
  const parsed = SelectPackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "PIN incorrecto." };

  const check = await verifyPackerPin(db, parsed.data.packerId, parsed.data.pin);
  if (!check.ok) {
    const messages = {
      NOT_FOUND: "Plegador no encontrado.",
      INACTIVE: "Este plegador está desactivado.",
      NO_PIN: "No tienes PIN asignado. Pide a un responsable que te asigne uno.",
      WRONG_PIN: "PIN incorrecto.",
    } as const;
    return { ok: false, message: messages[check.error] };
  }
  return { ok: true, token: await signToken({ kind: "packer", pid: check.packer.id }) };
}
