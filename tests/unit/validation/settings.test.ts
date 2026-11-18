import { describe, expect, it } from 'vitest';
import { parseSettingsForm, settingsInputSchema } from '@/lib/validation/settings';

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const base = {
    telegramChatId: ' 123 ',
    emailRecipients: ' A@X.com, b@y.com\nc@z.com ',
    failureThreshold: '3',
    slowThresholdMs: '2000',
    alertsEnabled: 'on',
    notifyRecovery: 'on',
    repeatReminderMinutes: '0',
    ...overrides,
  };

  for (const [key, value] of Object.entries(base)) {
    if (value !== '') data.set(key, value);
  }

  return data;
}

describe('settingsInputSchema', () => {
  it('parses recipients and applies defaults', () => {
    const result = parseSettingsForm(form({ failureThreshold: '', slowThresholdMs: '' }));

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.telegramChatId).toBe('123');
    expect(result.input.emailRecipients).toEqual([
      'a@x.com',
      'b@y.com',
      'c@z.com',
    ]);
    expect(result.input.failureThreshold).toBe(3);
    expect(result.input.slowThresholdMs).toBe(2000);
    expect(result.input.repeatReminderMinutes).toBe(0);
    expect(result.input.alertsEnabled).toBe(true);
    expect(result.input.notifyRecovery).toBe(true);
  });

  it('turns an empty chat id into null and unchecked boxes into false', () => {
    const data = form({ telegramChatId: '' });
    data.delete('alertsEnabled');
    data.delete('notifyRecovery');

    const result = parseSettingsForm(data);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.telegramChatId).toBeNull();
    expect(result.input.alertsEnabled).toBe(false);
    expect(result.input.notifyRecovery).toBe(false);
  });

  it('rejects a threshold outside 1..10', () => {
    expect(settingsInputSchema.safeParse({
      telegramChatId: '',
      emailRecipients: [],
      failureThreshold: 0,
      slowThresholdMs: 2000,
      alertsEnabled: true,
      notifyRecovery: true,
      repeatReminderMinutes: 0,
    }).success).toBe(false);

    expect(settingsInputSchema.safeParse({
      telegramChatId: '',
      emailRecipients: [],
      failureThreshold: 11,
      slowThresholdMs: 2000,
      alertsEnabled: true,
      notifyRecovery: true,
      repeatReminderMinutes: 0,
    }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(settingsInputSchema.safeParse({
      telegramChatId: '',
      emailRecipients: ['not-an-email'],
      failureThreshold: 3,
      slowThresholdMs: 2000,
      alertsEnabled: true,
      notifyRecovery: true,
      repeatReminderMinutes: 0,
    }).success).toBe(false);
  });
});
