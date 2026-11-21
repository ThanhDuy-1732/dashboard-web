import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminMobileNav } from '@/components/admin/shell/admin-mobile-nav';

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn((): string | null => '/admin/apps'),
}));

vi.mock('next/navigation', () => ({
  usePathname,
}));

describe('admin navigation', () => {
  beforeEach(() => {
    usePathname.mockReturnValue('/admin/apps');
  });

  it('marks only the matching link active and labels the navigation', () => {
    render(<AdminMobileNav />);

    expect(screen.getByRole('link', { name: /Ứng dụng/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Tổng quan/ })).not.toHaveAttribute(
      'aria-current',
    );
    expect(
      screen.getByRole('navigation', { name: 'Điều hướng quản trị' }),
    ).toBeInTheDocument();
  });

  it('matches the overview link exactly, not for nested admin routes', () => {
    usePathname.mockReturnValue('/admin/apps');
    const { rerender } = render(<AdminMobileNav />);

    expect(screen.getByRole('link', { name: /Tổng quan/ })).not.toHaveAttribute(
      'aria-current',
    );

    usePathname.mockReturnValue('/admin');
    rerender(<AdminMobileNav />);

    expect(screen.getByRole('link', { name: /Tổng quan/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders without an active link when the pathname is unavailable', () => {
    usePathname.mockReturnValue(null);

    render(<AdminMobileNav />);

    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });
});
