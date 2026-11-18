import type { CheckRow, ClickEventRow } from '@/lib/db/types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

function windowKeys(days: number, now: Date, tz: string): Set<string> {
  return new Set(
    Array.from({ length: days }, (_, index) =>
      dayKey(new Date(now.getTime() - index * DAY_MS), tz),
    ),
  );
}

export function summarizeClicks(
  events: ClickEventRow[],
  now: Date,
  tz: string,
): { today: number; last7: number; last30: number; unique30: number } {
  const todayKey = dayKey(now, tz);
  const keys7 = windowKeys(7, now, tz);
  const keys30 = windowKeys(30, now, tz);
  const unique = new Set<string>();

  let today = 0;
  let last7 = 0;
  let last30 = 0;

  for (const event of events) {
    const key = dayKey(new Date(event.clicked_at), tz);
    const in30 = keys30.has(key);

    if (key === todayKey) today += 1;
    if (keys7.has(key)) last7 += 1;
    if (in30) {
      last30 += 1;
      unique.add(event.ip_hash);
    }
  }

  return { today, last7, last30, unique30: unique.size };
}

export function dailyClickSeries(
  events: ClickEventRow[],
  days: number,
  now: Date,
  tz: string,
): { day: string; count: number }[] {
  const keys = Array.from({ length: days }, (_, index) =>
    dayKey(new Date(now.getTime() - (days - 1 - index) * DAY_MS), tz),
  );
  const counts = new Map(keys.map((key) => [key, 0]));

  for (const event of events) {
    const key = dayKey(new Date(event.clicked_at), tz);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return keys.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

export function clickCountsByApp(
  events: ClickEventRow[],
): { appId: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const event of events) {
    counts.set(event.app_id, (counts.get(event.app_id) ?? 0) + 1);
  }

  return Array.from(counts, ([appId, count]) => ({ appId, count }));
}

export function uptimePercent(checks: CheckRow[]): number | null {
  if (checks.length === 0) return null;
  const ok = checks.filter((check) => check.ok).length;
  return Math.round((ok / checks.length) * 1000) / 10;
}

export function averageLatency(checks: CheckRow[]): number | null {
  if (checks.length === 0) return null;
  const total = checks.reduce((sum, check) => sum + check.latency_ms, 0);
  return Math.round(total / checks.length);
}
