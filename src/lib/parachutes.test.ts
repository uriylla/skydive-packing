import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@/db/schema";
import { createTestDb, testDbUrl } from "@/test/db";
import { listPacks } from "./history";
import { registerPack } from "./packs";
import {
  createParachute,
  listParachutes,
  ParachuteInput,
  setParachuteRetired,
  updateParachute,
} from "./parachutes";

const input = (over: Partial<Record<string, string>> = {}) =>
  ParachuteInput.parse({
    number: "023",
    kind: "normal",
    model: "",
    serialNumber: "",
    owner: "",
    status: "active",
    notes: "",
    ...over,
  });

describe("ParachuteInput", () => {
  it("turns blanks into null and trims", () => {
    expect(input({ number: " 023 ", model: " Sabre3 " })).toMatchObject({
      number: "023",
      model: "Sabre3",
      owner: null,
    });
  });
  it("rejects odd numbers", () => {
    expect(ParachuteInput.safeParse({ ...input(), number: "02 3" }).success).toBe(false);
  });
});

describe.skipIf(!testDbUrl)("parachutes (db)", () => {
  const t = createTestDb();
  const { db } = t;
  beforeAll(() => t.setup());
  afterAll(() => t.close());
  beforeEach(() => t.reset());

  it("creates, edits and blocks duplicate numbers (ignoring leading zeros)", async () => {
    const a = await createParachute(db, input({ number: "023" }));
    expect(a.ok).toBe(true);
    expect(await createParachute(db, input({ number: "23" }))).toEqual({
      ok: false,
      errors: { number: "Ya existe el paracaídas 023." },
    });
    const b = await createParachute(db, input({ number: "045" }));
    if (!a.ok || !b.ok) throw new Error();
    expect((await updateParachute(db, b.id, input({ number: "0023" }))).ok).toBe(false);
    // Editing a parachute without changing its number is fine.
    expect((await updateParachute(db, a.id, input({ number: "023", model: "X" }))).ok).toBe(true);
  });

  it("lists with filters, pack counts, and hides retired by default", async () => {
    const a = await createParachute(db, input({ number: "023", model: "Sabre3" }));
    await createParachute(db, input({ number: "045", status: "maintenance" }));
    const c = await createParachute(db, input({ number: "050" }));
    if (!a.ok || !c.ok) throw new Error();
    await setParachuteRetired(db, c.id, true);

    const [{ id: packerId }] = await db.insert(users).values({ name: "Ana" }).returning();
    for (let i = 0; i < 2; i++) {
      await registerPack(db, { clientId: randomUUID(), packerId, parachuteNumber: "023" });
    }

    const all = await listParachutes(db);
    expect(all.map((p) => [p.number, p.packCount])).toEqual([
      ["023", 2],
      ["045", 0],
    ]);
    expect((await listParachutes(db, { status: "maintenance" })).map((p) => p.number)).toEqual([
      "045",
    ]);
    expect((await listParachutes(db, { retired: true })).map((p) => p.number)).toEqual(["050"]);
    expect((await listParachutes(db, { q: "sabre" })).map((p) => p.number)).toEqual(["023"]);

    const history = await listPacks(db, { parachuteId: a.id });
    expect(history.total).toBe(2);
    expect(history.rows[0]).toMatchObject({ packerName: "Ana", parachuteNumber: "023" });
  });
});
