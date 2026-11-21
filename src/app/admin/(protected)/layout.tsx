import { AdminShell } from '@/components/admin/shell/admin-shell';
import { requireAdmin } from '@/lib/auth/admin';

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <AdminShell>{children}</AdminShell>
  );
}
