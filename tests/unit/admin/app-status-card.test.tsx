import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppStatusCard } from '@/components/admin/app-status-card';
import { makeAdminApp } from './fixtures';

describe('AppStatusCard', () => {
  it('shows the down state and links to app details', () => {
    render(<AppStatusCard app={makeAdminApp()} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/apps/app-alpha');
    expect(within(link).getByText('Lỗi')).toBeInTheDocument();
    expect(within(link).getByText('Alpha')).toBeInTheDocument();
  });

  it('shows one paused pill and a note without target rows', () => {
    render(
      <AppStatusCard app={makeAdminApp({ paused: true, worstState: 'paused' })} />,
    );

    expect(screen.getAllByText('Tạm dừng')).toHaveLength(1);
    expect(screen.getByText(/đang tạm dừng theo dõi/i)).toBeInTheDocument();
    expect(screen.queryByText('App')).not.toBeInTheDocument();
    expect(screen.queryByText('Supabase')).not.toBeInTheDocument();
  });

  it('renders a non-interactive div when offline', () => {
    const { container } = render(<AppStatusCard app={makeAdminApp()} offline />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
