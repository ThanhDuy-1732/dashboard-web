import { listAppsToCheck } from '@/lib/db/apps';
import {
  closeOpenIncident,
  getStatuses,
  insertCheck,
  openIncident,
  upsertStatus,
} from '@/lib/db/checks';
import { getSettings } from '@/lib/db/settings';
import { getServerEnv } from '@/lib/env';
import { deliverAlert } from '@/lib/health/alerts';
import { pingTarget } from '@/lib/health/ping';
import type { HealthDeps } from '@/lib/health/runner';

export function createHealthDeps(): HealthDeps {
  return {
    listAppsToCheck,
    getStatuses,
    insertCheck,
    upsertStatus,
    openIncident,
    closeOpenIncident,
    getSettings,
    notify: async (alert) => {
      const settings = await getSettings();
      const env = getServerEnv();

      await deliverAlert(alert, settings, {
        telegramBotToken: env.TELEGRAM_BOT_TOKEN,
        resendApiKey: env.RESEND_API_KEY,
        alertFromEmail: env.ALERT_FROM_EMAIL,
      });
    },
    now: () => new Date(),
    ping: pingTarget,
  };
}
