import { describe, expect, it } from "vitest";
import {
  formatClipTimecode,
  getClipRanges,
  getManualClipRange,
  parseClipTimecode,
  validateBrowserVideo
} from "@/lib/browser-video";

describe("browser video clipping", () => {
  it("spreads clips evenly across the source", () => {
    expect(getClipRanges(1200, 5)).toEqual([
      { start: 0, duration: 60 },
      { start: 285, duration: 60 },
      { start: 570, duration: 60 },
      { start: 855, duration: 60 },
      { start: 1140, duration: 60 }
    ]);
  });

  it("divides short videos into non-overlapping clips", () => {
    expect(getClipRanges(45, 5)).toEqual([
      { start: 0, duration: 9 },
      { start: 9, duration: 9 },
      { start: 18, duration: 9 },
      { start: 27, duration: 9 },
      { start: 36, duration: 9 }
    ]);
  });

  it("rejects unsupported input and invalid clip requests", () => {
    expect(() => getClipRanges(0, 5)).toThrow("Durasi video tidak valid.");
    expect(() => getClipRanges(10, 20)).toThrow("Video terlalu singkat");
    expect(validateBrowserVideo(new File(["data"], "video.avi"))).toContain("Gunakan video");
    expect(validateBrowserVideo(new File([""], "empty.mp4"))).toBe("File video kosong.");
  });

  it("validates manually selected clip time ranges", () => {
    expect(getManualClipRange(12.5, 42.5, 90)).toEqual({ start: 12.5, duration: 30 });
    expect(() => getManualClipRange(10, 8, 90)).toThrow("Waktu mulai dan selesai");
    expect(() => getManualClipRange(0, 61, 90)).toThrow("maksimal 60 detik");
    expect(() => getManualClipRange(20, 30, 25)).toThrow("Waktu mulai dan selesai");
  });

  it("parses and formats manual clip times as minutes and seconds", () => {
    expect(parseClipTimecode("00:00")).toBe(0);
    expect(parseClipTimecode("01:05")).toBe(65);
    expect(parseClipTimecode("120:00")).toBe(7200);
    expect(formatClipTimecode(65)).toBe("01:05");
    expect(formatClipTimecode(59.9)).toBe("00:59");
    expect(() => parseClipTimecode("1:60")).toThrow("menit:detik");
    expect(() => parseClipTimecode("120:01")).toThrow("dua jam");
    expect(() => parseClipTimecode("")).toThrow("menit:detik");
  });
});
