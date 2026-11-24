import { describe, expect, it } from 'vitest';
import { isMonitoringPaused, targetsForApp } from '@/lib/health/targets';
import type { AppRow } from '@/lib/db/types';

const now = new Date('2026-11-18T00:00:00.000Z');

function app(overrides: Partial<AppRow> = {}): AppRow {
  return {
    id: 'app-1',
    slug: 'blog',
    name: 'Blog',
    description: null,
    url: 'https://blog.example.com',
    icon_url: null,
    preview_url: null,
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

describe('targetsForApp', () => {
  it('builds app and Supabase targets', () => {
    expect(targetsForApp(app(), now)).toEqual([
      {
        appId: 'app-1',
        slug: 'blog',
        name: 'Blog',
        target: 'app',
        url: 'https://blog.example.com',
        expectedStatus: 200,
        timeoutMs: 5000,
        method: 'GET',
        headers: {},
      },
      {
        appId: 'app-1',
        slug: 'blog',
        name: 'Blog',
        target: 'supabase',
        url: 'https://abcdefghijklmnopqrst.supabase.co/auth/v1/health',
        expectedStatus: 200,
        timeoutMs: 5000,
        method: 'GET',
        headers: {},
      },
    ]);
  });

  it('keeps the expected status for the app but expects 200 from Supabase', () => {
    const [appTarget, supabaseTarget] = targetsForApp(
      app({ expected_status: 301 }),
      now,
    );

    expect(appTarget.expectedStatus).toBe(301);
    expect(supabaseTarget.expectedStatus).toBe(200);
  });

  it('prefers an explicit Supabase health URL', () => {
    const targets = targetsForApp(
      app({ supabase_health_url: 'https://custom.example.com/health' }),
      now,
    );

    expect(targets[1].url).toBe('https://custom.example.com/health');
  });

  it('skips a paused app', () => {
    expect(
      targetsForApp(
        app({ monitoring_paused_until: new Date('2026-11-18T00:30:00.000Z') }),
        now,
      ),
    ).toEqual([]);
  });

  it('resumes when the pause has expired', () => {
    expect(
      targetsForApp(
        app({ monitoring_paused_until: new Date('2026-11-17T23:00:00.000Z') }),
        now,
      ),
    ).toHaveLength(2);
  });

  it('carries custom method and headers into targets', () => {
    const targets = targetsForApp(
      app({
        health_method: 'POST',
        health_headers: { authorization: 'Bearer token' },
        url: 'https://api.example.com',
      }),
      now,
    );

    expect(targets[0].method).toBe('POST');
    expect(targets[0].headers).toEqual({ authorization: 'Bearer token' });
  });

  it('reports whether monitoring is currently paused', () => {
    expect(
      isMonitoringPaused(
        app({ monitoring_paused_until: new Date('2026-11-18T00:30:00.000Z') }),
        now,
      ),
    ).toBe(true);
    expect(
      isMonitoringPaused(
        app({ monitoring_paused_until: new Date('2026-11-17T23:00:00.000Z') }),
        now,
      ),
    ).toBe(false);
    expect(isMonitoringPaused(app(), now)).toBe(false);
  });

  it('skips disabled targets and Supabase without a ref', () => {
    expect(targetsForApp(app({ monitor_app: false, monitor_supabase: false }), now)).toEqual([]);
    expect(targetsForApp(app({ monitor_supabase: true, supabase_ref: null }), now)).toHaveLength(1);
  });
});
