import type { AppStatusRow, SettingsRow } from '@/lib/db/types';
import type { CheckResult } from '@/lib/health/types';

type StatusFields = Omit<AppStatusRow, 'app_id' | 'target'>;
type SettingsFields = Pick<
  SettingsRow,
  | 'failure_threshold'
  | 'slow_threshold_ms'
  | 'notify_recovery'
  | 'repeat_reminder_minutes'
  | 'alerts_enabled'
>;

export type Evaluation = {
  status: StatusFields;
  incident: 'open' | 'close' | null;
  alert: 'down' | 'recovered' | 'slow' | 'down-reminder' | null;
};

const HOUR_MS = 60 * 60 * 1000;

export function evaluateCheck(input: {
  previous: AppStatusRow | null;
  check: CheckResult;
  settings: SettingsFields;
  now: Date;
}): Evaluation {
  const previous = input.previous;
  const settings = input.settings;
  const now = input.now;
  const status: StatusFields = {
    state: previous?.state ?? 'unknown',
    consecutive_failures: previous?.consecutive_failures ?? 0,
    consecutive_slow: previous?.consecutive_slow ?? 0,
    last_check_at: now,
    last_ok_at: previous?.last_ok_at ?? null,
    last_down_at: previous?.last_down_at ?? null,
    last_down_alert_at: previous?.last_down_alert_at ?? null,
    last_slow_alert_at: previous?.last_slow_alert_at ?? null,
  };

  let incident: Evaluation['incident'] = null;
  let alert: Evaluation['alert'] = null;
  const alertsOn = settings.alerts_enabled;

  if (input.check.ok) {
    status.last_ok_at = now;
    status.consecutive_failures = 0;
    status.consecutive_slow =
      input.check.latencyMs > settings.slow_threshold_ms
        ? status.consecutive_slow + 1
        : 0;

    const wasDown = previous?.state === 'down';
    status.state = 'up';

    if (wasDown) {
      incident = 'close';
      if (settings.notify_recovery && alertsOn) alert = 'recovered';
    }

    const slowThrottleExpired =
      !status.last_slow_alert_at ||
      now.getTime() - new Date(status.last_slow_alert_at).getTime() >= HOUR_MS;

    if (
      !alert &&
      alertsOn &&
      status.consecutive_slow >= 3 &&
      slowThrottleExpired
    ) {
      alert = 'slow';
      status.last_slow_alert_at = now;
    }

    return { status, incident, alert };
  }

  status.consecutive_slow = 0;
  status.consecutive_failures += 1;

  if (previous?.state !== 'down' && status.consecutive_failures >= settings.failure_threshold) {
    status.state = 'down';
    status.last_down_at = now;
    status.last_down_alert_at = now;
    incident = 'open';
    if (alertsOn) alert = 'down';
  } else if (previous?.state === 'down') {
    status.state = 'down';

    const repeat = settings.repeat_reminder_minutes;
    const reminderDue =
      repeat > 0 &&
      (!status.last_down_alert_at ||
        now.getTime() - new Date(status.last_down_alert_at).getTime() >= repeat * 60 * 1000);

    if (alertsOn && reminderDue) {
      alert = 'down-reminder';
      status.last_down_alert_at = now;
    }
  }

  return { status, incident, alert };
}
