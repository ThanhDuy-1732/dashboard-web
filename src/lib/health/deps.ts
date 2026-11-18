import { listAppsToCheck } from '@/lib/db/apps';
import {
  closeOpenIncident,
  getStatuses,
  insertCheck,
  openIncident,
  upsertStatus,
} from '@/lib/db/checks';
import { getSettings } from '@/lib/db/settings';
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
    notify: async () => {
      // Wired to Telegram/email delivery in Task 9.
    },
    now: () => new Date(),
    ping: pingTarget,
  };
}
