import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRow, ClickEventRow } from '@/lib/db/types';

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
vi.mock('@/components/charts/click-chart', () => ({
  ClickChart: () => <div data-testid="click-chart" />,
}));

import AdminAnalyticsPage from '@/app/admin/(protected)/analytics/page';

const now = new Date('2026-11-23T12:00:00.000Z');

function makeApp(id: string, name: string, sortOrder: number): AppRow {
  return {
    id,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    name,
    description: null,
    url: `https://${id}.example.com`,
    icon_url: null,
    supabase_ref: null,
    supabase_health_url: null,
    sort_order: sortOrder,
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
}

function makeClick(
  id: number,
  appId: string,
  clickedAt: string,
  ipHash: string,
): ClickEventRow {
  return {
    id,
    app_id: appId,
    clicked_at: new Date(clickedAt),
    referrer: null,
    user_agent: 'test-agent',
    ip_hash: ipHash,
    country: null,
  };
}

const apps = [
  makeApp('cedar-id', 'Cedar Console', 0),
  makeApp('birch-id', 'Birch Portal', 1),
  makeApp('elm-id', 'Elm Dashboard', 2),
];
const clicks = [
  makeClick(1, 'cedar-id', '2026-11-23T11:30:00.000Z', 'visitor-a'),
  makeClick(2, 'cedar-id', '2026-11-20T11:30:00.000Z', 'visitor-b'),
  makeClick(3, 'birch-id', '2026-11-13T11:30:00.000Z', 'visitor-b'),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(now);
  mocks.listAllApps.mockResolvedValue(apps);
  mocks.listClicksSince.mockResolvedValue(clicks);
  mocks.getStatuses.mockResolvedValue([]);
  mocks.listChecksSince.mockResolvedValue([]);
  mocks.listRecentIncidents.mockResolvedValue([]);
});

describe('/admin/analytics page', () => {
  it('renders click KPIs, the chart, and per-app counts from one 30-day query', async () => {
    render(await AdminAnalyticsPage());

    expect(screen.getByRole('heading', { name: 'Phân tích', level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText('Lượt bấm và khách riêng trong 30 ngày gần nhất.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('click-chart')).toBeInTheDocument();

    const metrics = screen.getByRole('group', { name: 'Chỉ số lượt bấm' });
    const metricValue = (label: string) =>
      within(metrics).getByText(label).parentElement?.querySelector('dd')?.textContent;
    expect(metricValue('Lượt bấm hôm nay')).toBe('1');
    expect(metricValue('7 ngày')).toBe('2');
    expect(metricValue('30 ngày')).toBe('3');
    expect(metricValue('Khách riêng 30 ngày')).toBe('2');

    const table = screen.getByRole('table', { name: 'Lượt bấm theo ứng dụng' });
    const cedarRow = within(table).getByRole('row', { name: /Cedar Console/ });
    const birchRow = within(table).getByRole('row', { name: /Birch Portal/ });
    const elmRow = within(table).getByRole('row', { name: /Elm Dashboard/ });
    expect(within(cedarRow).getByRole('cell')).toHaveTextContent(/^2$/);
    expect(within(birchRow).getByRole('cell')).toHaveTextContent(/^1$/);
    expect(within(elmRow).getByRole('cell')).toHaveTextContent(/^0$/);

    expect(mocks.connection).toHaveBeenCalledOnce();
    expect(mocks.listAllApps).toHaveBeenCalledOnce();
    expect(mocks.listClicksSince).toHaveBeenCalledWith(
      new Date('2026-10-24T12:00:00.000Z'),
    );
    expect(mocks.getStatuses).not.toHaveBeenCalled();
    expect(mocks.listChecksSince).not.toHaveBeenCalled();
    expect(mocks.listRecentIncidents).not.toHaveBeenCalled();
  });
});
