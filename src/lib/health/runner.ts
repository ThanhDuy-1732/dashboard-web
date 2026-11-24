import type {
  AppRow,
  NewCheck,
  NewIncident,
  AppStatusRow,
  SettingsRow,
  Target,
} from '@/lib/db/types';
import { withDbRetry } from '@/lib/db/retry';
import { evaluateCheck } from '@/lib/health/evaluate';
import { HealthRunError, type HealthRunFailure } from '@/lib/health/errors';
import { targetsForApp } from '@/lib/health/targets';
import type { CheckResult, HealthAlert, HealthTarget } from '@/lib/health/types';

export type HealthDeps = {
  listAppsToCheck(now: Date): Promise<AppRow[]>;
  getStatuses(): Promise<AppStatusRow[]>;
  insertCheck(row: NewCheck): Promise<void>;
  upsertStatus(row: AppStatusRow): Promise<void>;
  openIncident(row: NewIncident): Promise<void>;
  closeOpenIncident(appId: string, target: Target, at: Date): Promise<void>;
  getSettings(): Promise<SettingsRow>;
  notify(alert: HealthAlert): Promise<void>;
  now(): Date;
  ping(target: HealthTarget): Promise<CheckResult>;
};

function failedCheck(error: unknown): CheckResult {
  return {
    ok: false,
    statusCode: null,
    latencyMs: 0,
    error: error instanceof Error ? error.message : 'ping error',
  };
}

export async function runHealthChecks(
  deps: HealthDeps,
): Promise<{ checked: number; skipped: boolean }> {
  const checkedAt = deps.now();
  const apps = await withDbRetry(() => deps.listAppsToCheck(checkedAt));
  const targets = apps.flatMap((app) => targetsForApp(app, checkedAt));
  const settings = await withDbRetry(() => deps.getSettings());
  const statuses = await withDbRetry(() => deps.getStatuses());
  const statusMap = new Map(
    statuses.map((status) => [`${status.app_id}:${status.target}`, status]),
  );
  const appMap = new Map(apps.map((app) => [app.id, app]));

  let checked = 0;
  let failures = 0;
  const failureDetails: HealthRunFailure[] = [];

  await Promise.all(
    targets.map(async (target) => {
      const app = appMap.get(target.appId);
      if (!app) return;

      let check: CheckResult;
      try {
        check = await deps.ping(target);
      } catch (error) {
        check = failedCheck(error);
      }

      checked += 1;
      const previous = statusMap.get(`${target.appId}:${target.target}`) ?? null;
      const evaluation = evaluateCheck({ previous, check, settings, now: checkedAt });

      try {
        await withDbRetry(async () => {
          await deps.insertCheck({
            app_id: target.appId,
            target: target.target,
            checked_at: checkedAt,
            ok: check.ok,
            status_code: check.statusCode,
            latency_ms: check.latencyMs,
            error: check.error,
          });

          await deps.upsertStatus({
            ...evaluation.status,
            app_id: target.appId,
            target: target.target,
          });

          if (evaluation.status.state === 'down') {
            await deps.openIncident({
              app_id: target.appId,
              target: target.target,
              started_at: checkedAt,
              first_error: check.error,
            });
          } else if (evaluation.status.state === 'up') {
            await deps.closeOpenIncident(target.appId, target.target, checkedAt);
          }
        });

        if (evaluation.alert) {
          const downtimeMs =
            evaluation.alert === 'recovered' && previous?.last_down_at
              ? checkedAt.getTime() - new Date(previous.last_down_at).getTime()
              : undefined;

          try {
            await deps.notify({
              kind: evaluation.alert,
              app,
              target: target.target,
              check,
              at: checkedAt,
              downtimeMs,
            });

            if (evaluation.alert === 'down' || evaluation.alert === 'down-reminder') {
              await deps.upsertStatus({
                ...evaluation.status,
                last_down_alert_at: checkedAt,
                app_id: target.appId,
                target: target.target,
              });
            }
          } catch (error) {
            console.error('health alert delivery failed', error);
          }
        }
      } catch (error) {
        failures += 1;
        failureDetails.push(toFailureDetail(target, error));
        console.error(`health persistence failed for ${target.slug}:${target.target}`, error);
      }
    }),
  );

  if (failures > 0) {
    throw new HealthRunError(checked, failureDetails);
  }

  return { checked, skipped: false };
}

function toFailureDetail(target: HealthTarget, error: unknown): HealthRunFailure {
  if (error instanceof Error) {
    const { code } = error as { code?: unknown };

    return {
      slug: target.slug,
      target: target.target,
      code: typeof code === 'string' ? code : null,
      message: error.message,
    };
  }

  return {
    slug: target.slug,
    target: target.target,
    code: null,
    message: String(error),
  };
}
