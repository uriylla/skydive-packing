import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@/db/schema";
import { createTestDb, testDbUrl } from "@/test/db";
import {
  createStation,
  getActiveStation,
  getActiveSupervisor,
  hashSecret,
  listStations,
  renameStation,
  revokeStation,
  verifyPackerPin,
  verifySupervisorLogin,
} from "./accounts";

describe.skipIf(!testDbUrl)("accounts (db)", () => {
  const t = createTestDb();
  const { db } = t;
  let boss: number;
  let carlos: number;
  let ana: number;

  beforeAll(() => t.setup());
  afterAll(() => t.close());

  beforeEach(async () => {
    await t.reset();
    [{ id: boss }, { id: carlos }, { id: ana }] = await db
      .insert(users)
      .values([
        {
          name: "Jefa",
          role: "supervisor",
          username: "jefa",
          passwordHash: await hashSecret("secreto123"),
        },
        { name: "Carlos", pinHash: await hashSecret("1234") },
        { name: "Ana" },
      ])
      .returning({ id: users.id });
  });

  it("logs in supervisors (username is case-insensitive)", async () => {
    expect(await verifySupervisorLogin(db, " Jefa ", "secreto123")).toEqual({
      id: boss,
      name: "Jefa",
    });
    expect(await verifySupervisorLogin(db, "jefa", "wrong")).toBeNull();
    expect(await verifySupervisorLogin(db, "nobody", "secreto123")).toBeNull();
  });

  it("rejects deactivated or demoted supervisors", async () => {
    await db.update(users).set({ active: false });
    expect(await verifySupervisorLogin(db, "jefa", "secreto123")).toBeNull();
    expect(await getActiveSupervisor(db, boss)).toBeNull();
  });

  it("checks packer PINs", async () => {
    expect(await verifyPackerPin(db, carlos, "1234")).toMatchObject({ ok: true });
    expect(await verifyPackerPin(db, carlos, "0000")).toEqual({ ok: false, error: "WRONG_PIN" });
    expect(await verifyPackerPin(db, ana, "1234")).toEqual({ ok: false, error: "NO_PIN" });
    expect(await verifyPackerPin(db, 9999, "1234")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("locks out revoked stations", async () => {
    const s = await createStation(db, " PC plegado ", boss);
    expect(s.name).toBe("PC plegado");
    expect(await getActiveStation(db, s.id)).toEqual({ id: s.id, name: "PC plegado" });
    await revokeStation(db, s.id);
    expect(await getActiveStation(db, s.id)).toBeNull();
  });

  it("lists active stations before revoked ones", async () => {
    const old = await createStation(db, "Viejo", boss);
    await createStation(db, "Nuevo", boss);
    await revokeStation(db, old.id);
    expect((await listStations(db)).map((s) => s.name)).toEqual(["Nuevo", "Viejo"]);
  });

  it("renames a station in place", async () => {
    const s = await createStation(db, "Tablet", boss);
    await renameStation(db, s.id, " Tablet hangar ");
    expect(await getActiveStation(db, s.id)).toEqual({ id: s.id, name: "Tablet hangar" });
  });
});
