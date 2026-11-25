import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, testDbUrl } from "@/test/db";
import { checkLimits, clearFailures, lockedMessage, recordFailure, WINDOW_MS } from "./rate-limit";

describe("lockedMessage", () => {
  it("rounds up to minutes", () => {
    expect(lockedMessage(30)).toBe("Demasiados intentos fallidos. Prueba de nuevo en 1 minuto.");
    expect(lockedMessage(601)).toContain("11 minutos");
  });
});

describe.skipIf(!testDbUrl)("rate limit (db)", () => {
  const t = createTestDb();
  const { db } = t;
  beforeAll(() => t.setup());
  afterAll(() => t.close());
  beforeEach(() => t.reset());

  const t0 = new Date("2026-09-22T10:00:00Z");
  const at = (ms: number) => new Date(t0.getTime() + ms);
  const limits = [
    { key: "login:ana", max: 3 },
    { key: "login-ip:1.2.3.4", max: 5 },
  ];

  it("locks a key after max failures in the window, then unlocks", async () => {
    for (let i = 0; i < 2; i++) await recordFailure(db, ["login:ana"], at(i * 1000));
    expect(await checkLimits(db, limits, at(5000))).toEqual({ locked: false });
    await recordFailure(db, ["login:ana"], at(10_000));
    const res = await checkLimits(db, limits, at(20_000));
    expect(res).toEqual({ locked: true, retryAfterSeconds: WINDOW_MS / 1000 - 20 });
    // Once the oldest failure leaves the window, there's room again.
    expect(await checkLimits(db, limits, at(WINDOW_MS + 1))).toEqual({ locked: false });
  });

  it("applies each key's own limit", async () => {
    for (let i = 0; i < 5; i++) await recordFailure(db, ["login-ip:1.2.3.4"], at(i));
    expect(await checkLimits(db, limits, at(100))).toMatchObject({ locked: true });
    expect(await checkLimits(db, [{ key: "login:ana", max: 3 }], at(100))).toEqual({
      locked: false,
    });
  });

  it("clears a key on success", async () => {
    for (let i = 0; i < 3; i++) await recordFailure(db, ["login:ana"], at(i));
    await clearFailures(db, ["login:ana"]);
    expect(await checkLimits(db, limits, at(100))).toEqual({ locked: false });
  });
});
