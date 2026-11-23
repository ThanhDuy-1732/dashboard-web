import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AdminOverviewCounts } from '@/lib/admin/overview';
import { StatusSummaryStrip } from '@/components/admin/status-summary-strip';

function makeCounts(
  overrides: Partial<AdminOverviewCounts> = {},
): AdminOverviewCounts {
  return {
    apps: { up: 5, down: 1, unknown: 0, off: 0, paused: 0 },
    targets: { up: 12, down: 1, unknown: 0, off: 0 },
    monitoredTargets: 13,
    ...overrides,
  };
}

describe('StatusSummaryStrip', () => {
  it('shows app counts and the target subline', () => {
    render(<StatusSummaryStrip counts={makeCounts()} appCount={6} />);

    expect(screen.getByText('Theo ứng dụng')).toBeInTheDocument();
    expect(screen.getByText('Ổn')).toBeInTheDocument();
    expect(screen.getByText('Lỗi')).toBeInTheDocument();
    expect(screen.getByText('Chưa rõ')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/6 ứng dụng/)).toBeInTheDocument();
    expect(screen.getByText(/13 mục tiêu/)).toBeInTheDocument();
    expect(screen.getByText(/12\/13 mục tiêu ổn/)).toBeInTheDocument();
    expect(screen.queryByText('Tạm dừng')).not.toBeInTheDocument();
  });

  it('renders counts at the large 30px size from the spec', () => {
    render(<StatusSummaryStrip counts={makeCounts()} appCount={6} />);

    expect(screen.getByText('5').closest('dd')).toHaveClass('text-3xl');
  });

  it('adds the paused chip only when apps are paused', () => {
    render(
      <StatusSummaryStrip
        counts={makeCounts({
          apps: { up: 5, down: 1, unknown: 0, off: 0, paused: 2 },
        })}
        appCount={8}
      />,
    );

    expect(screen.getByText('Tạm dừng')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('reports that monitoring is off instead of a 0/0 target line', () => {
    render(
      <StatusSummaryStrip
        counts={makeCounts({
          targets: { up: 0, down: 0, unknown: 0, off: 3 },
          monitoredTargets: 0,
        })}
        appCount={3}
      />,
    );

    expect(screen.getByText(/Chưa bật giám sát/)).toBeInTheDocument();
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });

  it('does not add a chip for off apps', () => {
    render(
      <StatusSummaryStrip
        counts={makeCounts({
          apps: { up: 5, down: 1, unknown: 0, off: 2, paused: 0 },
        })}
        appCount={8}
      />,
    );

    expect(screen.queryByText('Tắt')).not.toBeInTheDocument();
  });
});
