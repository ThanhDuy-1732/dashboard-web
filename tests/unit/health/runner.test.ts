import { describe, expect, it, vi } from 'vitest';
import type { AppRow, AppStatusRow, SettingsRow } from '@/lib/db/types';
import { runHealthChecks, type HealthDeps } from '@/lib/health/runner';
import type { CheckResult } from '@/lib/health/types';

const now = new Date('2026-11-18T00:00:00.000Z');

function app(overrides: Partial<AppRow> = {}): AppRow {
  return {
    id: 'app-1',
    slug: 'blog',
    name: 'Blog',
    description: null,
    url: 'https://blog.example.com',
    icon_url: null,
    supabase_ref: 'abcdefghijklmnopqrst',
    supabase_health_url: null,
    sort_order: 0,
    is_visible: true,
    monitor_app: true,
    monitor_supabase: true,
    monitoring_paused_until: null,
    expected_status: 200,
    timeout_ms: 5000,
    health_method: 'GET',
    health_headers: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function settings(overrides: Partial<SettingsRow> = {}): SettingsRow {
  return {
    id: 1,
    telegram_chat_id: null,
    email_recipients: [],
    failure_threshold: 3,
    slow_threshold_ms: 2000,
    alerts_enabled: true,
    notify_recovery: true,
    repeat_reminder_minutes: 0,
    health_run_locked_at: null,
    health_run_token: null,
    last_cleanup_at: null,
    updated_at: now,
    ...overrides,
  };
}

function check(ok: boolean): CheckResult {
  return { ok, statusCode: ok ? 200 : 503, latencyMs: 100, error: ok ? null : 'HTTP 503' };
}

function makeDeps(overrides: Partial<HealthDeps> = {}): HealthDeps {
  const statuses = new Map<string, AppStatusRow>();

  const base: HealthDeps = {
    listAppsToCheck: async () => [app()],
    getStatuses: async () => Array.from(statuses.values()),
    insertCheck: vi.fn(async () => {}),
    upsertStatus: vi.fn(async (row) => {
      statuses.set(`${row.app_id}:${row.target}`, row);
    }),
    openIncident: vi.fn(async () => {}),
    closeOpenIncident: vi.fn(async () => {}),
    getSettings: async () => settings(),
    notify: vi.fn(async () => {}),
    now: () => now,
    ping: vi.fn(async () => check(true)),
  };

  return { ...base, ...overrides };
}

describe('runHealthChecks', () => {
  it('skips a paused app', async () => {
    const ping = vi.fn(async () => check(true));
    const deps = makeDeps({
      listAppsToCheck: async () => [
        app({ monitoring_paused_until: new Date('2026-11-18T00:30:00.000Z') }),
      ],
      ping,
    });

    const result = await runHealthChecks(deps);

    expect(result.checked).toBe(0);
    expect(ping).not.toHaveBeenCalled();
  });

  it('checks both targets for an app', async () => {
    const ping = vi.fn(async () => check(true));
    const deps = makeDeps({ ping });

    const result = await runHealthChecks(deps);

    expect(result.checked).toBe(2);
    expect(ping).toHaveBeenCalledTimes(2);
    expect(deps.insertCheck).toHaveBeenCalledTimes(2);
    expect(deps.upsertStatus).toHaveBeenCalledTimes(2);
  });

  it('persists a timeout and finishes', async () => {
    const deps = makeDeps({
      listAppsToCheck: async () => [app({ monitor_supabase: false })],
      ping: async () => ({ ok: false, statusCode: null, latencyMs: 10, error: 'timeout' }),
    });

    const result = await runHealthChecks(deps);

    expect(result.checked).toBe(1);
    expect(deps.insertCheck).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: 'timeout' }),
    );
  });

  it('sends one alert and reconciles the incident for a sustained outage', async () => {
    const deps = makeDeps({
      listAppsToCheck: async () => [app({ monitor_supabase: false })],
      ping: async () => check(false),
    });

    await runHealthChecks(deps);
    await runHealthChecks(deps);
    await runHealthChecks(deps);
    await runHealthChecks(deps);

    expect(deps.openIncident).toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'down', target: 'app' }),
    );
  });

  it('retries a down alert that failed to deliver', async () => {
    let sends = 0;
    const deps = makeDeps({
      listAppsToCheck: async () => [app({ monitor_supabase: false })],
      ping: async () => check(false),
      notify: vi.fn(async () => {
        sends += 1;
        if (sends === 1) throw new Error('telegram down');
      }),
    });

    await runHealthChecks(deps);
    await runHealthChecks(deps);
    await runHealthChecks(deps);
    await runHealthChecks(deps);
    await runHealthChecks(deps);

    expect(sends).toBe(2);
  });

  it('sends a recovery alert with downtime', async () => {
    const previousStatus: AppStatusRow = {
      app_id: 'app-1',
      target: 'app',
      state: 'down',
      consecutive_failures: 3,
      consecutive_slow: 0,
      last_check_at: new Date(now.getTime() - 5 * 60_000),
      last_ok_at: null,
      last_down_at: new Date(now.getTime() - 5 * 60_000),
      last_down_alert_at: new Date(now.getTime() - 5 * 60_000),
      last_slow_alert_at: null,
    };
    const deps = makeDeps({
      listAppsToCheck: async () => [app({ monitor_supabase: false })],
      getStatuses: async () => [previousStatus],
      ping: async () => check(true),
    });

    await runHealthChecks(deps);

    expect(deps.closeOpenIncident).toHaveBeenCalledWith('app-1', 'app', now);
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'recovered', downtimeMs: 5 * 60_000 }),
    );
  });
});
