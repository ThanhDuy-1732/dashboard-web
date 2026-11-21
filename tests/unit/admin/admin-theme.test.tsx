import { render, screen } from '@testing-library/react';
import { Suspense, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const { connection, requireAdmin } = vi.hoisted(() => ({
  connection: vi.fn(async () => {}),
  requireAdmin: vi.fn(async () => {}),
}));

vi.mock('next/server', () => ({
  connection,
}));

vi.mock('@/lib/auth/admin', () => ({
  requireAdmin,
}));

vi.mock('@/app/admin/login/actions', () => ({
  loginAction: vi.fn(),
  logoutAction: vi.fn(),
}));

import AdminLayout from '@/app/admin/(protected)/layout';
import LoginPage from '@/app/admin/login/page';
import { LogoutButton } from '@/components/admin/logout-button';
import { AdminShell } from '@/components/admin/shell/admin-shell';
import { AdminSidebar } from '@/components/admin/shell/admin-sidebar';

type ProtectedAdminContentProps = { children: ReactNode };
type ProtectedAdminContent = (
  props: ProtectedAdminContentProps,
) => Promise<ReactNode>;

async function renderProtectedAdminContent(children: ReactNode) {
  const layout = AdminLayout({ children });
  const protectedContent = layout.props.children as ReactElement<ProtectedAdminContentProps>;
  return (protectedContent.type as ProtectedAdminContent)(protectedContent.props);
}

describe('admin theme scope', () => {
  it('applies admin-theme to the protected admin layout', async () => {
    const { container } = render(await renderProtectedAdminContent(<div />));

    expect(container.firstElementChild).toHaveClass('admin-theme');
  });

  it('waits for a request before checking admin access', async () => {
    connection.mockClear();
    requireAdmin.mockClear();

    await renderProtectedAdminContent(<div />);

    expect(connection).toHaveBeenCalledOnce();
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(connection.mock.invocationCallOrder[0]).toBeLessThan(
      requireAdmin.mock.invocationCallOrder[0],
    );
  });

  it('places protected admin rendering behind a Suspense boundary', async () => {
    const layout = AdminLayout({ children: <div /> });

    expect(layout.type).toBe(Suspense);
  });

  it('applies admin-theme to the admin login page', async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('main')).toHaveClass('admin-theme');
  });

  it('uses a 1280px content width and 16px mobile gutters', () => {
    render(
      <AdminShell>
        <div>Content</div>
      </AdminShell>,
    );

    expect(screen.getByRole('main')).toHaveClass('max-w-7xl', 'px-4', 'sm:px-8');
    expect(screen.getByRole('main')).not.toHaveClass('max-w-5xl', 'px-5');
  });

  it('uses a light default logout style without sidebar chrome', () => {
    render(<LogoutButton />);

    const button = screen.getByRole('button', { name: 'Đăng xuất' });
    const form = button.closest('form');

    expect(form).not.toHaveClass('mt-6', 'border-t', 'border-white/15', 'pt-4');
    expect(button).toHaveClass('text-muted', 'border-line', 'hover:bg-paper');
    expect(button).not.toHaveClass('text-white/70', 'focus-visible:outline-white');
  });

  it('uses Ecosystem branding and keeps dark logout chrome in the sidebar', () => {
    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: 'Ecosystem' })).toHaveAttribute(
      'href',
      '/admin',
    );
    const button = screen.getByRole('button', { name: 'Đăng xuất' });
    expect(button).toHaveClass('text-white/70', 'focus-visible:outline-white');
    expect(button.closest('form')?.parentElement).toHaveClass(
      'mt-6',
      'border-t',
      'border-white/15',
      'pt-4',
    );
  });
});
