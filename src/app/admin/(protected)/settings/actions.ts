'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/admin';
import { listAllApps } from '@/lib/db/apps';
import { getSettings, updateSettings } from '@/lib/db/settings';
import { getServerEnv } from '@/lib/env';
import { deliverAlert } from '@/lib/health/alerts';
import { parseSettingsForm } from '@/lib/validation/settings';

export type SettingsState = {
  errors?: Record<string, string[] | undefined>;
  saved?: boolean;
  message?: string;
};

const channelLabels = {
  sent: 'đã gửi',
  skipped: 'bỏ qua (chưa cấu hình)',
  failed: 'lỗi',
};

export async function saveSettingsAction(
  _state: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  await requireAdmin();

  const parsed = parseSettingsForm(formData);
  if (!parsed.success) {
    return { errors: parsed.errors };
  }

  await updateSettings(parsed.input);
  revalidatePath('/admin/settings');
  revalidatePath('/admin');

  return { saved: true };
}

export async function sendTestAlertAction(
  _state: SettingsState,
  _formData: FormData,
): Promise<SettingsState> {
  void _state;
  void _formData;
  await requireAdmin();

  const [settings, apps] = await Promise.all([getSettings(), listAllApps()]);
  const app = apps[0];

  if (!app) {
    return { message: 'Chưa có ứng dụng để gửi thử.' };
  }

  const env = getServerEnv();
  const result = await deliverAlert(
    {
      kind: 'down',
      app,
      target: 'app',
      check: { ok: false, statusCode: 503, latencyMs: 123, error: 'HTTP 503 (test)' },
      at: new Date(),
    },
    settings,
    {
      telegramBotToken: env.TELEGRAM_BOT_TOKEN,
      resendApiKey: env.RESEND_API_KEY,
      alertFromEmail: env.ALERT_FROM_EMAIL,
    },
  );

  return {
    message: `Telegram: ${channelLabels[result.telegram]} · Email: ${channelLabels[result.email]}`,
  };
}
