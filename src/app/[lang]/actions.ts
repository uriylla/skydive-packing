"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { getRequestI18n } from "@/i18n/request";
import { verifyPackerPin } from "@/lib/accounts";
import { getStation } from "@/lib/auth";
import { REQUIRE_PACKER_PIN } from "@/lib/config";
import { KINDS, MAX_EXTERNAL_LABEL, registerPack, type RegisterPackResult } from "@/lib/packs";
import { checkLimits, clearFailures, lockedMessage, recordFailure } from "@/lib/rate-limit";
import { signToken, verifyToken } from "@/lib/tokens";

const RegisterPackSchema = z
  .object({
    clientId: z.uuid(),
    packerId: z.number().int().positive(),
    /** A registered parachute… */
    parachuteNumber: z.string().trim().min(1).max(20).optional(),
    /** …or one that isn't in the system (e.g. a customer's rig). */
    external: z
      .object({ kind: z.enum(KINDS), label: z.string().trim().min(1).max(MAX_EXTERNAL_LABEL) })
      .optional(),
    packedAt: z.iso.datetime().optional(),
    /** Issued by selectPackerAction when PINs are required. */
    packerToken: z.string().max(1000).optional(),
  })
  .refine(
    (v) => Boolean(v.parachuteNumber) !== Boolean(v.external),
    "parachuteNumber xor external",
  );

export type RegisterPackActionInput = z.input<typeof RegisterPackSchema>;

type RegisterPackError =
  | Extract<RegisterPackResult, { ok: false }>["error"]
  | "INVALID_INPUT"
  | "STATION_UNAUTHORIZED"
  | "PACKER_PIN_REQUIRED";

/** `message` is translated into the language of the page that sent the pack. */
export type RegisterPackActionResult =
  | Extract<RegisterPackResult, { ok: true }>
  | { ok: false; error: RegisterPackError; message: string };

export async function registerPackAction(
  input: RegisterPackActionInput,
): Promise<RegisterPackActionResult> {
  const [station, i18n] = await Promise.all([getStation(), getRequestI18n()]);
  if (!station) {
    return { ok: false, error: "STATION_UNAUTHORIZED", message: i18n.d.msg.stationUnauthorized };
  }

  const parsed = RegisterPackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT", message: i18n.d.msg.invalidInput };
  }
  const { packedAt, packerToken, ...rest } = parsed.data;

  if (REQUIRE_PACKER_PIN) {
    const token = await verifyToken(packerToken, "packer");
    if (!token || token.pid !== rest.packerId) {
      return {
        ok: false,
        error: "PACKER_PIN_REQUIRED",
        message: i18n.d.msg.pinExpired,
      };
    }
  }

  const result = await registerPack(db, {
    ...rest,
    packedAt: packedAt ? new Date(packedAt) : undefined,
    stationId: station.id,
  });
  if (!result.ok) return { ...result, message: i18n.m(result.message) };
  refresh();
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
  const [station, i18n] = await Promise.all([getStation(), getRequestI18n()]);
  const { d } = i18n;
  if (!station) return { ok: false, message: d.msg.stationUnauthorized };
  const parsed = SelectPackerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: d.msg.pinWrong };

  // A 4-digit PIN is easy to guess: limit tries per packer and per device.
  const keys = [`pin:${parsed.data.packerId}`, `pin-station:${station.id}`];
  const limit = await checkLimits(db, [
    { key: keys[0], max: 5 },
    { key: keys[1], max: 20 },
  ]);
  if (limit.locked) return { ok: false, message: i18n.m(lockedMessage(limit.retryAfterSeconds)) };

  const check = await verifyPackerPin(db, parsed.data.packerId, parsed.data.pin);
  if (!check.ok && check.error === "WRONG_PIN") await recordFailure(db, keys);
  if (check.ok) await clearFailures(db, [keys[0]]);
  if (!check.ok) {
    const messages = {
      NOT_FOUND: d.msg.packerNotFound,
      INACTIVE: d.msg.packerDeactivated,
      NO_PIN: d.msg.pinNotAssigned,
      WRONG_PIN: d.msg.pinWrong,
    };
    return { ok: false, message: messages[check.error] };
  }
  return { ok: true, token: await signToken({ kind: "packer", pid: check.packer.id }) };
}
