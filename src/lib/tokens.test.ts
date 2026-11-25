import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./tokens";

const secret = "test-secret-test-secret-test-secret-1234";

describe("tokens", () => {
  it("round-trips a payload of the right kind", async () => {
    const t = await signToken({ kind: "station", sid: 7 }, { secret });
    expect(await verifyToken(t, "station", { secret })).toMatchObject({ kind: "station", sid: 7 });
  });

  it("rejects a token of another kind", async () => {
    const t = await signToken({ kind: "packer", pid: 3 }, { secret });
    expect(await verifyToken(t, "admin", { secret })).toBeNull();
  });

  it("rejects a token signed with another secret or tampered with", async () => {
    const t = await signToken({ kind: "admin", uid: 1 }, { secret });
    expect(await verifyToken(t, "admin", { secret: `${secret}-other` })).toBeNull();
    const [h, , s] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ kind: "admin", uid: 2 })).toString("base64url");
    expect(await verifyToken(`${h}.${forged}.${s}`, "admin", { secret })).toBeNull();
  });

  it("expires admin sessions after 12 h", async () => {
    const now = new Date("2026-09-22T08:00:00Z");
    const t = await signToken({ kind: "admin", uid: 1 }, { secret, now });
    const in11h = new Date(now.getTime() + 11 * 3600_000);
    const in13h = new Date(now.getTime() + 13 * 3600_000);
    expect(await verifyToken(t, "admin", { secret, now: in11h })).not.toBeNull();
    expect(await verifyToken(t, "admin", { secret, now: in13h })).toBeNull();
  });

  it("handles missing or garbage tokens", async () => {
    expect(await verifyToken(undefined, "admin", { secret })).toBeNull();
    expect(await verifyToken("nope", "admin", { secret })).toBeNull();
  });
});
