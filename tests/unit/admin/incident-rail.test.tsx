import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IncidentRail } from '@/components/admin/incident-rail';
import { recentIncident } from './fixtures';

describe('IncidentRail', () => {
  it('shows app, target, start, open status, and paused note', () => {
    render(<IncidentRail incidents={[recentIncident]} />);

    expect(screen.getByRole('heading', { name: 'Sự cố gần đây' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Ứng dụng')).toBeInTheDocument();
    expect(screen.getByText(/21\/11\/2026 19:00/)).toBeInTheDocument();
    expect(screen.getByText('đang mở')).toBeInTheDocument();
    expect(screen.getByText('Tạm dừng theo dõi')).toBeInTheDocument();
  });

  it('shows the resolved time for a resolved incident', () => {
    render(
      <IncidentRail
        incidents={[
          {
            ...recentIncident,
            app_paused: false,
            resolved_at: new Date('2026-11-21T13:00:00.000Z'),
          },
        ]}
      />,
    );

    expect(screen.getByText(/21\/11\/2026 20:00/)).toBeInTheDocument();
    expect(screen.queryByText('đang mở')).not.toBeInTheDocument();
    expect(screen.queryByText('Tạm dừng theo dõi')).not.toBeInTheDocument();
  });

  it('shows an empty state for an empty incident list', () => {
    render(<IncidentRail incidents={[]} />);

    expect(screen.getByText('Không có sự cố')).toBeInTheDocument();
  });
});
