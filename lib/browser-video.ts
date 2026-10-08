export const MAX_BROWSER_VIDEO_BYTES = 250 * 1024 * 1024;
export const MAX_BROWSER_VIDEO_DURATION_SECONDS = 2 * 60 * 60;
export const MAX_CLIP_DURATION_SECONDS = 60;

export type ClipRange = { start: number; duration: number };

export function readVideoDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Durasi video tidak dapat dibaca. Coba file MP4, MOV, M4V, atau WebM lain."));
    };
    video.src = url;
  });
}

export function getClipRanges(duration: number, count: number): ClipRange[] {
  if (!Number.isFinite(duration) || duration < 1) throw new Error("Durasi video tidak valid.");
  if (!Number.isSafeInteger(count) || count < 1 || count > 20) throw new Error("Jumlah klip tidak valid.");
  const clipDuration = Math.min(MAX_CLIP_DURATION_SECONDS, duration / count);
  if (clipDuration < 1) throw new Error("Video terlalu singkat untuk jumlah klip pada paket ini.");
  const latestStart = Math.max(0, duration - clipDuration);
  return Array.from({ length: count }, (_, index) => ({
    start: latestStart * index / Math.max(1, count - 1),
    duration: clipDuration
  }));
}

export function validateBrowserVideo(file: File): string | null {
  if (file.size === 0) return "File video kosong.";
  if (file.size > MAX_BROWSER_VIDEO_BYTES) return "Ukuran video maksimal 250 MB.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["mp4", "mov", "m4v", "webm"].includes(extension)) {
    return "Gunakan video MP4, MOV, M4V, atau WebM.";
  }
  return null;
}
