import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SettingsRow } from '@/lib/db/types';

const mocks = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  getSettings: vi.fn(),
  saveSettingsAction: vi.fn(async () => ({})),
  sendTestAlertAction: vi.fn(async () => ({})),
  logoutAction: vi.fn(async () => {}),
  clearAdminSnapshot: vi.fn(async () => {}),
}));

vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('@/lib/db/settings', () => ({ getSettings: mocks.getSettings }));
vi.mock('@/app/admin/(protected)/settings/actions', () => ({
  saveSettingsAction: mocks.saveSettingsAction,
  sendTestAlertAction: mocks.sendTestAlertAction,
}));
vi.mock('@/app/admin/login/actions', () => ({ logoutAction: mocks.logoutAction }));
vi.mock('@/lib/pwa/snapshot', () => ({ clearAdminSnapshot: mocks.clearAdminSnapshot }));

import SettingsPage from '@/app/admin/(protected)/settings/page';

const settings: SettingsRow = {
  id: 1,
  telegram_chat_id: null,
  email_recipients: [],
  failure_threshold: 1,
  slow_threshold_ms: 2000,
  alerts_enabled: true,
  notify_recovery: true,
  repeat_reminder_minutes: 0,
  health_run_locked_at: null,
  health_run_token: null,
  last_cleanup_at: null,
  updated_at: new Date('2026-11-23T00:00:00.000Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSettings.mockResolvedValue(settings);
});

describe('/admin/settings page', () => {
  it('renders a session card with the default logout control', async () => {
    render(await SettingsPage());

    expect(screen.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Phiên đăng nhập', level: 2 }),
    ).toBeInTheDocument();

    const card = screen.getByRole('heading', { name: 'Phiên đăng nhập', level: 2 }).closest('div');
    expect(card).toHaveTextContent('Kết thúc phiên quản trị trên thiết bị này.');
    expect(within(card as HTMLElement).getByRole('button', { name: 'Đăng xuất' })).toHaveClass(
      'border-line',
    );
    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.getSettings).toHaveBeenCalledOnce();
  });
});
