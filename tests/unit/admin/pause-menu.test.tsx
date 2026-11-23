import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  pauseMonitoringAction: vi.fn(),
  resumeMonitoringAction: vi.fn(),
}));

vi.mock('@/app/admin/(protected)/apps/actions', () => actions);

import { PauseMenu } from '@/components/admin/pause-menu';

describe('PauseMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the pause action with 30 minutes', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);
    fireEvent.click(screen.getByText('Tùy chọn giám sát'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng 30 phút' }));

    expect(actions.pauseMonitoringAction).toHaveBeenCalledWith('app-alpha', 30);
  });

  it('calls the pause action with 60 minutes', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);
    fireEvent.click(screen.getByText('Tùy chọn giám sát'));
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng 60 phút' }));

    expect(actions.pauseMonitoringAction).toHaveBeenCalledWith('app-alpha', 60);
  });

  it('offers resume when paused and calls the resume action', () => {
    render(<PauseMenu appId="app-alpha" paused />);
    fireEvent.click(screen.getByText('Tùy chọn giám sát'));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục giám sát' }));

    expect(actions.resumeMonitoringAction).toHaveBeenCalledWith('app-alpha');
    expect(actions.pauseMonitoringAction).not.toHaveBeenCalled();
  });
});
