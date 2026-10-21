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
  const amountLabel = /\b(total|amount|nominal|jumlah|paid)\b/i;
  const currency = /\b(?:rp|idr)(?:\b|(?=\d))/i;
  const unrelatedLabel = /\b(tanggal|date|time|waktu|tgl|referensi|reference|ref|nomor|no\.|transaction id|id transaksi)\b/i;
  const candidates = lines.filter((line, index) => {
    const hasAmountSignal = amountLabel.test(line) || currency.test(line);
    if (unrelatedLabel.test(line) && !hasAmountSignal) return false;
    if (hasAmountSignal) return true;

    const previousLines = lines.slice(Math.max(0, index - 2), index);
    return (
      /\d/.test(line) &&
      previousLines.some((previousLine) => amountLabel.test(previousLine) || currency.test(previousLine)) &&
      !previousLines.some((previousLine) => unrelatedLabel.test(previousLine))
    );
  });
  const amounts = candidates.flatMap((line) => {
    const matches = line.match(/(?:rp|idr)?\s*\d[\d.,\s]{0,20}/gi) ?? [];
    return matches.map(normalizedAmount).filter((amount): amount is number => amount !== null);
  });
  return [...new Set(amounts)];
}
