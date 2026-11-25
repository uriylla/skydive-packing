import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { parachutes, users } from "@/db/schema";
import { createTestDb, testDbUrl } from "@/test/db";
import {
  correctPack,
  getDay,
  getPack,
  listDays,
  listPacks,
  PackFilterSchema,
  restorePack,
  voidPack,
} from "./history";
import { getDaySummary, registerPack } from "./packs";

describe("PackFilterSchema", () => {
  it("keeps valid values and drops junk", () => {
    expect(
      PackFilterSchema.parse({
        from: "2026-09-01",
        to: "nope",
        timeFrom: "09:30",
        timeTo: "25:00",
        packerId: "3",
        parachuteId: "x",
        includeVoided: "1",
      }),
    ).toEqual({ from: "2026-09-01", timeFrom: "09:30", packerId: 3, includeVoided: true });
  });
});

describe.skipIf(!testDbUrl)("history (db)", () => {
  const t = createTestDb();
  const { db } = t;
  let ana: number;
  let carlos: number;
  let boss: number;

  beforeAll(() => t.setup());
  afterAll(() => t.close());

  const pack = async (packerId: number, parachuteNumber: string, iso: string) => {
    const at = new Date(iso);
    const r = await registerPack(
      db,
      { clientId: randomUUID(), packerId, parachuteNumber, packedAt: at },
      at,
    );
    if (!r.ok) throw new Error(r.message);
    return r.pack.id;
  };

  beforeEach(async () => {
    await t.reset();
    [{ id: ana }, { id: carlos }, { id: boss }] = await db
      .insert(users)
      .values([{ name: "Ana" }, { name: "Carlos" }, { name: "Jefa", role: "supervisor" }])
      .returning({ id: users.id });
    await db
      .insert(parachutes)
      .values([
        { number: "012" },
        { number: "023", kind: "tandem" },
        { number: "050", retired: true },
      ]);
    // Madrid is UTC+2 in September.
    await pack(ana, "012", "2026-09-21T07:42:00Z"); // 21/09 09:42
    await pack(carlos, "023", "2026-09-22T07:48:00Z"); // 22/09 09:48
    await pack(ana, "023", "2026-09-22T12:37:00Z"); // 22/09 14:37
    await pack(carlos, "012", "2026-09-22T21:59:00Z"); // 22/09 23:59
  });

  it("filters by jornada range, packer, parachute and local time", async () => {
    expect((await listPacks(db, {})).total).toBe(4);
    expect((await listPacks(db, { from: "2026-09-22", to: "2026-09-22" })).total).toBe(3);
    expect((await listPacks(db, { to: "2026-09-21" })).total).toBe(1);
    expect((await listPacks(db, { packerId: ana })).total).toBe(2);
    const p023 = (await listPacks(db, {})).rows.find(
      (r) => r.parachuteNumber === "023",
    )!.parachuteId;
    expect((await listPacks(db, { parachuteId: p023! })).total).toBe(2);
    // 09:00–10:00 local, both ends inclusive to the minute.
    expect((await listPacks(db, { timeFrom: "09:00", timeTo: "09:48" })).total).toBe(2);
    expect((await listPacks(db, { timeFrom: "23:59" })).total).toBe(1);
  });

  it("splits counts by type and filters by type / external", async () => {
    const at = new Date("2026-09-22T15:00:00Z");
    await registerPack(
      db,
      {
        clientId: randomUUID(),
        packerId: ana,
        external: { kind: "tandem", label: "Pedro" },
        packedAt: at,
      },
      at,
    );
    const all = await listPacks(db, {});
    expect([all.total, all.tandem, all.normal]).toEqual([5, 3, 2]);
    expect((await listPacks(db, { kind: "tandem" })).total).toBe(3);
    const ext = await listPacks(db, { external: true });
    expect(ext.rows.map((r) => [r.parachuteId, r.externalLabel, r.kind])).toEqual([
      [null, "Pedro", "tandem"],
    ]);
    const day = await getDay(db, "2026-09-22");
    expect([day?.total, day?.tandem, day?.normal]).toEqual([4, 3, 1]);
    expect(day?.byPacker.find((p) => p.name === "Ana")).toMatchObject({
      count: 2,
      tandem: 2,
      normal: 0,
    });
    expect((await listDays(db)).rows[0]).toMatchObject({ packs: 4, tandem: 3, normal: 1 });
  });

  it("keeps the type a pack was registered with if the parachute is reclassified", async () => {
    await db.update(parachutes).set({ kind: "normal" });
    expect((await listPacks(db, { kind: "tandem" })).total).toBe(2);
  });

  it("corrects between registered and external parachutes", async () => {
    const [latest] = (await listPacks(db, {})).rows; // Carlos, 012 (normal)
    const toExt = await correctPack(
      db,
      latest.id,
      { packerId: carlos, external: { kind: "tandem", label: "Cliente Luis" } },
      boss,
    );
    if (!toExt.ok) throw new Error(toExt.error);
    expect(await getPack(db, toExt.id)).toMatchObject({
      parachuteId: null,
      externalLabel: "Cliente Luis",
      kind: "tandem",
    });
    // Same external parachute with another type is a real change.
    const kindFix = await correctPack(
      db,
      toExt.id,
      { packerId: carlos, external: { kind: "normal", label: "Cliente Luis" } },
      boss,
    );
    if (!kindFix.ok) throw new Error(kindFix.error);
    const back = await correctPack(
      db,
      kindFix.id,
      { packerId: carlos, parachuteNumber: "23" },
      boss,
    );
    if (!back.ok) throw new Error(back.error);
    expect(await getPack(db, back.id)).toMatchObject({
      parachuteNumber: "023",
      externalLabel: null,
      kind: "tandem",
    });
    expect(
      await correctPack(
        db,
        back.id,
        { packerId: carlos, external: { kind: "normal", label: " " } },
        boss,
      ),
    ).toMatchObject({ ok: false });
  });

  it("paginates newest first", async () => {
    const page1 = await listPacks(db, {}, { limit: 3 });
    const page2 = await listPacks(db, {}, { limit: 3, offset: 3 });
    expect(page1.rows.map((r) => r.packerName)).toEqual(["Carlos", "Ana", "Carlos"]);
    expect(page2.rows.map((r) => r.date)).toEqual(["2026-09-21"]);
    expect(page1.total).toBe(4);
  });

  it("lists jornadas with totals", async () => {
    const { rows, total } = await listDays(db);
    expect(total).toBe(2);
    expect(rows.map((d) => [d.date, d.packs, d.packers, d.parachutes])).toEqual([
      ["2026-09-22", 3, 2, 2],
      ["2026-09-21", 1, 1, 1],
    ]);
    const day = await getDay(db, "2026-09-22");
    expect(day?.total).toBe(3);
    expect(day?.byPacker.map((p) => [p.name, p.count])).toEqual([
      ["Carlos", 2],
      ["Ana", 1],
    ]);
    expect(await getDay(db, "2026-01-01")).toBeNull();
  });

  it("voids and restores, excluding voided packs from totals", async () => {
    const [latest] = (await listPacks(db, {})).rows;
    expect(await voidPack(db, latest.id, " ", boss)).toMatchObject({ ok: false });
    expect(await voidPack(db, latest.id, "Registrado por error", boss)).toEqual({
      ok: true,
      id: latest.id,
    });
    expect(await voidPack(db, latest.id, "otra vez", boss)).toMatchObject({ ok: false });
    expect((await listPacks(db, {})).total).toBe(3);
    expect((await listPacks(db, { includeVoided: true })).total).toBe(4);
    expect((await getDaySummary(db, "2026-09-22")).total).toBe(2);
    expect((await listDays(db)).rows[0].packs).toBe(2);
    expect(await getPack(db, latest.id)).toMatchObject({
      voided: true,
      voidedReason: "Registrado por error",
      voidedByName: "Jefa",
    });
    await restorePack(db, latest.id);
    expect((await listPacks(db, {})).total).toBe(4);
  });

  it("corrects a pack by voiding it and recording a linked copy", async () => {
    const [latest] = (await listPacks(db, {})).rows; // Carlos, 012, 23:59
    expect(
      await correctPack(db, latest.id, { packerId: carlos, parachuteNumber: "12" }, boss),
    ).toEqual({
      ok: false,
      error: "No has cambiado nada.",
    });
    // A retired parachute is allowed in a correction.
    const res = await correctPack(db, latest.id, { packerId: ana, parachuteNumber: "050" }, boss);
    if (!res.ok) throw new Error(res.error);

    const fixed = await getPack(db, res.id);
    expect(fixed).toMatchObject({
      packerName: "Ana",
      parachuteNumber: "050",
      correctionOfId: latest.id,
      date: "2026-09-22",
      packedAt: latest.packedAt,
    });
    expect(await getPack(db, latest.id)).toMatchObject({
      voided: true,
      voidedReason: "Corregido",
      correctedById: res.id,
    });
    expect((await getDay(db, "2026-09-22"))?.total).toBe(3);
    // The original can't be restored while the correction stands.
    expect(await restorePack(db, latest.id)).toMatchObject({ ok: false });
    expect(
      await correctPack(db, latest.id, { packerId: ana, parachuteNumber: "023" }, boss),
    ).toMatchObject({ ok: false });
  });
});
