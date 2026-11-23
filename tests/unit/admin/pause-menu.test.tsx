import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  pauseMonitoringAction: vi.fn(),
  resumeMonitoringAction: vi.fn(),
}));

vi.mock('@/app/admin/(protected)/apps/actions', () => actions);

import { PauseMenu } from '@/components/admin/pause-menu';

function openMenu() {
  fireEvent.click(screen.getByLabelText('Tùy chọn giám sát'));
}

describe('PauseMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a compact ⋯ trigger with an accessible label', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);

    const trigger = screen.getByLabelText('Tùy chọn giám sát');
    expect(trigger).toHaveTextContent('⋯');
  });

  it('gives the trigger a 44px minimum tap target', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);

    const trigger = screen.getByLabelText('Tùy chọn giám sát');
    expect(trigger).toHaveClass('min-h-11', 'min-w-11');
  });

  it('calls the pause action with 30 minutes', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng 30 phút' }));

    expect(actions.pauseMonitoringAction).toHaveBeenCalledWith('app-alpha', 30);
  });

  it('calls the pause action with 60 minutes', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng 60 phút' }));

    expect(actions.pauseMonitoringAction).toHaveBeenCalledWith('app-alpha', 60);
  });

  it('offers resume when paused and calls the resume action', () => {
    render(<PauseMenu appId="app-alpha" paused />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục giám sát' }));

    expect(actions.resumeMonitoringAction).toHaveBeenCalledWith('app-alpha');
    expect(actions.pauseMonitoringAction).not.toHaveBeenCalled();
  });

  it('adds an edit link when showEdit is set', () => {
    render(<PauseMenu appId="app-alpha" paused={false} showEdit />);
    openMenu();

    expect(screen.getByRole('link', { name: 'Sửa' })).toHaveAttribute(
      'href',
      '/admin/apps/app-alpha/edit',
    );
  });

  it('omits the edit link by default', () => {
    render(<PauseMenu appId="app-alpha" paused={false} />);
    openMenu();

    expect(screen.queryByRole('link', { name: 'Sửa' })).not.toBeInTheDocument();
  });
});
