import { describe, expect, it } from "vitest";
import { formatDanaValidUpTo } from "@/lib/dana-date";

describe("DANA QRIS expiry formatting", () => {
  it("formats the expiry in Jakarta time regardless of the server timezone", () => {
    expect(formatDanaValidUpTo(new Date("2026-10-07T12:30:00Z")))
      .toBe("2026-10-07T19:30:00+07:00");
  });

  it("handles a date rollover in Jakarta time", () => {
    expect(formatDanaValidUpTo(new Date("2026-10-07T17:30:00Z")))
      .toBe("2026-10-08T00:30:00+07:00");
  });
});
