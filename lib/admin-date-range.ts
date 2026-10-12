export const adminDatePeriods = ["all", "today", "week", "month", "custom"] as const;

export type AdminDatePeriod = typeof adminDatePeriods[number];

export type AdminDateRange = {
  from: string;
  to: string;
};

type AdminDateRangeResult =
  | { range: AdminDateRange | null; error: null }
  | { range: null; error: string };

function formatJakartaDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = new Map(parts.map(({ type, value }) => [type, value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function toJakartaStart(date: string) {
  return new Date(`${date}T00:00:00+07:00`).toISOString();
}

export function resolveAdminDateRange(
  period: AdminDatePeriod,
  fromDate: string,
  toDate: string,
  now = new Date()
): AdminDateRangeResult {
  if (period === "all") return { range: null, error: null };

  let startDate: string;
  let endDate: string;
  if (period === "custom") {
    if (!isValidDate(fromDate) || !isValidDate(toDate)) {
      return { range: null, error: "Pilih tanggal mulai dan tanggal akhir yang valid." };
    }
    if (fromDate > toDate) {
      return { range: null, error: "Tanggal mulai tidak boleh setelah tanggal akhir." };
    }
    startDate = fromDate;
    endDate = toDate;
  } else {
    const today = formatJakartaDate(now);
    endDate = today;
    if (period === "today") {
      startDate = today;
    } else if (period === "week") {
      const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
      startDate = shiftDate(today, -((weekday + 6) % 7));
    } else {
      startDate = `${today.slice(0, 7)}-01`;
    }
  }

  return {
    range: {
      from: toJakartaStart(startDate),
      to: toJakartaStart(shiftDate(endDate, 1))
    },
    error: null
  };
}
