export type OrderDownload = {
  name: string;
  url: string;
  downloadUrl?: string;
  clipNumber?: number;
  expiresAt?: number;
  local?: boolean;
};

export type StoredClipDownload = {
  clip_number: number;
  file_name: string;
  preview_url: string;
  download_url: string;
};

export function mergeOrderDownloads(
  current: OrderDownload[],
  clips: StoredClipDownload[],
  now = Date.now()
): OrderDownload[] {
  const currentByNumber = new Map(
    current
      .filter((item): item is OrderDownload & { clipNumber: number } => item.clipNumber !== undefined)
      .map((item) => [item.clipNumber, item])
  );
  const merged = new Map<number, OrderDownload>();

  for (const clip of clips) {
    const existing = currentByNumber.get(clip.clip_number);
    if (existing?.local || (existing?.expiresAt && existing.expiresAt > now)) {
      merged.set(clip.clip_number, existing);
      continue;
    }
    merged.set(clip.clip_number, {
      name: clip.file_name,
      url: clip.preview_url,
      downloadUrl: clip.download_url,
      clipNumber: clip.clip_number,
      expiresAt: now + 240_000
    });
  }

  for (const item of current) {
    if (item.local && item.clipNumber !== undefined && !merged.has(item.clipNumber)) {
      merged.set(item.clipNumber, item);
    }
  }

  return [...merged.values()].sort((left, right) => (left.clipNumber ?? 0) - (right.clipNumber ?? 0));
}
