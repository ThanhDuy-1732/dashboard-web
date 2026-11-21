import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/admin', () => ({
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock('@/app/admin/login/actions', () => ({
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
}));

import AdminLayout from '@/app/admin/(protected)/layout';
import LoginPage from '@/app/admin/login/page';

describe('admin theme scope', () => {
  it('applies admin-theme to the protected admin layout', async () => {
    const { container } = render(await AdminLayout({ children: <div /> }));

    expect(container.firstElementChild).toHaveClass('admin-theme');
  });

  it('applies admin-theme to the admin login page', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('main')).toHaveClass('admin-theme');
  });
});
