import { adminNavItems } from '@/components/admin/shell/admin-nav-items';
import { AdminNavLink } from '@/components/admin/shell/admin-nav-link';

export function AdminMobileNav() {
  return (
    <nav
      aria-label="Điều hướng quản trị"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 px-2 pt-1 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {adminNavItems.map((item) => (
        <AdminNavLink key={item.href} {...item} variant="mobile" />
      ))}
    </nav>
  );
}
