import type { AppRow } from '@/lib/db/types';
import type { HealthTarget } from '@/lib/health/types';

function isPaused(app: AppRow, now: Date): boolean {
  return Boolean(
    app.monitoring_paused_until &&
      new Date(app.monitoring_paused_until).getTime() > now.getTime(),
  );
}

export function targetsForApp(app: AppRow, now: Date): HealthTarget[] {
  if (isPaused(app, now)) return [];

  const base = {
    appId: app.id,
    slug: app.slug,
    name: app.name,
    expectedStatus: app.expected_status,
    timeoutMs: app.timeout_ms,
  };

  const targets: HealthTarget[] = [];

  if (app.monitor_app) {
    targets.push({ ...base, target: 'app', url: app.url });
  }

  if (app.monitor_supabase) {
    const ref = app.supabase_ref?.trim();
    const url =
      app.supabase_health_url?.trim() ||
      (ref ? `https://${ref}.supabase.co/auth/v1/health` : null);

    if (url) {
      targets.push({ ...base, target: 'supabase', url });
    }
  }

  return targets;
}
