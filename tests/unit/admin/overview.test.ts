import { describe, expect, it } from 'vitest';
import type {
  AppRow,
  AppStatusRow,
  CheckRow,
} from '@/lib/db/types';
import { buildAdminOverview } from '@/lib/admin/overview';

const now = new Date('2026-11-18T10:00:00.000Z');

function makeApp(overrides: Partial<AppRow> = {}): AppRow {
  return {
    id: 'app-1',
    slug: 'app-1',
    name: 'App 1',
    description: null,
    url: 'https://app-1.example.com',
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

function makeStatus(overrides: Partial<AppStatusRow> = {}): AppStatusRow {
  return {
    app_id: 'app-1',
    target: 'app',
    state: 'up',
    consecutive_failures: 0,
    consecutive_slow: 0,
    last_check_at: new Date('2026-11-18T09:55:00.000Z'),
    last_ok_at: new Date('2026-11-18T09:55:00.000Z'),
    last_down_at: null,
    last_down_alert_at: null,
    last_slow_alert_at: null,
    ...overrides,
  };
}

function makeCheck(overrides: Partial<CheckRow> = {}): CheckRow {
  return {
    id: 1,
    app_id: 'app-1',
    target: 'app',
    checked_at: new Date('2026-11-18T09:55:00.000Z'),
    ok: true,
    status_code: 200,
    latency_ms: 120,
    error: null,
    ...overrides,
  };
}

describe('buildAdminOverview', () => {
  it('marks paused apps and excludes them from failure counts, attention and stale', () => {
    const app = makeApp({
      monitoring_paused_until: new Date('2026-11-18T10:30:00.000Z'),
    });
    const status = makeStatus({
      state: 'down',
      consecutive_failures: 4,
      last_check_at: new Date('2026-11-18T09:59:00.000Z'),
    });

    const model = buildAdminOverview(
      [app],
      [status],
      [makeCheck({ ok: false, error: 'server failed' })],
      now,
    );

    expect(model.apps[0]).toMatchObject({
      paused: true,
      worstState: 'paused',
      app: { state: 'down' },
    });
    expect(model.counts.apps.paused).toBe(1);
    expect(model.counts.targets.down).toBe(0);
    expect(model.attention).toEqual([]);
    expect(model.lastCheckAt).toBeNull();
    expect(model.isStale).toBe(false);
    expect(model.allPaused).toBe(true);
  });

  it('distinguishes off targets from unknown targets', () => {
    const partialMonitoringApp = makeApp({
      id: 'partial',
      slug: 'partial',
      name: 'Partial',
      monitor_supabase: false,
    });
    const unmonitoredApp = makeApp({
      id: 'off',
      slug: 'off',
      name: 'Off',
      monitor_app: false,
      monitor_supabase: true,
      supabase_ref: null,
    });

    const model = buildAdminOverview(
      [partialMonitoringApp, unmonitoredApp],
      [],
      [],
      now,
    );

    expect(model.apps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'partial',
          app: expect.objectContaining({ state: 'unknown' }),
          supabase: null,
          worstState: 'unknown',
        }),
        expect.objectContaining({
          id: 'off',
          app: null,
          supabase: null,
          worstState: 'off',
        }),
      ]),
    );
    expect(model.counts.apps).toMatchObject({ unknown: 1, off: 1 });
    expect(model.counts.targets).toEqual({
      up: 0,
      down: 0,
      unknown: 1,
      off: 3,
    });
    expect(model.counts.monitoredTargets).toBe(1);
  });

  it('uses worst target state for app counts and sorts severity first', () => {
    const apps = [
      makeApp({ id: 'down-z', name: 'Zeta', monitor_supabase: false }),
      makeApp({ id: 'down-a', name: 'Alpha', monitor_supabase: false }),
      makeApp({ id: 'down-failures', name: 'Bravo', monitor_supabase: false }),
      makeApp({ id: 'unknown', name: 'Charlie', monitor_supabase: false }),
      makeApp({ id: 'up', name: 'Delta', monitor_supabase: false }),
      makeApp({
        id: 'off',
        name: 'Echo',
        monitor_app: false,
        monitor_supabase: false,
        supabase_ref: null,
      }),
      makeApp({
        id: 'paused',
        name: 'Foxtrot',
        monitor_supabase: false,
        monitoring_paused_until: new Date('2026-11-18T10:30:00.000Z'),
      }),
    ];
    const statuses = [
      makeStatus({
        app_id: 'down-z',
        state: 'down',
        consecutive_failures: 2,
      }),
      makeStatus({
        app_id: 'down-a',
        state: 'down',
        consecutive_failures: 2,
      }),
      makeStatus({
        app_id: 'down-failures',
        state: 'down',
        consecutive_failures: 8,
      }),
      makeStatus({ app_id: 'up', state: 'up' }),
      makeStatus({
        app_id: 'paused',
        state: 'down',
        consecutive_failures: 5,
      }),
    ];
    const longError = 'x'.repeat(130);
    const checks = [
      makeCheck({
        app_id: 'down-z',
        id: 1,
        checked_at: new Date('2026-11-18T09:50:00.000Z'),
        latency_ms: 900,
        error: 'older error',
        ok: false,
      }),
      makeCheck({
        app_id: 'down-z',
        id: 2,
        checked_at: new Date('2026-11-18T09:58:00.000Z'),
        latency_ms: 1100,
        error: longError,
        ok: false,
      }),
    ];

    const model = buildAdminOverview(apps, statuses, checks, now);

    expect(model.apps.map((app) => app.id)).toEqual([
      'down-a',
      'down-failures',
      'down-z',
      'unknown',
      'up',
      'off',
      'paused',
    ]);
    expect(model.apps.find((app) => app.id === 'down-z')?.app).toEqual({
      state: 'down',
      latencyMs: 1100,
      lastCheckAt: '2026-11-18T09:55:00.000Z',
      consecutiveFailures: 2,
      lastError: longError.slice(0, 120),
    });
    expect(model.counts.apps).toEqual({
      up: 1,
      down: 3,
      unknown: 1,
      off: 1,
      paused: 1,
    });
    expect(model.attention.map(({ appId }) => appId)).toEqual([
      'down-failures',
      'down-a',
      'down-z',
      'unknown',
    ]);
    expect(model.attention[0].state).toBe('down');
    expect(model.attention[3].state).toBe('unknown');
  });

  it('preserves unknown attention state when consecutive failures are nonzero', () => {
    const app = makeApp({ monitor_supabase: false });
    const status = makeStatus({
      state: 'unknown',
      consecutive_failures: 1,
    });

    const model = buildAdminOverview([app], [status], [], now);

    expect(model.attention).toEqual([
      expect.objectContaining({
        state: 'unknown',
        consecutiveFailures: 1,
      }),
    ]);
  });

  it('includes hidden apps and counts only monitored targets', () => {
    const hiddenApp = makeApp({
      id: 'hidden',
      slug: 'hidden',
      name: 'Hidden',
      is_visible: false,
      monitor_supabase: false,
    });
    const pausedApp = makeApp({
      id: 'paused',
      slug: 'paused',
      name: 'Paused',
      monitoring_paused_until: new Date('2026-11-18T10:30:00.000Z'),
    });
    const model = buildAdminOverview(
      [hiddenApp, pausedApp],
      [
        makeStatus({ app_id: 'hidden', state: 'up' }),
        makeStatus({
          app_id: 'paused',
          state: 'down',
          target: 'app',
          consecutive_failures: 3,
        }),
        makeStatus({ app_id: 'paused', state: 'up', target: 'supabase' }),
      ],
      [],
      now,
    );

    expect(model.apps.map(({ id }) => id)).toContain('hidden');
    expect(model.apps.find(({ id }) => id === 'hidden')?.isVisible).toBe(false);
    expect(model.counts.apps.up).toBe(1);
    expect(model.counts.apps.paused).toBe(1);
    expect(model.counts.targets).toEqual({
      up: 1,
      down: 0,
      unknown: 0,
      off: 1,
    });
    expect(model.counts.monitoredTargets).toBe(1);
  });

  it('computes stale minutes from non-paused apps only', () => {
    const pausedApp = makeApp({
      id: 'paused',
      monitoring_paused_until: new Date('2026-11-18T10:30:00.000Z'),
    });
    const activeApp = makeApp({ id: 'active' });
    const pausedStatus = makeStatus({
      app_id: 'paused',
      last_check_at: new Date('2026-11-18T09:59:00.000Z'),
    });
    const activeStatus = makeStatus({
      app_id: 'active',
      last_check_at: new Date('2026-11-18T09:49:00.000Z'),
    });

    const staleModel = buildAdminOverview(
      [pausedApp, activeApp],
      [pausedStatus, activeStatus],
      [],
      now,
    );

    expect(staleModel.lastCheckAt).toBe('2026-11-18T09:49:00.000Z');
    expect(staleModel.staleMinutes).toBe(11);
    expect(staleModel.isStale).toBe(true);

    const freshModel = buildAdminOverview(
      [pausedApp, activeApp],
      [
        pausedStatus,
        makeStatus({
          app_id: 'active',
          last_check_at: new Date('2026-11-18T09:50:00.000Z'),
        }),
      ],
      [],
      now,
    );

    expect(freshModel.staleMinutes).toBe(10);
    expect(freshModel.isStale).toBe(false);
  });

  it('returns an empty model for no apps', () => {
    expect(buildAdminOverview([], [], [], now)).toEqual({
      counts: {
        apps: { up: 0, down: 0, unknown: 0, off: 0, paused: 0 },
        targets: { up: 0, down: 0, unknown: 0, off: 0 },
        monitoredTargets: 0,
      },
      attention: [],
      apps: [],
      lastCheckAt: null,
      staleMinutes: null,
      isStale: false,
      allPaused: false,
    });
  });
});
