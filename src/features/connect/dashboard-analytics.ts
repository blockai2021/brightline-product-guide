import type { Locale } from "./domain";

export type ScanRange = 7 | 30 | 90;
export type DailyScans = { date: string; scans: number };
// Stable simulated baseline, independent of cumulative repository visits.
export const DEMO_SCAN_END = "2026-11-14";
const DAY_MS = 86_400_000;

export function shiftScanDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export const demoDailyScans: DailyScans[] = Array.from({ length: 180 }, (_, index) => ({
  date: shiftScanDate(DEMO_SCAN_END, index - 179),
  scans: 25 + Math.floor(index / 3) + ((index * 17 + 11) % 29),
}));

export function scanWindow(data: readonly DailyScans[], days: ScanRange, endDate: string) {
  const byDate = new Map(data.map((row) => [row.date, row.scans]));
  const windowEnding = (end: string) =>
    Array.from({ length: days }, (_, index) => {
      const date = shiftScanDate(end, index - days + 1);
      return { date, scans: byDate.get(date) ?? 0 };
    });
  const current = windowEnding(endDate);
  const previous = windowEnding(shiftScanDate(endDate, -days));
  const total = current.reduce((sum, row) => sum + row.scans, 0);
  const previousTotal = previous.reduce((sum, row) => sum + row.scans, 0);
  return {
    current,
    previous,
    total,
    previousTotal,
    changePercent: previousTotal === 0 ? null : ((total - previousTotal) / previousTotal) * 100,
  };
}

export function scanTicks(rows: readonly DailyScans[], compact = false) {
  if (rows.length === 0) return [];
  const step = rows.length <= 7 ? 1 : rows.length <= 30 ? 5 : 15;
  const indices = compact
    ? [0, Math.floor((rows.length - 1) / 2), rows.length - 1]
    : [
        ...Array.from({ length: Math.ceil((rows.length - 1) / step) }, (_, i) => i * step),
        rows.length - 1,
      ];
  return [...new Set(indices)].flatMap((index) => {
    const row = rows[index];
    return row ? [{ ...row, index, position: index / Math.max(1, rows.length - 1) }] : [];
  });
}

export function scanDateLabel(date: string, language: Locale) {
  return new Intl.DateTimeFormat(
    language === "zh" ? "zh-CN" : language === "de" ? "de-DE" : "en-GB",
    {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    },
  ).format(new Date(`${date}T00:00:00Z`));
}
