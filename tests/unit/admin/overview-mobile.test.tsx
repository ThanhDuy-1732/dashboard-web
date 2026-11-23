import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverviewMobile } from '@/components/admin/overview-mobile';
import type {
  AdminAttentionItem,
  AdminOverviewCounts,
  AdminOverviewModel,
} from '@/lib/admin/overview';
import { formatDateTime } from '@/lib/format';
import { makeAdminApp } from './fixtures';

const now = new Date('2026-11-23T12:00:00.000Z');
const savedAt = '2026-11-23T11:50:00.000Z';

const attention: AdminAttentionItem = {
  appId: 'app-alpha',
  appName: 'Alpha',
  target: 'app',
  state: 'down',
  consecutiveFailures: 3,
  lastCheckAt: '2026-11-23T11:55:00.000Z',
  lastError: 'Timeout',
};

const defaultCounts: AdminOverviewCounts = {
  apps: { up: 0, down: 1, unknown: 0, off: 0, paused: 0 },
  targets: { up: 1, down: 1, unknown: 0, off: 0 },
  monitoredTargets: 2,
};

function makeModel(
  overrides: Partial<AdminOverviewModel> = {},
): AdminOverviewModel {
  return {
    counts: defaultCounts,
    attention: [attention],
    apps: [makeAdminApp()],
    lastCheckAt: '2026-11-23T11:55:00.000Z',
    staleMinutes: 5,
    isStale: false,
    allPaused: false,
    ...overrides,
  };
}

function withCounts(
  apps: AdminOverviewCounts['apps'],
  targets: AdminOverviewCounts['targets'],
  monitoredTargets: number,
): AdminOverviewCounts {
  return { apps, targets, monitoredTargets };
}

describe('OverviewMobile', () => {
  it('shows the down hero with the healthy, failing, and last-check summary', () => {
    render(<OverviewMobile model={makeModel()} now={now} />);

    expect(screen.getByRole('heading', { name: '1 ứng dụng đang lỗi' })).toBeInTheDocument();
    expect(
      screen.getByText('0/1 ứng dụng ổn · 1 mục tiêu lỗi · 5 phút trước'),
    ).toBeInTheDocument();
  });

  it('shows the all-systems-healthy hero when every app is up', () => {
    const model = makeModel({
      counts: withCounts(
        { up: 1, down: 0, unknown: 0, off: 0, paused: 0 },
        { up: 2, down: 0, unknown: 0, off: 0 },
        2,
      ),
      apps: [
        makeAdminApp({
          worstState: 'up',
          app: {
            state: 'up',
            latencyMs: 120,
            lastCheckAt: '2026-11-23T11:55:00.000Z',
            consecutiveFailures: 0,
            lastError: null,
          },
        }),
      ],
      attention: [],
    });

    render(<OverviewMobile model={model} now={now} />);

    expect(
      screen.getByRole('heading', { name: 'Tất cả hệ thống ổn định' }),
    ).toBeInTheDocument();
  });

  it('shows the needs-checking hero when an app is unknown', () => {
    const model = makeModel({
      counts: withCounts(
        { up: 0, down: 0, unknown: 1, off: 0, paused: 0 },
        { up: 0, down: 0, unknown: 1, off: 1 },
        1,
      ),
    });

    render(<OverviewMobile model={model} now={now} />);

    expect(screen.getByRole('heading', { name: 'Cần kiểm tra' })).toBeInTheDocument();
  });

  it('shows the paused hero before other app status counts', () => {
    const model = makeModel({
      counts: withCounts(
        { up: 0, down: 1, unknown: 0, off: 0, paused: 1 },
        { up: 1, down: 0, unknown: 0, off: 1 },
        1,
      ),
      allPaused: true,
    });

    render(<OverviewMobile model={model} now={now} />);

    expect(
      screen.getByRole('heading', { name: 'Đang tạm dừng giám sát' }),
    ).toBeInTheDocument();
  });

  it('shows the monitoring-off hero when there are no monitored targets', () => {
    const model = makeModel({
      counts: withCounts(
        { up: 0, down: 0, unknown: 0, off: 1, paused: 0 },
        { up: 0, down: 0, unknown: 0, off: 2 },
        0,
      ),
      attention: [],
    });

    render(<OverviewMobile model={model} now={now} />);

    expect(
      screen.getByRole('heading', { name: 'Chưa bật giám sát' }),
    ).toBeInTheDocument();
  });

  it('shows the empty hero before the monitoring-off hero', () => {
    const model = makeModel({
      counts: withCounts(
        { up: 0, down: 0, unknown: 0, off: 0, paused: 0 },
        { up: 0, down: 0, unknown: 0, off: 0 },
        0,
      ),
      attention: [],
      apps: [],
    });

    render(<OverviewMobile model={model} now={now} />);

    expect(
      screen.getByRole('heading', { name: 'Chưa có ứng dụng nào' }),
    ).toBeInTheDocument();
  });

  it('shows a stale-data banner when the model is stale', () => {
    render(
      <OverviewMobile
        model={makeModel({ isStale: true, staleMinutes: 20 })}
        now={now}
      />,
    );

    expect(screen.getByText(/Dữ liệu giám sát đang cũ/)).toBeInTheDocument();
  });

  it('shows offline saved-at and last-check times', () => {
    render(
      <OverviewMobile
        model={makeModel()}
        now={now}
        offline
        savedAt={savedAt}
      />,
    );

    expect(
      screen.getByText(
        `Đang offline · Dữ liệu lúc ${formatDateTime(savedAt)} · Kiểm tra cuối 5 phút trước`,
      ),
    ).toBeInTheDocument();
  });

  it('renders no links or actions while offline', () => {
    const { container } = render(
      <OverviewMobile model={makeModel()} now={now} offline savedAt={savedAt} />,
    );

    expect(container.querySelectorAll('a, button')).toHaveLength(0);
    expect(screen.getAllByText('Alpha')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Cần chú ý' })).toBeInTheDocument();
  });

  it('does not render bottom navigation owned by the shell', () => {
    render(<OverviewMobile model={makeModel()} now={now} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
