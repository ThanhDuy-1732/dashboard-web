import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRow, AppStatusRow } from '@/lib/db/types';

const mocks = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  listAllApps: vi.fn(),
  getStatuses: vi.fn(),
  listChecksSince: vi.fn(),
  listRecentIncidents: vi.fn(),
  listClicksSince: vi.fn(),
  pauseMonitoringAction: vi.fn(),
  resumeMonitoringAction: vi.fn(),
}));

vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('@/lib/db/apps', () => ({ listAllApps: mocks.listAllApps }));
vi.mock('@/lib/db/checks', () => ({
  getStatuses: mocks.getStatuses,
  listChecksSince: mocks.listChecksSince,
  listRecentIncidents: mocks.listRecentIncidents,
}));
vi.mock('@/lib/db/clicks', () => ({ listClicksSince: mocks.listClicksSince }));
vi.mock('@/app/admin/(protected)/apps/actions', () => ({
  pauseMonitoringAction: mocks.pauseMonitoringAction,
  resumeMonitoringAction: mocks.resumeMonitoringAction,
}));

import AdminOverviewPage from '@/app/admin/(protected)/page';

const now = new Date('2026-11-23T12:00:00.000Z');
const app: AppRow = {
  id: 'cedar-id',
  slug: 'cedar',
  name: 'Cedar Console',
  description: 'Internal tools',
  url: 'https://cedar.example.com',
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
  health_method: 'GET',
  health_headers: {},
  created_at: now,
  updated_at: now,
};
const status: AppStatusRow = {
  app_id: app.id,
  target: 'app',
  state: 'up',
  consecutive_failures: 0,
  consecutive_slow: 0,
  last_check_at: new Date('2026-11-23T11:55:00.000Z'),
  last_ok_at: new Date('2026-11-23T11:55:00.000Z'),
  last_down_at: null,
  last_down_alert_at: null,
  last_slow_alert_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(now);
  mocks.listAllApps.mockResolvedValue([app]);
  mocks.getStatuses.mockResolvedValue([status]);
  mocks.listChecksSince.mockResolvedValue([]);
  mocks.listRecentIncidents.mockResolvedValue([]);
  mocks.listClicksSince.mockResolvedValue([]);
});

describe('/admin overview page', () => {
  it('renders one shared status model in desktop and mobile views without analytics', async () => {
    render(await AdminOverviewPage());

    expect(screen.getByRole('heading', { name: 'Tổng quan', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Cedar Console')).toHaveLength(2);
    expect(screen.getByText('Cập nhật 5 phút trước')).toBeInTheDocument();
    expect(screen.queryByText('Lượt bấm hôm nay')).not.toBeInTheDocument();
    expect(screen.queryByTestId('click-chart')).not.toBeInTheDocument();

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.listAllApps).toHaveBeenCalledOnce();
    expect(mocks.getStatuses).toHaveBeenCalledOnce();
    expect(mocks.listChecksSince).toHaveBeenCalledWith(
      new Date('2026-11-22T12:00:00.000Z'),
    );
    expect(mocks.listRecentIncidents).toHaveBeenCalledWith(10);
    expect(mocks.listClicksSince).not.toHaveBeenCalled();
  });
});
