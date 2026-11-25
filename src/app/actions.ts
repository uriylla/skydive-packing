"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { registerPack, type RegisterPackResult } from "@/lib/packs";

const RegisterPackSchema = z.object({
  clientId: z.uuid(),
  packerId: z.number().int().positive(),
  parachuteNumber: z.string().trim().min(1).max(20),
  packedAt: z.iso.datetime().optional(),
});

export type RegisterPackActionInput = z.input<typeof RegisterPackSchema>;

export async function registerPackAction(
  input: RegisterPackActionInput,
): Promise<RegisterPackResult | { ok: false; error: "INVALID_INPUT"; message: string }> {
  // TODO(M3): requireStation() — only unlocked devices may register packs.
  const parsed = RegisterPackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT", message: "Datos no válidos." };
  }
  const { packedAt, ...rest } = parsed.data;
  const result = await registerPack(db, {
    ...rest,
    packedAt: packedAt ? new Date(packedAt) : undefined,
  });
  if (result.ok) refresh();
  return result;
}
