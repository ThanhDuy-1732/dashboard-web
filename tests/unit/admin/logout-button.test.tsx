import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearAdminSnapshot: vi.fn(async () => {}),
  logoutAction: vi.fn(async () => {}),
}));

vi.mock('@/lib/pwa/snapshot', () => ({
  clearAdminSnapshot: mocks.clearAdminSnapshot,
}));
vi.mock('@/app/admin/login/actions', () => ({
  logoutAction: mocks.logoutAction,
}));

import { LogoutButton } from '@/components/admin/logout-button';

function submitLogout() {
  const button = screen.getByRole('button', { name: 'Đăng xuất' });
  fireEvent.submit(button.closest('form') as HTMLFormElement);
}

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the snapshot before calling the logout action', async () => {
    render(<LogoutButton />);
    submitLogout();

    await waitFor(() => {
      expect(mocks.logoutAction).toHaveBeenCalledTimes(1);
    });
    expect(mocks.clearAdminSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.clearAdminSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.logoutAction.mock.invocationCallOrder[0],
    );
  });

  it('still logs out when clearing rejects', async () => {
    mocks.clearAdminSnapshot.mockRejectedValueOnce(new Error('idb gone'));
    render(<LogoutButton />);
    submitLogout();

    await waitFor(() => {
      expect(mocks.logoutAction).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the sidebar variant styling', () => {
    render(<LogoutButton variant="sidebar" />);
    const button = screen.getByRole('button', { name: 'Đăng xuất' });
    expect(button).toHaveClass('text-white/70');
  });

  it('keeps the light variant styling by default', () => {
    render(<LogoutButton />);
    const button = screen.getByRole('button', { name: 'Đăng xuất' });
    expect(button).toHaveClass('border-line');
  });
});
