import { describe, expect, it } from 'vitest';
import { targetsForApp } from '@/lib/health/targets';
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
    supabase_ref: 'abcdefghijklmnopqrst',
    supabase_health_url: null,
    sort_order: 0,
    is_visible: true,
    monitor_app: true,
    monitor_supabase: true,
    monitoring_paused_until: null,
    expected_status: 200,
    timeout_ms: 5000,
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
      },
      {
        appId: 'app-1',
        slug: 'blog',
        name: 'Blog',
        target: 'supabase',
        url: 'https://abcdefghijklmnopqrst.supabase.co/auth/v1/health',
        expectedStatus: 200,
        timeoutMs: 5000,
      },
    ]);
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

  it('skips disabled targets and Supabase without a ref', () => {
    expect(targetsForApp(app({ monitor_app: false, monitor_supabase: false }), now)).toEqual([]);
    expect(targetsForApp(app({ monitor_supabase: true, supabase_ref: null }), now)).toHaveLength(1);
  });
});
