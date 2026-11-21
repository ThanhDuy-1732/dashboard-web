import Link from 'next/link';
import { logoutAction } from '@/app/admin/login/actions';
import { requireAdmin } from '@/lib/auth/admin';

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="admin-theme min-h-dvh bg-paper text-ink">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/admin" className="font-display text-lg font-semibold tracking-tight">
            Quản trị
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink/60">
            <Link href="/admin" className="hover:text-ink">
              Tổng quan
            </Link>
            <Link href="/admin/apps" className="hover:text-ink">
              Ứng dụng
            </Link>
            <Link href="/admin/settings" className="hover:text-ink">
              Cài đặt
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-ink/40 hover:text-ink">
                Đăng xuất
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
