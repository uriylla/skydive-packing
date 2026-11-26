import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, testDbUrl } from "@/test/db";
import { verifyPackerPin, verifySupervisorLogin } from "./accounts";
import {
  createPerson,
  getPerson,
  listPeople,
  PersonInput,
  setPersonActive,
  setPersonPin,
  updatePerson,
} from "./people";

const person = (over: Partial<Record<string, string>> = {}) =>
  PersonInput.parse({ name: "Ana", role: "packer", username: "", password: "", ...over });

describe("PersonInput", () => {
  it("requires a valid username for supervisors only", () => {
    expect(
      PersonInput.safeParse({ name: "A", role: "packer", username: "", password: "" }).success,
    ).toBe(true);
    expect(
      PersonInput.safeParse({ name: "A", role: "supervisor", username: "a", password: "" }).success,
    ).toBe(false);
  });
  it("drops login fields for packers", () => {
    expect(person({ username: "ana", password: "whatever1" })).toMatchObject({
      username: null,
      password: null,
    });
  });
});

describe.skipIf(!testDbUrl)("people (db)", () => {
  const t = createTestDb();
  const { db } = t;
  let boss: number;

  beforeAll(() => t.setup());
  afterAll(() => t.close());
  beforeEach(async () => {
    await t.reset();
    const r = await createPerson(
      db,
      person({ name: "Jefa", role: "supervisor", username: "Jefa", password: "secreto123" }),
    );
    if (!r.ok) throw new Error(JSON.stringify(r));
    boss = r.id;
  });

  it("creates supervisors who can log in, and rejects duplicate usernames", async () => {
    expect(await verifySupervisorLogin(db, "jefa", "secreto123")).toMatchObject({ id: boss });
    const dup = await createPerson(
      db,
      person({ name: "Otra", role: "supervisor", username: "jefa", password: "secreto123" }),
    );
    expect(dup).toEqual({ ok: false, errors: { username: { key: "usernameTaken" } } });
    const noPw = await createPerson(
      db,
      person({ name: "Otra", role: "supervisor", username: "otra" }),
    );
    expect(noPw.ok).toBe(false);
  });

  it("keeps the password when left blank and clears login on demotion", async () => {
    const r = await createPerson(
      db,
      person({ name: "Luis", role: "supervisor", username: "luis", password: "secreto123" }),
    );
    if (!r.ok) throw new Error();
    await updatePerson(
      db,
      r.id,
      person({ name: "Luis M.", role: "supervisor", username: "luis" }),
      boss,
    );
    expect(await verifySupervisorLogin(db, "luis", "secreto123")).toMatchObject({
      name: "Luis M.",
    });
    expect((await updatePerson(db, r.id, person({ name: "Luis M." }), boss)).ok).toBe(true);
    expect(await verifySupervisorLogin(db, "luis", "secreto123")).toBeNull();
    expect(await getPerson(db, r.id)).toMatchObject({ role: "packer", username: null });
  });

  it("requires a password when promoting a packer", async () => {
    const r = await createPerson(db, person());
    if (!r.ok) throw new Error();
    const res = await updatePerson(db, r.id, person({ role: "supervisor", username: "ana" }), boss);
    expect(res.ok).toBe(false);
  });

  it("protects against locking everyone out", async () => {
    expect(await setPersonActive(db, boss, false, boss)).toMatchObject({ ok: false });
    expect((await updatePerson(db, boss, person({ name: "Jefa" }), boss)).ok).toBe(false);
    // Another supervisor can't remove the last one either.
    const other = await createPerson(db, person({ name: "Luis" }));
    if (!other.ok) throw new Error();
    expect(await setPersonActive(db, boss, false, other.id)).toMatchObject({ ok: false });
  });

  it("deactivates and reactivates packers", async () => {
    const r = await createPerson(db, person());
    if (!r.ok) throw new Error();
    expect(await setPersonActive(db, r.id, false, boss)).toEqual({ ok: true });
    expect((await listPeople(db)).map((p) => p.name)).toEqual(["Jefa"]);
    expect((await listPeople(db, { active: false })).map((p) => p.name)).toEqual(["Ana"]);
    await setPersonActive(db, r.id, true, boss);
    expect((await listPeople(db)).map((p) => p.name)).toEqual(["Ana", "Jefa"]);
  });

  it("sets and clears PINs", async () => {
    const r = await createPerson(db, person());
    if (!r.ok) throw new Error();
    await setPersonPin(db, r.id, "4321");
    expect(await getPerson(db, r.id)).toMatchObject({ hasPin: true });
    expect(await verifyPackerPin(db, r.id, "4321")).toMatchObject({ ok: true });
    await setPersonPin(db, r.id, null);
    expect(await verifyPackerPin(db, r.id, "4321")).toEqual({ ok: false, error: "NO_PIN" });
    await expect(setPersonPin(db, r.id, "12")).rejects.toThrow();
  });
});
