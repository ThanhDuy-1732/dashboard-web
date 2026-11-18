import { describe, expect, it } from 'vitest';
import { evaluateCheck } from '@/lib/health/evaluate';
import type { AppStatusRow } from '@/lib/db/types';
import type { CheckResult } from '@/lib/health/types';

const now = new Date('2026-11-18T00:00:00.000Z');

function previous(overrides: Partial<AppStatusRow> = {}): AppStatusRow {
  return {
    app_id: 'app-1',
    target: 'app',
    state: 'up',
    consecutive_failures: 0,
    consecutive_slow: 0,
    last_check_at: null,
    last_ok_at: null,
    last_down_at: null,
    last_down_alert_at: null,
    last_slow_alert_at: null,
    ...overrides,
  };
}

function check(ok: boolean, latencyMs = 100): CheckResult {
  return { ok, statusCode: ok ? 200 : 503, latencyMs, error: ok ? null : 'HTTP 503' };
}

function settings(overrides: Record<string, unknown> = {}) {
  return {
    failure_threshold: 3,
    slow_threshold_ms: 2000,
    notify_recovery: true,
    repeat_reminder_minutes: 0,
    alerts_enabled: true,
    ...overrides,
  };
}

describe('evaluateCheck', () => {
  it('counts a first failure without alerting', () => {
    const result = evaluateCheck({ previous: null, check: check(false), settings: settings(), now });

    expect(result.status.state).toBe('unknown');
    expect(result.status.consecutive_failures).toBe(1);
    expect(result.alert).toBeNull();
    expect(result.incident).toBeNull();
  });

  it('stays up below the failure threshold', () => {
    const result = evaluateCheck({
      previous: previous({ consecutive_failures: 1 }),
      check: check(false),
      settings: settings(),
      now,
    });

    expect(result.status.state).toBe('up');
    expect(result.status.consecutive_failures).toBe(2);
    expect(result.alert).toBeNull();
  });

  it('goes down and opens an incident on the third failure', () => {
    const result = evaluateCheck({
      previous: previous({ consecutive_failures: 2 }),
      check: check(false),
      settings: settings(),
      now,
    });

    expect(result.status.state).toBe('down');
    expect(result.status.last_down_at).toBe(now);
    expect(result.incident).toBe('open');
    expect(result.alert).toBe('down');
  });

  it('does not alert again while already down when reminders are off', () => {
    const result = evaluateCheck({
      previous: previous({ state: 'down', consecutive_failures: 3 }),
      check: check(false),
      settings: settings({ repeat_reminder_minutes: 0 }),
      now,
    });

    expect(result.incident).toBeNull();
    expect(result.alert).toBeNull();
    expect(result.status.consecutive_failures).toBe(4);
  });

  it('recovers and closes the incident', () => {
    const result = evaluateCheck({
      previous: previous({ state: 'down', consecutive_failures: 3, last_down_at: now }),
      check: check(true),
      settings: settings(),
      now: new Date(now.getTime() + 5 * 60_000),
    });

    expect(result.status.state).toBe('up');
    expect(result.incident).toBe('close');
    expect(result.alert).toBe('recovered');
    expect(result.status.last_ok_at).toEqual(new Date(now.getTime() + 5 * 60_000));
  });

  it('can close an incident without a recovery alert', () => {
    const result = evaluateCheck({
      previous: previous({ state: 'down', consecutive_failures: 3 }),
      check: check(true),
      settings: settings({ notify_recovery: false }),
      now,
    });

    expect(result.incident).toBe('close');
    expect(result.alert).toBeNull();
  });

  it('alerts on the third slow check and throttles for an hour', () => {
    const first = evaluateCheck({
      previous: previous({ consecutive_slow: 2 }),
      check: check(true, 2500),
      settings: settings(),
      now,
    });

    expect(first.alert).toBe('slow');
    expect(first.status.consecutive_slow).toBe(3);
    expect(first.status.last_slow_alert_at).toBe(now);

    const throttled = evaluateCheck({
      previous: previous({
        consecutive_slow: 3,
        last_slow_alert_at: now,
      }),
      check: check(true, 2500),
      settings: settings(),
      now: new Date(now.getTime() + 30 * 60_000),
    });

    expect(throttled.alert).toBeNull();

    const again = evaluateCheck({
      previous: previous({
        consecutive_slow: 4,
        last_slow_alert_at: new Date(now.getTime() - 61 * 60_000),
      }),
      check: check(true, 2500),
      settings: settings(),
      now,
    });

    expect(again.alert).toBe('slow');
  });

  it('reminds while down when configured', () => {
    const result = evaluateCheck({
      previous: previous({
        state: 'down',
        consecutive_failures: 5,
        last_down_alert_at: new Date(now.getTime() - 61 * 60_000),
      }),
      check: check(false),
      settings: settings({ repeat_reminder_minutes: 60 }),
      now,
    });

    expect(result.alert).toBe('down-reminder');
  });

  it('resets the slow streak on failure', () => {
    const result = evaluateCheck({
      previous: previous({ consecutive_slow: 2 }),
      check: check(false),
      settings: settings(),
      now,
    });

    expect(result.status.consecutive_slow).toBe(0);
  });

  it('suppresses alerts when alerts are disabled', () => {
    const result = evaluateCheck({
      previous: previous({ consecutive_failures: 2 }),
      check: check(false),
      settings: settings({ alerts_enabled: false }),
      now,
    });

    expect(result.status.state).toBe('down');
    expect(result.incident).toBe('open');
    expect(result.alert).toBeNull();
  });
});
