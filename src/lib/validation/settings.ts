import { z } from 'zod';
import type { SettingsInput } from '@/lib/db/types';

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const recipients = z.preprocess(
  (value) => {
    const raw = Array.isArray(value)
      ? value.join('\n')
      : typeof value === 'string'
        ? value
        : '';
    return raw
      .split(/[\n,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  },
  z.array(z.email()).max(10),
);

export const settingsInputSchema = z.object({
  telegramChatId: z.preprocess(
    blankToNull,
    z.string().trim().max(100).nullable().default(null),
  ),
  emailRecipients: recipients,
  failureThreshold: z.coerce.number().int().min(1).max(10).default(3),
  slowThresholdMs: z.coerce.number().int().min(100).max(60000).default(2000),
  alertsEnabled: z.boolean().default(true),
  notifyRecovery: z.boolean().default(true),
  repeatReminderMinutes: z.coerce.number().int().min(0).max(1440).default(0),
});

export type SettingsFormInput = z.infer<typeof settingsInputSchema>;

export function parseSettingsForm(formData: FormData) {
  const result = settingsInputSchema.safeParse({
    telegramChatId: formData.get('telegramChatId') ?? '',
    emailRecipients: formData.get('emailRecipients') ?? '',
    failureThreshold: formData.get('failureThreshold') || 3,
    slowThresholdMs: formData.get('slowThresholdMs') || 2000,
    alertsEnabled: formData.get('alertsEnabled') === 'on',
    notifyRecovery: formData.get('notifyRecovery') === 'on',
    repeatReminderMinutes: formData.get('repeatReminderMinutes') || 0,
  });

  if (!result.success) {
    return { success: false as const, errors: result.error.flatten().fieldErrors };
  }

  return { success: true as const, input: result.data satisfies SettingsInput };
}
