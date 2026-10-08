const monthNumbers: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12, december: 12
};

function validDate(year: number, month: number, day: number): string | null {
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function extractReceiptDate(text: string): string | null {
  const normalized = text.toLowerCase();
  const patterns = [
    { regex: /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, order: "ymd" },
    { regex: /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/g, order: "dmy" },
    { regex: /\b(\d{1,2})\s+(jan(?:uari|uary)?|feb(?:ruari|ruary)?|mar(?:et|ch)?|apr(?:il)?|mei|may|jun(?:i|e)?|jul(?:i|y)?|agu(?:stus)?|agt|aug(?:ust)?|sep(?:tember)?|okt(?:ober)?|oct(?:ober)?|nov(?:ember)?|des(?:ember)?|dec(?:ember)?)\.?\s+(20\d{2})\b/g, order: "named" }
  ] as const;

  for (const { regex, order } of patterns) {
    for (const match of normalized.matchAll(regex)) {
      if (order === "ymd") {
        const [, year, month, day] = match;
        const date = validDate(Number(year), Number(month), Number(day));
        if (date) return date;
      } else if (order === "dmy") {
        const [, day, month, year] = match;
        const date = validDate(Number(year), Number(month), Number(day));
        if (date) return date;
      } else {
        const [, day, monthName, year] = match;
        const month = monthNumbers[monthName.replace(/\.$/, "")];
        const date = month ? validDate(Number(year), month, Number(day)) : null;
        if (date) return date;
      }
    }
  }
  return null;
}

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
  const labeledLines = lines.filter((line) => /\b(rp|idr|total|amount|nominal|jumlah|payment|paid)\b/i.test(line));
  const candidates = labeledLines.length ? labeledLines : lines;
  const amounts = candidates.flatMap((line) => {
    const matches = line.match(/(?:rp|idr)?\s*\d[\d.,\s]{0,20}/gi) ?? [];
    return matches.map(normalizedAmount).filter((amount): amount is number => amount !== null);
  });
  return [...new Set(amounts)];
}

export function formatJakartaDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isReceiptDateValid(receiptDate: string, orderDate: string, today: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(receiptDate);
  if (!match || !validDate(Number(match[1]), Number(match[2]), Number(match[3]))) return false;
  return receiptDate >= orderDate && receiptDate <= today;
}
