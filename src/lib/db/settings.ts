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
