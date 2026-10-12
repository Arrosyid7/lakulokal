function normalizedAmount(value: string): number | null {
  const compact = value.replace(/\s/g, "");
  const withoutZeroDecimals = compact.replace(/[.,]00$/, "");
  const digits = withoutZeroDecimals.replace(/\D/g, "");
  if (!digits || digits.length > 12) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function extractReceiptAmounts(text: string): number[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = lines.filter((line) => {
    const hasCurrency = /\b(rp|idr)\b/i.test(line);
    if (!hasCurrency && /\b(tanggal|date|time|waktu|tgl)\b/i.test(line)) return false;
    return hasCurrency || /\b(total|amount|nominal|jumlah|paid)\b/i.test(line);
  });
  const amounts = candidates.flatMap((line) => {
    const matches = line.match(/(?:rp|idr)?\s*\d[\d.,\s]{0,20}/gi) ?? [];
    return matches.map(normalizedAmount).filter((amount): amount is number => amount !== null);
  });
  return [...new Set(amounts)];
}
