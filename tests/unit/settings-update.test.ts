// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ values: [] as unknown[] }));

vi.mock('@/lib/db/client', () => {
  const row = {
    id: 1,
    telegram_chat_id: null,
    email_recipients: [] as string[],
    failure_threshold: 3,
    slow_threshold_ms: 2000,
    alerts_enabled: true,
    notify_recovery: true,
    repeat_reminder_minutes: 0,
    health_run_locked_at: null,
    health_run_token: null,
    last_cleanup_at: null,
    updated_at: new Date(),
  };

  const sql = (_strings: TemplateStringsArray, ...values: unknown[]) => {
    captured.values = values;
    const recipients = values.find((value): value is string[] => Array.isArray(value)) ?? [];
    return Promise.resolve([{ ...row, email_recipients: recipients }]);
  };

  return { getSql: () => sql };
});

import { updateSettings } from '@/lib/db/settings';

const input = {
  telegramChatId: '123',
  emailRecipients: [] as string[],
  failureThreshold: 3,
  slowThresholdMs: 2000,
  alertsEnabled: true,
  notifyRecovery: true,
  repeatReminderMinutes: 0,
};

describe('updateSettings', () => {
  beforeEach(() => {
    captured.values = [];
  });

  it('saves an empty recipient list without sql.array', async () => {
    const result = await updateSettings(input);

    expect(result.email_recipients).toEqual([]);
    expect(captured.values).toContainEqual([]);
  });

  it('saves populated recipients', async () => {
    const result = await updateSettings({
      ...input,
      emailRecipients: ['owner@example.com', 'ops@example.com'],
    });

    expect(result.email_recipients).toEqual(['owner@example.com', 'ops@example.com']);
    expect(captured.values).toContainEqual(['owner@example.com', 'ops@example.com']);
  });
});
