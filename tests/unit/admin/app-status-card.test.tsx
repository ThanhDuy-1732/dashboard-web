import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppStatusCard } from '@/components/admin/app-status-card';
import { makeAdminApp } from './fixtures';

const now = new Date('2026-11-23T12:00:00.000Z');

describe('AppStatusCard', () => {
  it('shows the worst-state pill and links to app details', () => {
    render(<AppStatusCard app={makeAdminApp()} now={now} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/apps/app-alpha');
    expect(within(link).getByText('Alpha')).toBeInTheDocument();

    const worst = screen.getByTestId('app-worst-state');
    expect(worst.querySelector('[data-state]')).toHaveAttribute('data-state', 'down');
    expect(within(worst).getByText('Lỗi')).toBeInTheDocument();
  });

  it('shows the latest check time relative to now', () => {
    render(<AppStatusCard app={makeAdminApp()} now={now} />);

    expect(screen.getByText(/5 phút trước/)).toBeInTheDocument();
  });

  it('marks hidden apps with a Đang ẩn badge', () => {
    render(<AppStatusCard app={makeAdminApp({ isVisible: false })} now={now} />);

    expect(screen.getByText('Đang ẩn')).toBeInTheDocument();
  });

  it('shows one paused pill and a note without target rows', () => {
    render(
      <AppStatusCard
        app={makeAdminApp({ paused: true, worstState: 'paused' })}
        now={now}
      />,
    );

    expect(screen.getAllByText('Tạm dừng')).toHaveLength(1);
    expect(
      screen.getByTestId('app-worst-state').querySelector('[data-state]'),
    ).toHaveAttribute('data-state', 'paused');
    expect(screen.getByText(/đang tạm dừng theo dõi/i)).toBeInTheDocument();
    expect(screen.queryByText('App')).not.toBeInTheDocument();
    expect(screen.queryByText('Supabase')).not.toBeInTheDocument();
  });

  it('does not dim the paused card with element opacity', () => {
    const { container } = render(
      <AppStatusCard
        app={makeAdminApp({ paused: true, worstState: 'paused' })}
        now={now}
      />,
    );

    expect(container.querySelector('[class*="opacity-"]')).toBeNull();
  });

  it('renders a non-interactive div when offline', () => {
    const { container } = render(
      <AppStatusCard app={makeAdminApp()} now={now} offline />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
