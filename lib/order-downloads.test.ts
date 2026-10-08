import { describe, expect, it } from "vitest";
import { mergeOrderDownloads, type OrderDownload, type StoredClipDownload } from "@/lib/order-downloads";

const storedClip = (clip_number: number): StoredClipDownload => ({
  clip_number,
  file_name: `clip_${clip_number}.mp4`,
  preview_url: `https://example.com/preview/${clip_number}`,
  download_url: `https://example.com/download/${clip_number}`
});

describe("mergeOrderDownloads", () => {
  it("keeps a local preview visible while it is still being uploaded", () => {
    const localPreview: OrderDownload = {
      name: "clip_2.mp4",
      url: "blob:clip-2",
      clipNumber: 2,
      local: true
    };

    expect(mergeOrderDownloads([localPreview], [storedClip(1)], 1000)).toEqual([
      expect.objectContaining({ clipNumber: 1, url: "https://example.com/preview/1" }),
      localPreview
    ]);
  });

  it("prefers local previews and keeps active signed links during refresh", () => {
    const localPreview: OrderDownload = {
      name: "clip_1.mp4",
      url: "blob:clip-1",
      clipNumber: 1,
      local: true
    };
    const signedLink: OrderDownload = {
      name: "clip_2.mp4",
      url: "https://example.com/current-preview/2",
      downloadUrl: "https://example.com/current-download/2",
      clipNumber: 2,
      expiresAt: 5000
    };

    expect(mergeOrderDownloads([localPreview, signedLink], [storedClip(1), storedClip(2)], 1000)).toEqual([
      localPreview,
      signedLink
    ]);
  });
});
