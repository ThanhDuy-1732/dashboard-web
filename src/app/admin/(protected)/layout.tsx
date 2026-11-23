import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { ConnectivityBanner } from '@/components/admin/connectivity-banner';
import { AdminInstallPrompt } from '@/components/admin/install-prompt';
import { AdminShell } from '@/components/admin/shell/admin-shell';
import { requireAdmin } from '@/lib/auth/admin';

export const instant = false;

async function ProtectedAdminContent({ children }: { children: ReactNode }) {
  await connection();
  await requireAdmin();

  return (
    <AdminShell>
      <ConnectivityBanner />
      <AdminInstallPrompt />
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ProtectedAdminContent>{children}</ProtectedAdminContent>
    </Suspense>
  );
}
