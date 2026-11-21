import Link from 'next/link';
import { LogoutButton } from '@/components/admin/logout-button';
import { adminNavItems } from '@/components/admin/shell/admin-nav-items';
import { AdminNavLink } from '@/components/admin/shell/admin-nav-link';

export function AdminSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col bg-ink px-4 py-6 text-white lg:flex">
      <Link
        href="/admin"
        className="mb-9 rounded-md px-3 font-display text-xl font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        Ecosystem
      </Link>
      <nav
        aria-label="Điều hướng quản trị"
        className="flex flex-1 flex-col gap-1"
      >
        {adminNavItems.map((item) => (
          <AdminNavLink
            key={item.href}
            {...item}
            variant="sidebar"
          />
        ))}
      </nav>
      <div className="mt-6 border-t border-white/15 pt-4">
        <LogoutButton variant="sidebar" />
      </div>
    </aside>
  );
}
