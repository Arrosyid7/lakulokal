import { describe, expect, it } from "vitest";
import { formatDanaValidUpTo } from "@/lib/dana";

describe("DANA QRIS expiry formatting", () => {
  it("formats a local datetime with the current timezone offset, not a hard-coded UTC offset", () => {
    const now = new Date("2026-10-07T12:30:00Z");
    const formatted = formatDanaValidUpTo(now);
    const offsetMinutes = -now.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? "+" : "-";
    const absolute = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
    const minutes = String(absolute % 60).padStart(2, "0");

    const expectedLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 19);

    expect(formatted).toBe(`${expectedLocal}${sign}${hours}:${minutes}`);
    expect(formatted).toContain(`${sign}${hours}:${minutes}`);
  });
});
