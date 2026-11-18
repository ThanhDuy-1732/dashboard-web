import { getSql } from '@/lib/db/client';
import type { SettingsInput, SettingsRow } from '@/lib/db/types';

export async function getSettings(): Promise<SettingsRow> {
  const sql = getSql();
  const [row] = await sql<SettingsRow[]>`select * from settings where id = 1`;
  if (!row) throw new Error('settings singleton is missing');
  return row;
}

export async function updateSettings(input: SettingsInput): Promise<SettingsRow> {
  const sql = getSql();
  const [row] = await sql<SettingsRow[]>`
    update settings set
      telegram_chat_id = ${input.telegramChatId},
      email_recipients = ${sql.array(input.emailRecipients)},
      failure_threshold = ${input.failureThreshold},
      slow_threshold_ms = ${input.slowThresholdMs},
      alerts_enabled = ${input.alertsEnabled},
      notify_recovery = ${input.notifyRecovery},
      repeat_reminder_minutes = ${input.repeatReminderMinutes}
    where id = 1
    returning *
  `;
  if (!row) throw new Error('settings singleton is missing');
  return row;
}

export async function claimHealthRun(staleAfterSeconds = 30): Promise<boolean> {
  const sql = getSql();
  const [row] = await sql<{ claimed: boolean }[]>`
    select claim_health_run(${staleAfterSeconds}) as claimed
  `;
  return row?.claimed ?? false;
}

export async function releaseHealthRun(): Promise<void> {
  const sql = getSql();
  await sql`select release_health_run()`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function cleanupOldData(now: Date): Promise<void> {
  const sql = getSql();
  const checksBefore = new Date(now.getTime() - 30 * DAY_MS);
  const clicksBefore = new Date(now.getTime() - 90 * DAY_MS);

  await sql.begin(async (tx) => {
    await tx`delete from checks where checked_at < ${checksBefore}`;
    await tx`delete from click_events where clicked_at < ${clicksBefore}`;
    await tx`update settings set last_cleanup_at = ${now} where id = 1`;
  });
}
