import type { AdminAppView } from '@/lib/admin/overview';
import type { RecentIncidentRow } from '@/lib/db/checks';

export function makeAdminApp(
  overrides: Partial<AdminAppView> = {},
): AdminAppView {
  return {
    id: 'app-alpha',
    name: 'Alpha',
    slug: 'alpha',
    iconUrl: null,
    isVisible: true,
    paused: false,
    worstState: 'down',
    app: {
      state: 'down',
      latencyMs: 420,
      lastCheckAt: '2026-11-23T11:55:00.000Z',
      consecutiveFailures: 3,
      lastError: 'Timeout',
    },
    supabase: {
      state: 'up',
      latencyMs: 180,
      lastCheckAt: '2026-11-23T11:55:00.000Z',
      consecutiveFailures: 0,
      lastError: null,
    },
    ...overrides,
  };
}

export const recentIncident: RecentIncidentRow = {
  id: 1,
  app_id: 'app-alpha',
  app_name: 'Alpha',
  app_slug: 'alpha',
  app_paused: true,
  target: 'app',
  started_at: new Date('2026-11-21T12:00:00.000Z'),
  resolved_at: null,
  first_error: 'Timeout',
};
