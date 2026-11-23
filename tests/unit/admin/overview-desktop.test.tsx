import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/admin/(protected)/apps/actions', () => ({
  pauseMonitoringAction: vi.fn(),
  resumeMonitoringAction: vi.fn(),
}));

import { OverviewDesktop } from '@/components/admin/overview-desktop';
import type {
  AdminAttentionItem,
  AdminOverviewModel,
} from '@/lib/admin/overview';
import { makeAdminApp, recentIncident } from './fixtures';

const now = new Date('2026-11-23T12:00:00.000Z');

const attention: AdminAttentionItem = {
  appId: 'app-alpha',
  appName: 'Alpha',
  target: 'app',
  state: 'down',
  consecutiveFailures: 3,
  lastCheckAt: '2026-11-23T11:55:00.000Z',
  lastError: 'Timeout',
};

function makeModel(
  overrides: Partial<AdminOverviewModel> = {},
): AdminOverviewModel {
  return {
    counts: {
      apps: { up: 1, down: 1, unknown: 0, off: 0, paused: 0 },
      targets: { up: 1, down: 1, unknown: 0, off: 0 },
      monitoredTargets: 2,
    },
    attention: [attention],
    apps: [
      makeAdminApp({
        id: 'app-beta',
        name: 'Beta',
        slug: 'beta',
        worstState: 'up',
        app: {
          state: 'up',
          latencyMs: 100,
          lastCheckAt: '2026-11-23T11:55:00.000Z',
          consecutiveFailures: 0,
          lastError: null,
        },
      }),
      makeAdminApp(),
    ],
    lastCheckAt: '2026-11-23T11:55:00.000Z',
    staleMinutes: 5,
    isStale: false,
    allPaused: false,
    ...overrides,
  };
}

describe('OverviewDesktop', () => {
  it('shows the first attention item as an app-detail alert', () => {
    render(
      <OverviewDesktop
        model={makeModel()}
        incidents={[]}
        now={now}
      />,
    );

    const alertLink = screen.getByRole('link', {
      name: /Alpha.*Ứng dụng.*3 lần lỗi liên tiếp/,
    });
    expect(alertLink).toHaveAttribute('href', '/admin/apps/app-alpha');
  });

  it('renders app rows in model order and keeps the table wrapper overflow-visible', () => {
    const { container } = render(
      <OverviewDesktop
        model={makeModel()}
        incidents={[]}
        now={now}
      />,
    );

    const table = screen.getByRole('table', {
      name: 'Tình trạng ứng dụng',
    });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      rows.map((row) => within(row).getByRole('link', { name: /^(Beta|Alpha)$/ }).textContent),
    ).toEqual(['Beta', 'Alpha']);
    expect(within(table).getByRole('columnheader', { name: 'Ứng dụng' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'App' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Supabase' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Độ trễ' })).toBeInTheDocument();

    const wrapper = table.parentElement;
    expect(wrapper).toHaveClass('overflow-visible');
    expect(wrapper?.className).not.toMatch(/overflow-(hidden|x-auto)/);
    expect(table).not.toHaveClass('border-separate');
    expect(container.querySelector('thead .sr-only')).toHaveTextContent('Thao tác');
  });

  it('renders incidents beside the table at xl and below it at narrower widths', () => {
    const { container } = render(
      <OverviewDesktop
        model={makeModel()}
        incidents={[recentIncident]}
        now={now}
      />,
    );

    const rails = screen.getAllByRole('heading', { name: 'Sự cố gần đây' });
    expect(rails).toHaveLength(2);
    const railWrappers = rails.map((heading) =>
      heading.closest('aside')?.parentElement,
    );
    expect(railWrappers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ className: expect.stringContaining('xl:hidden') }),
        expect.objectContaining({
          className: expect.stringContaining('hidden xl:block'),
        }),
      ]),
    );
    expect(container).toHaveTextContent('Alpha');
  });

  it('shows the stale-data banner when the model is stale', () => {
    render(
      <OverviewDesktop
        model={makeModel({ isStale: true, staleMinutes: 20 })}
        incidents={[]}
        now={now}
      />,
    );

    expect(screen.getByText(/Dữ liệu giám sát đang cũ/)).toBeInTheDocument();
  });
});
