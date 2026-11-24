import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppRow } from '@/lib/db/types';

const mocks = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  notFound: vi.fn(),
  getAppById: vi.fn(),
  getStatuses: vi.fn(async () => []),
  listChecksForAppSince: vi.fn(async () => []),
  listIncidents: vi.fn(async () => []),
  listRecentChecks: vi.fn(async () => []),
  listClicksSince: vi.fn(async () => []),
  pauseMonitoringAction: vi.fn(),
  resumeMonitoringAction: vi.fn(),
}));

vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('@/lib/db/apps', () => ({ getAppById: mocks.getAppById }));
vi.mock('@/lib/db/checks', () => ({
  getStatuses: mocks.getStatuses,
  listChecksForAppSince: mocks.listChecksForAppSince,
  listIncidents: mocks.listIncidents,
  listRecentChecks: mocks.listRecentChecks,
}));
vi.mock('@/lib/db/clicks', () => ({ listClicksSince: mocks.listClicksSince }));
vi.mock('@/app/admin/(protected)/apps/actions', () => ({
  pauseMonitoringAction: mocks.pauseMonitoringAction,
  resumeMonitoringAction: mocks.resumeMonitoringAction,
}));
vi.mock('@/components/charts/click-chart', () => ({
  ClickChart: () => <div data-testid="click-chart" />,
}));
vi.mock('@/components/charts/latency-chart', () => ({
  LatencyChart: () => <div data-testid="latency-chart" />,
}));

import AppDetailPage from '@/app/admin/(protected)/apps/[id]/page';

function makeApp(monitoringPausedUntil: Date | null): AppRow {
  const now = new Date();
  return {
    id: 'app-alpha',
    slug: 'alpha',
    name: 'Alpha Console',
    description: null,
    url: 'https://alpha.example.com',
    icon_url: null,
    preview_url: null,
    supabase_ref: null,
    supabase_health_url: null,
    sort_order: 0,
    is_visible: true,
    monitor_app: true,
    monitor_supabase: false,
    monitoring_paused_until: monitoringPausedUntil,
    expected_status: 200,
    timeout_ms: 5000,
    health_method: 'GET',
    health_headers: {},
    created_at: now,
    updated_at: now,
  };
}

async function renderDetail(monitoringPausedUntil: Date | null) {
  const app = makeApp(monitoringPausedUntil);
  mocks.getAppById.mockResolvedValue(app);
  render(await AppDetailPage({ params: Promise.resolve({ id: app.id }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/admin/apps/[id] page', () => {
  it('wires the current paused state into the header pause menu', async () => {
    await renderDetail(new Date('2099-01-01T00:00:00.000Z'));

    expect(screen.getByText('Tạm dừng giám sát')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Tùy chọn giám sát'));
    expect(screen.getByRole('button', { name: 'Tiếp tục giám sát' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tạm dừng 30 phút' })).not.toBeInTheDocument();
  });

  it('offers pause options when monitoring is not paused', async () => {
    await renderDetail(null);

    expect(screen.queryByText('Tạm dừng giám sát')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Tùy chọn giám sát'));
    expect(screen.getByRole('button', { name: 'Tạm dừng 30 phút' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạm dừng 60 phút' })).toBeInTheDocument();
  });
});
