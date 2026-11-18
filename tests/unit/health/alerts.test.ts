// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { deliverAlert, formatAlert } from '@/lib/health/alerts';
import type { AppRow, SettingsRow } from '@/lib/db/types';
import type { HealthAlert } from '@/lib/health/types';

const at = new Date('2026-11-18T07:05:00.000Z');

function app(overrides: Partial<AppRow> = {}): AppRow {
  return {
    id: 'app-1',
    slug: 'blog',
    name: 'Blog',
    description: null,
    url: 'https://blog.example.com',
    icon_url: null,
    supabase_ref: null,
    supabase_health_url: null,
    sort_order: 0,
    is_visible: true,
    monitor_app: true,
    monitor_supabase: false,
    monitoring_paused_until: null,
    expected_status: 200,
    timeout_ms: 5000,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

function settings(overrides: Partial<SettingsRow> = {}): SettingsRow {
  return {
    id: 1,
    telegram_chat_id: null,
    email_recipients: [],
    failure_threshold: 3,
    slow_threshold_ms: 2000,
    alerts_enabled: true,
    notify_recovery: true,
    repeat_reminder_minutes: 0,
    health_run_locked_at: null,
    last_cleanup_at: null,
    updated_at: at,
    ...overrides,
  };
}

const downAlert: HealthAlert = {
  kind: 'down',
  app: app(),
  target: 'app',
  check: { ok: false, statusCode: 503, latencyMs: 123, error: 'HTTP 503' },
  at,
};

const env = {
  telegramBotToken: 'token-123',
  resendApiKey: undefined,
  alertFromEmail: 'onboarding@resend.dev',
};

describe('formatAlert', () => {
  it('formats a down alert with target, error, latency, VN time and link', () => {
    const { subject, text } = formatAlert(downAlert, 'https://hub.test');

    expect(subject).toContain('Blog');
    expect(subject).toContain('đang chết');
    expect(text).toContain('Blog');
    expect(text).toContain('Ứng dụng');
    expect(text).toContain('đang chết');
    expect(text).toContain('HTTP 503');
    expect(text).toContain('123 ms');
    expect(text).toContain('18/11/2026 14:05');
    expect(text).toContain('https://hub.test/admin/apps/app-1');
  });

  it('labels Supabase targets', () => {
    const { text } = formatAlert({ ...downAlert, target: 'supabase' }, 'https://hub.test');
    expect(text).toContain('Supabase');
  });

  it('formats recovery with downtime', () => {
    const { text } = formatAlert(
      { ...downAlert, kind: 'recovered', downtimeMs: 2 * 60_000 },
      'https://hub.test',
    );

    expect(text).toContain('đã hoạt động lại');
    expect(text).toContain('2 phút');
  });

  it('formats slow alerts', () => {
    const { text } = formatAlert({ ...downAlert, kind: 'slow' }, 'https://hub.test');
    expect(text).toContain('phản hồi chậm');
  });
});

describe('deliverAlert', () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips both channels when nothing is configured', async () => {
    const result = await deliverAlert(downAlert, settings(), {
      alertFromEmail: 'onboarding@resend.dev',
    });

    expect(result).toEqual({ telegram: 'skipped', email: 'skipped' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts plain text to Telegram without parse_mode', async () => {
    const result = await deliverAlert(
      downAlert,
      settings({ telegram_chat_id: '123' }),
      env,
    );

    expect(result.telegram).toBe('sent');
    expect(fetch).toHaveBeenCalledOnce();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottoken-123/sendMessage');

    const body = JSON.parse(String(init?.body));
    expect(body.chat_id).toBe('123');
    expect(body.text).toContain('Blog');
    expect(body).not.toHaveProperty('parse_mode');
  });

  it('marks Telegram failed without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );

    const result = await deliverAlert(
      downAlert,
      settings({ telegram_chat_id: '123' }),
      env,
    );

    expect(result.telegram).toBe('failed');
  });

  it('sends email when Resend is configured', async () => {
    sendMock.mockResolvedValue({ data: { id: '1' }, error: null });

    const result = await deliverAlert(
      downAlert,
      settings({ email_recipients: ['owner@example.com'] }),
      { ...env, resendApiKey: 're_123' },
    );

    expect(result.email).toBe('sent');
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['owner@example.com'],
        from: 'onboarding@resend.dev',
      }),
    );
  });

  it('marks email failed without throwing', async () => {
    sendMock.mockRejectedValue(new Error('resend down'));

    const result = await deliverAlert(
      downAlert,
      settings({ email_recipients: ['owner@example.com'] }),
      { ...env, resendApiKey: 're_123' },
    );

    expect(result.email).toBe('failed');
  });
});
