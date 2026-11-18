import { describe, expect, it } from 'vitest';
import {
  averageLatency,
  clickCountsByApp,
  dailyClickSeries,
  dayKey,
  summarizeClicks,
  uptimePercent,
} from '@/lib/analytics/stats';
import type { CheckRow, ClickEventRow } from '@/lib/db/types';

const tz = 'Asia/Ho_Chi_Minh';
const now = new Date('2026-11-18T10:00:00.000Z');

function click(iso: string, ip = 'hash-a', appId = 'app-1'): ClickEventRow {
  return {
    id: 1,
    app_id: appId,
    clicked_at: new Date(iso),
    referrer: null,
    user_agent: null,
    ip_hash: ip,
    country: null,
  };
}

function check(ok: boolean, latency = 100): CheckRow {
  return {
    id: 1,
    app_id: 'app-1',
    target: 'app',
    checked_at: new Date('2026-11-18T09:00:00.000Z'),
    ok,
    status_code: ok ? 200 : 503,
    latency_ms: latency,
    error: null,
  };
}

describe('dayKey', () => {
  it('uses the Vietnam day boundary', () => {
    expect(dayKey(new Date('2026-11-17T16:59:00.000Z'), tz)).toBe('2026-11-17');
    expect(dayKey(new Date('2026-11-17T17:00:00.000Z'), tz)).toBe('2026-11-18');
  });
});

describe('summarizeClicks', () => {
  it('counts today, 7 days, 30 days and unique visitors', () => {
    const events = [
      click('2026-11-18T05:00:00.000Z', 'hash-a'),
      click('2026-11-12T05:00:00.000Z', 'hash-b'),
      click('2026-10-20T05:00:00.000Z', 'hash-c'),
      click('2026-10-01T05:00:00.000Z', 'hash-d'),
    ];

    expect(summarizeClicks(events, now, tz)).toEqual({
      today: 1,
      last7: 2,
      last30: 3,
      unique30: 3,
    });
  });
});

describe('dailyClickSeries', () => {
  it('fills zero days and returns the requested window', () => {
    const events = [
      click('2026-11-18T05:00:00.000Z'),
      click('2026-11-16T05:00:00.000Z'),
      click('2026-11-16T06:00:00.000Z'),
    ];

    expect(dailyClickSeries(events, 3, now, tz)).toEqual([
      { day: '2026-11-16', count: 2 },
      { day: '2026-11-17', count: 0 },
      { day: '2026-11-18', count: 1 },
    ]);
  });
});

describe('clickCountsByApp', () => {
  it('groups clicks per app', () => {
    const events = [
      click('2026-11-18T05:00:00.000Z', 'a', 'app-1'),
      click('2026-11-18T06:00:00.000Z', 'b', 'app-1'),
      click('2026-11-18T07:00:00.000Z', 'c', 'app-2'),
    ];

    expect(clickCountsByApp(events)).toEqual([
      { appId: 'app-1', count: 2 },
      { appId: 'app-2', count: 1 },
    ]);
  });
});

describe('uptimePercent', () => {
  it('computes a percentage and handles no data', () => {
    expect(uptimePercent([check(true), check(false)])).toBe(50);
    expect(uptimePercent([])).toBeNull();
  });
});

describe('averageLatency', () => {
  it('rounds the average and handles no data', () => {
    expect(averageLatency([check(true, 100), check(true, 102)])).toBe(101);
    expect(averageLatency([])).toBeNull();
  });
});
