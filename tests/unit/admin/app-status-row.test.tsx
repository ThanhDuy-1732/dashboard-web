import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/app/admin/(protected)/apps/actions', () => ({
  pauseMonitoringAction: vi.fn(),
  resumeMonitoringAction: vi.fn(),
}));

import { AppStatusRow } from '@/components/admin/app-status-row';
import { makeAdminApp } from './fixtures';

function renderRow(app = makeAdminApp()) {
  return render(
    <table>
      <tbody>
        <AppStatusRow app={app} />
      </tbody>
    </table>,
  );
}

describe('AppStatusRow', () => {
  it('highlights a down app and labels it as an error', () => {
    renderRow();

    const row = screen.getByRole('row');
    expect(row).toHaveClass('bg-bad-bg', 'border-l-4', 'border-l-bad-fg');
    expect(within(row).getByText('Lỗi')).toBeInTheDocument();
  });

  it('shows paused pills instead of both target states', () => {
    renderRow(
      makeAdminApp({
        paused: true,
        worstState: 'paused',
      }),
    );

    const row = screen.getByRole('row');
    expect(within(row).getAllByText('Tạm dừng')).toHaveLength(2);
    expect(within(row).queryByText('Lỗi')).not.toBeInTheDocument();
    expect(within(row).queryByText('Ổn')).not.toBeInTheDocument();
  });

  it('does not dim the paused row with element opacity', () => {
    renderRow(makeAdminApp({ paused: true, worstState: 'paused' }));

    expect(screen.getByRole('row').className).not.toMatch(/opacity-/);
  });

  it('labels unmonitored targets as off', () => {
    renderRow(makeAdminApp({ app: null, supabase: null, worstState: 'off' }));

    expect(within(screen.getByRole('row')).getAllByText('Tắt')).toHaveLength(2);
  });

  it('uses app latency first, falls back to Supabase, and hides latency when paused', () => {
    const { rerender } = render(
      <table>
        <tbody>
          <AppStatusRow app={makeAdminApp()} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('420 ms')).toBeInTheDocument();

    rerender(
      <table>
        <tbody>
          <AppStatusRow app={makeAdminApp({ app: null })} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('180 ms')).toBeInTheDocument();

    rerender(
      <table>
        <tbody>
          <AppStatusRow app={makeAdminApp({ paused: true })} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('offers an edit link through the row menu', () => {
    renderRow();

    const row = screen.getByRole('row');
    expect(within(row).getByRole('link', { name: 'Sửa' })).toHaveAttribute(
      'href',
      '/admin/apps/app-alpha/edit',
    );
  });
});
