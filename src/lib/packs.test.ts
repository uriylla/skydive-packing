import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parachutes, users } from "@/db/schema";
import { createTestDb, testDbUrl } from "@/test/db";
import { getDaySummary, normalizeNumber, registerPack, resolvePackedAt } from "./packs";

describe("normalizeNumber", () => {
  it("strips leading zeros and case", () => {
    expect(normalizeNumber("023")).toBe("23");
    expect(normalizeNumber(" 23 ")).toBe("23");
    expect(normalizeNumber("A07")).toBe("a07");
    expect(normalizeNumber("000")).toBe("0");
  });
});

describe("resolvePackedAt", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  it("keeps a plausible device time", () => {
    const t = new Date("2026-09-22T09:00:00Z");
    expect(resolvePackedAt(t, now)).toBe(t);
  });
  it("falls back to server time when the device clock is off", () => {
    expect(resolvePackedAt(new Date("2026-09-19T12:00:00Z"), now)).toBe(now);
    expect(resolvePackedAt(new Date("2026-09-22T12:10:00Z"), now)).toBe(now);
    expect(resolvePackedAt(undefined, now)).toBe(now);
  });
});

describe.skipIf(!testDbUrl)("registerPack (db)", () => {
  const t = createTestDb();
  const { db } = t;
  let carlos: number;
  let ana: number;
  let retiredPacker: number;

  beforeAll(() => t.setup());
  afterAll(() => t.close());

  beforeEach(async () => {
    await t.reset();
    [{ id: carlos }, { id: ana }, { id: retiredPacker }] = await db
      .insert(users)
      .values([{ name: "Carlos" }, { name: "Ana" }, { name: "Pepe", active: false }])
      .returning({ id: users.id });
    await db.insert(parachutes).values([
      { number: "023" },
      { number: "045", status: "out_of_service" },
      { number: "050", retired: true },
      { number: "060", status: "maintenance" },
    ]);
  });

  const at = new Date("2026-09-22T12:37:00Z"); // 14:37 in Madrid
  const reg = (packerId: number, parachuteNumber: string, clientId = randomUUID()) =>
    registerPack(db, { clientId, packerId, parachuteNumber, packedAt: at }, at);

  it("registers a pack and creates the jornada", async () => {
    const res = await reg(carlos, "23");
    expect(res).toMatchObject({
      ok: true,
      duplicate: false,
      pack: { packerName: "Carlos", parachuteNumber: "023", packedAt: at.toISOString() },
    });
    const summary = await getDaySummary(db, "2026-09-22");
    expect(summary.total).toBe(1);
    expect(summary.byPacker).toEqual([{ packerId: carlos, name: "Carlos", count: 1 }]);
  });

  it("is idempotent for the same clientId", async () => {
    const id = randomUUID();
    const first = await reg(carlos, "023", id);
    const second = await reg(carlos, "023", id);
    expect(second).toMatchObject({ ok: true, duplicate: true });
    expect(first.ok && second.ok && first.pack.id === second.pack.id).toBe(true);
    expect((await getDaySummary(db, "2026-09-22")).total).toBe(1);
  });

  it("rejects unknown, retired and out-of-service parachutes", async () => {
    expect(await reg(carlos, "999")).toMatchObject({ ok: false, error: "PARACHUTE_NOT_FOUND" });
    expect(await reg(carlos, "50")).toMatchObject({ ok: false, error: "PARACHUTE_RETIRED" });
    expect(await reg(carlos, "045")).toMatchObject({
      ok: false,
      error: "PARACHUTE_OUT_OF_SERVICE",
    });
  });

  it("allows parachutes in maintenance", async () => {
    expect(await reg(carlos, "060")).toMatchObject({ ok: true });
  });

  it("rejects inactive or unknown packers", async () => {
    expect(await reg(retiredPacker, "023")).toMatchObject({ ok: false, error: "PACKER_INACTIVE" });
    expect(await reg(9999, "023")).toMatchObject({ ok: false, error: "PACKER_NOT_FOUND" });
  });

  it("prefers an exact number and flags ambiguous ones", async () => {
    await db.insert(parachutes).values([{ number: "23" }, { number: "0007" }, { number: "007" }]);
    expect(await reg(carlos, "23")).toMatchObject({ ok: true, pack: { parachuteNumber: "23" } });
    expect(await reg(carlos, "7")).toMatchObject({ ok: false, error: "PARACHUTE_AMBIGUOUS" });
  });

  it("assigns packs to the jornada of the Madrid date", async () => {
    // 23:30 UTC on 21 Sep = 01:30 on 22 Sep in Madrid.
    const late = new Date("2026-09-21T23:30:00Z");
    await registerPack(
      db,
      { clientId: randomUUID(), packerId: ana, parachuteNumber: "023", packedAt: late },
      late,
    );
    expect((await getDaySummary(db, "2026-09-22")).total).toBe(1);
    expect((await getDaySummary(db, "2026-09-21")).total).toBe(0);
  });

  it("summarises the day, newest first", async () => {
    const t1 = new Date("2026-09-22T08:00:00Z");
    const t2 = new Date("2026-09-22T09:00:00Z");
    for (const [packerId, packedAt] of [
      [carlos, t1],
      [ana, t2],
      [carlos, t2],
    ] as const) {
      await registerPack(
        db,
        { clientId: randomUUID(), packerId, parachuteNumber: "023", packedAt },
        t2,
      );
    }
    const s = await getDaySummary(db, "2026-09-22");
    expect(s.total).toBe(3);
    expect(s.byPacker.map((p) => [p.name, p.count])).toEqual([
      ["Carlos", 2],
      ["Ana", 1],
    ]);
    expect(s.recent[2].packedAt).toBe(t1.toISOString());
  });
});
