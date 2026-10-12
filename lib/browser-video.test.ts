import { describe, expect, it } from "vitest";
import { getClipRanges, getManualClipRange, validateBrowserVideo } from "@/lib/browser-video";

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
});
