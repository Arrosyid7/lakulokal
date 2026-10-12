import { describe, expect, it } from "vitest";
import { resolveAdminDateRange } from "@/lib/admin-date-range";

describe("resolveAdminDateRange", () => {
  const now = new Date("2026-10-12T16:30:00.000Z");

  it("returns no bounds for all dates", () => {
    expect(resolveAdminDateRange("all", "", "", now)).toEqual({ range: null, error: null });
  });

  it("uses the current Jakarta day for daily filtering", () => {
    expect(resolveAdminDateRange("today", "", "", now)).toEqual({
      range: { from: "2026-10-11T17:00:00.000Z", to: "2026-10-12T17:00:00.000Z" },
      error: null
    });
  });

  it("uses Monday through today for weekly filtering", () => {
    expect(resolveAdminDateRange("week", "", "", now)).toEqual({
      range: { from: "2026-10-11T17:00:00.000Z", to: "2026-10-12T17:00:00.000Z" },
      error: null
    });
  });

  it("uses the current month through today for monthly filtering", () => {
    expect(resolveAdminDateRange("month", "", "", now)).toEqual({
      range: { from: "2026-09-30T17:00:00.000Z", to: "2026-10-12T17:00:00.000Z" },
      error: null
    });
  });

  it("includes both custom dates in Jakarta time", () => {
    expect(resolveAdminDateRange("custom", "2026-10-01", "2026-10-12", now)).toEqual({
      range: { from: "2026-09-30T17:00:00.000Z", to: "2026-10-12T17:00:00.000Z" },
      error: null
    });
  });

  it("rejects incomplete, invalid, and reversed custom ranges", () => {
    expect(resolveAdminDateRange("custom", "", "2026-10-12", now).error).toBeTruthy();
    expect(resolveAdminDateRange("custom", "2026-02-30", "2026-03-01", now).error).toBeTruthy();
    expect(resolveAdminDateRange("custom", "2026-10-13", "2026-10-12", now).error).toBeTruthy();
  });
});
