import { Resend } from 'resend';
import type { SettingsRow } from '@/lib/db/types';
import { getServerEnv } from '@/lib/env';
import { formatDateTime } from '@/lib/format';
import type { HealthAlert } from '@/lib/health/types';

function targetLabel(alert: HealthAlert): string {
  return alert.target === 'app' ? 'Ứng dụng' : 'Supabase';
}

function duration(ms?: number): string {
  if (!ms || ms <= 0) return 'ít phút';
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

function errorLine(alert: HealthAlert): string {
  if (alert.check.error) return alert.check.error;
  if (alert.check.statusCode) return `HTTP ${alert.check.statusCode}`;
  return 'Không phản hồi';
}

export function formatAlert(
  alert: HealthAlert,
  siteUrl: string,
): { subject: string; text: string } {
  const label = targetLabel(alert);
  const detail = `${siteUrl}/admin/apps/${alert.app.id}`;
  const time = formatDateTime(alert.at);

  if (alert.kind === 'recovered') {
    return {
      subject: `[Hub] ${alert.app.name} (${label}) đã hoạt động lại`,
      text: [
        `✅ ${alert.app.name} (${label}) đã hoạt động lại sau ${duration(alert.downtimeMs)}.`,
        `Độ trễ: ${alert.check.latencyMs} ms`,
        `Lúc: ${time}`,
        `Chi tiết: ${detail}`,
      ].join('\n'),
    };
  }

  if (alert.kind === 'slow') {
    return {
      subject: `[Hub] ${alert.app.name} (${label}) phản hồi chậm`,
      text: [
        `🐢 ${alert.app.name} (${label}) phản hồi chậm.`,
        `Độ trễ: ${alert.check.latencyMs} ms`,
        `Lúc: ${time}`,
        `Chi tiết: ${detail}`,
      ].join('\n'),
    };
  }

  if (alert.kind === 'down-reminder') {
    return {
      subject: `[Hub] ${alert.app.name} (${label}) vẫn đang chết`,
      text: [
        `🔴 ${alert.app.name} (${label}) vẫn đang chết.`,
        `Lỗi: ${errorLine(alert)}`,
        `Độ trễ: ${alert.check.latencyMs} ms`,
        `Lúc: ${time}`,
        `Chi tiết: ${detail}`,
      ].join('\n'),
    };
  }

  return {
    subject: `[Hub] ${alert.app.name} (${label}) đang chết`,
    text: [
      `🔴 ${alert.app.name} (${label}) đang chết.`,
      `Lỗi: ${errorLine(alert)}`,
      `Độ trễ: ${alert.check.latencyMs} ms`,
      `Lúc: ${time}`,
      `Chi tiết: ${detail}`,
    ].join('\n'),
  };
}

type ChannelResult = 'sent' | 'skipped' | 'failed';

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function deliverAlert(
  alert: HealthAlert,
  settings: SettingsRow,
  env: {
    telegramBotToken?: string;
    resendApiKey?: string;
    alertFromEmail: string;
    alertTimeoutMs?: number;
  },
): Promise<{ telegram: ChannelResult; email: ChannelResult }> {
  const siteUrl = getServerEnv().NEXT_PUBLIC_SITE_URL;
  const { subject, text } = formatAlert(alert, siteUrl);
  const timeoutMs = env.alertTimeoutMs ?? 10_000;
  let telegram: ChannelResult = 'skipped';
  let email: ChannelResult = 'skipped';
  const jobs: Promise<void>[] = [];

  if (settings.telegram_chat_id && env.telegramBotToken) {
    telegram = 'sent';
    jobs.push(
      (async () => {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ chat_id: settings.telegram_chat_id, text }),
              signal: AbortSignal.timeout(timeoutMs),
            },
          );

          if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
        } catch (error) {
          telegram = 'failed';
          console.error('telegram alert failed', error);
        }
      })(),
    );
  }

  if (settings.email_recipients.length > 0 && env.resendApiKey) {
    email = 'sent';
    jobs.push(
      (async () => {
        try {
          const resend = new Resend(env.resendApiKey);
          const result = await withTimeout(
            resend.emails.send({
              from: env.alertFromEmail,
              to: settings.email_recipients,
              subject,
              text,
            }),
            timeoutMs,
          );

          if (result.error) throw new Error(result.error.message);
        } catch (error) {
          email = 'failed';
          console.error('email alert failed', error);
        }
      })(),
    );
  }

  await Promise.allSettled(jobs);

  return { telegram, email };
}
