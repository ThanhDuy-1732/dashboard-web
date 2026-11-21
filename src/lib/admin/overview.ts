import type {
  AppRow,
  AppStatusRow,
  CheckRow,
  Target,
} from '@/lib/db/types';
import { isMonitoringPaused } from '@/lib/health/targets';

export type TargetDisplayState = 'up' | 'down' | 'unknown' | 'off';
export type AppDisplayState = TargetDisplayState | 'paused';

export type AdminTargetView = {
  state: TargetDisplayState;
  latencyMs: number | null;
  lastCheckAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
};

export type AdminAppView = {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  isVisible: boolean;
  paused: boolean;
  worstState: AppDisplayState;
  app: AdminTargetView | null;
  supabase: AdminTargetView | null;
};

export type AdminAttentionItem = {
  appId: string;
  appName: string;
  target: Target;
  state: 'down' | 'unknown';
  consecutiveFailures: number;
  lastCheckAt: string | null;
  lastError: string | null;
};

export type AdminOverviewCounts = {
  apps: Record<AppDisplayState, number>;
  targets: Record<TargetDisplayState, number>;
  monitoredTargets: number;
};

export type AdminOverviewModel = {
  counts: AdminOverviewCounts;
  attention: AdminAttentionItem[];
  apps: AdminAppView[];
  lastCheckAt: string | null;
  staleMinutes: number | null;
  isStale: boolean;
  allPaused: boolean;
};

const appStateSeverity: Record<AppDisplayState, number> = {
  down: 0,
  unknown: 1,
  up: 2,
  off: 3,
  paused: 4,
};

const targetStateSeverity: Record<TargetDisplayState, number> = {
  down: 0,
  unknown: 1,
  up: 2,
  off: 3,
};

const targets: Target[] = ['app', 'supabase'];

function targetIsConfigured(app: AppRow, target: Target): boolean {
  if (target === 'app') return app.monitor_app;
  return Boolean(
    app.monitor_supabase &&
      (app.supabase_health_url?.trim() || app.supabase_ref?.trim()),
  );
}

function targetView(
  app: AppRow,
  target: Target,
  statuses: Map<string, AppStatusRow>,
  checks: Map<string, CheckRow>,
): AdminTargetView | null {
  if (!targetIsConfigured(app, target)) return null;

  const key = `${app.id}:${target}`;
  const status = statuses.get(key);
  const check = checks.get(key);

  return {
    state: status?.state ?? 'unknown',
    latencyMs: check?.latency_ms ?? null,
    lastCheckAt: status?.last_check_at?.toISOString() ?? null,
    consecutiveFailures: status?.consecutive_failures ?? 0,
    lastError: check?.error?.slice(0, 120) ?? null,
  };
}

function worstState(
  paused: boolean,
  appTarget: AdminTargetView | null,
  supabaseTarget: AdminTargetView | null,
): AppDisplayState {
  if (paused) return 'paused';

  const activeStates = [appTarget?.state, supabaseTarget?.state].filter(
    (state): state is TargetDisplayState => state !== undefined,
  );
  if (activeStates.length === 0) return 'off';

  return activeStates.reduce((worst, state) =>
    targetStateSeverity[state] < targetStateSeverity[worst] ? state : worst,
  );
}

function increment<T extends string>(
  counts: Record<T, number>,
  state: T,
): void {
  counts[state] += 1;
}

export function buildAdminOverview(
  apps: AppRow[],
  statusRows: AppStatusRow[],
  checkRows: CheckRow[],
  now: Date,
): AdminOverviewModel {
  const statuses = new Map(
    statusRows.map((status) => [`${status.app_id}:${status.target}`, status]),
  );
  const latestChecks = new Map<string, CheckRow>();

  for (const check of checkRows) {
    const key = `${check.app_id}:${check.target}`;
    const latest = latestChecks.get(key);
    if (!latest || check.checked_at.getTime() > latest.checked_at.getTime()) {
      latestChecks.set(key, check);
    }
  }

  const counts: AdminOverviewCounts = {
    apps: { up: 0, down: 0, unknown: 0, off: 0, paused: 0 },
    targets: { up: 0, down: 0, unknown: 0, off: 0 },
    monitoredTargets: 0,
  };
  const attention: AdminAttentionItem[] = [];
  const appViews: AdminAppView[] = [];
  let maxLastCheckAt: Date | null = null;
  let pausedAppCount = 0;

  for (const app of apps) {
    const paused = isMonitoringPaused(app, now);
    if (paused) {
      pausedAppCount += 1;
    }

    const appTarget = targetView(app, 'app', statuses, latestChecks);
    const supabaseTarget = targetView(app, 'supabase', statuses, latestChecks);
    const state = worstState(paused, appTarget, supabaseTarget);

    increment(counts.apps, state);

    if (!paused) {
      for (const target of targets) {
        const status = statuses.get(`${app.id}:${target}`);
        if (
          status?.last_check_at &&
          (!maxLastCheckAt ||
            status.last_check_at.getTime() > maxLastCheckAt.getTime())
        ) {
          maxLastCheckAt = status.last_check_at;
        }
      }

      for (const target of targets) {
        const view = target === 'app' ? appTarget : supabaseTarget;
        if (!view) {
          increment(counts.targets, 'off');
          continue;
        }

        increment(counts.targets, view.state);

        if (view.state === 'down' || view.state === 'unknown') {
          attention.push({
            state: view.state,
            appId: app.id,
            appName: app.name,
            target,
            consecutiveFailures: view.consecutiveFailures,
            lastCheckAt: view.lastCheckAt,
            lastError: view.lastError,
          });
        }
      }
    }

    appViews.push({
      id: app.id,
      name: app.name,
      slug: app.slug,
      iconUrl: app.icon_url,
      isVisible: app.is_visible,
      paused,
      worstState: state,
      app: appTarget,
      supabase: supabaseTarget,
    });
  }

  const lastCheckAt = maxLastCheckAt?.toISOString() ?? null;
  const staleMinutes =
    maxLastCheckAt === null
      ? null
      : Math.floor((now.getTime() - maxLastCheckAt.getTime()) / 60_000);
  const allPaused = apps.length > 0 && pausedAppCount === apps.length;

  counts.monitoredTargets =
    counts.targets.up + counts.targets.down + counts.targets.unknown;

  attention.sort((a, b) => {
    return (
      targetStateSeverity[a.state] - targetStateSeverity[b.state] ||
      b.consecutiveFailures - a.consecutiveFailures ||
      a.appName.localeCompare(b.appName)
    );
  });

  appViews.sort(
    (a, b) =>
      appStateSeverity[a.worstState] - appStateSeverity[b.worstState] ||
      a.name.localeCompare(b.name),
  );

  return {
    counts,
    attention,
    apps: appViews,
    lastCheckAt,
    staleMinutes,
    isStale:
      !allPaused &&
      apps.length > 0 &&
      (lastCheckAt === null || (staleMinutes !== null && staleMinutes > 10)),
    allPaused,
  };
}
