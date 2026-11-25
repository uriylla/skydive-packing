import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows same-site paths", () => {
    expect(safeNext("/admin/history?packer=2")).toBe("/admin/history?packer=2");
  });
  it("rejects external or odd targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "admin", null, ""]) {
      expect(safeNext(bad)).toBe("/admin/days");
    }
  });
});
