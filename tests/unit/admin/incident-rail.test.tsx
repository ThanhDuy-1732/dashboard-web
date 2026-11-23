import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IncidentRail } from '@/components/admin/incident-rail';
import { recentIncident } from './fixtures';

const now = new Date('2026-11-23T12:00:00.000Z');

describe('IncidentRail', () => {
  it('shows app, target, start, open duration, and paused note', () => {
    render(<IncidentRail incidents={[recentIncident]} now={now} />);

    expect(screen.getByRole('heading', { name: 'Sự cố gần đây' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Ứng dụng')).toBeInTheDocument();
    expect(screen.getByText(/21\/11\/2026 19:00/)).toBeInTheDocument();
    expect(screen.getByText('Đang mở 2 ngày')).toBeInTheDocument();
    expect(screen.getByText('Tạm dừng theo dõi')).toBeInTheDocument();
  });

  it('shows the resolved time and duration for a resolved incident', () => {
    render(
      <IncidentRail
        incidents={[
          {
            ...recentIncident,
            app_paused: false,
            resolved_at: new Date('2026-11-21T13:00:00.000Z'),
          },
        ]}
        now={now}
      />,
    );

    expect(screen.getByText(/21\/11\/2026 20:00/)).toBeInTheDocument();
    expect(screen.getByText('Kéo dài 1 giờ')).toBeInTheDocument();
    expect(screen.queryByText(/Đang mở/)).not.toBeInTheDocument();
    expect(screen.queryByText('Tạm dừng theo dõi')).not.toBeInTheDocument();
  });

  it('shows a minute-scale duration for a recent incident', () => {
    const recentOpen = {
      ...recentIncident,
      started_at: new Date('2026-11-23T11:45:00.000Z'),
    };

    render(<IncidentRail incidents={[recentOpen]} now={now} />);

    expect(screen.getByText('Đang mở 15 phút')).toBeInTheDocument();
  });

  it('shows an empty state for an empty incident list', () => {
    render(<IncidentRail incidents={[]} now={now} />);

    expect(screen.getByText('Không có sự cố')).toBeInTheDocument();
  });
});
