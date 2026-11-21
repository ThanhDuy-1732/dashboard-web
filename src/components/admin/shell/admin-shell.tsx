import type { ReactNode } from 'react';
import { AdminMobileNav } from '@/components/admin/shell/admin-mobile-nav';
import { AdminSidebar } from '@/components/admin/shell/admin-sidebar';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-theme min-h-dvh bg-paper text-ink">
      <AdminSidebar />
      <div className="min-h-dvh lg:pl-[232px]">
        <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-8 sm:px-8 lg:pb-8">
          {children}
        </main>
      </div>
      <AdminMobileNav />
    </div>
  );
}
