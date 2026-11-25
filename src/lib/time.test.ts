import { describe, expect, it } from "vitest";
import { dayKey, formatTime } from "./time";

describe("dayKey", () => {
  it("uses the app time zone, not UTC", () => {
    // 23:30 UTC on 21 Sep is 01:30 on 22 Sep in Madrid (CEST, UTC+2).
    const at = new Date("2026-09-21T23:30:00Z");
    expect(dayKey(at, "Europe/Madrid")).toBe("2026-09-22");
    expect(dayKey(at, "UTC")).toBe("2026-09-21");
  });
});

describe("formatTime", () => {
  it("formats HH:mm in 24h", () => {
    expect(formatTime(new Date("2026-09-22T12:37:00Z"), "Europe/Madrid")).toBe("14:37");
  });
});

describe("formatDateTime", () => {
  it("formats in the app time zone", async () => {
    const { formatDateTime, formatDayKey } = await import("./time");
    expect(formatDateTime(new Date("2026-09-21T23:30:00Z"), "Europe/Madrid")).toBe(
      "22/09/2026 01:30",
    );
    expect(formatDayKey("2026-09-22")).toBe("22/09/2026");
  });
});
