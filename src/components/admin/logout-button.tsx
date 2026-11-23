'use client';

import { logoutAction } from '@/app/admin/login/actions';
import { clearAdminSnapshot } from '@/lib/pwa/snapshot';

type LogoutButtonProps = {
  variant?: 'sidebar' | 'light';
};

export function LogoutButton({ variant = 'light' }: LogoutButtonProps) {
  const variantClasses =
    variant === 'sidebar'
      ? 'text-white/70 hover:bg-white/5 hover:text-white focus-visible:outline-white'
      : 'border border-line text-muted hover:bg-paper hover:text-ink focus-visible:outline-moss';

  async function handleLogout() {
    try {
      await clearAdminSnapshot();
    } catch (error) {
      console.error('failed to clear admin snapshot on logout', error);
    }
    await logoutAction();
  }

  return (
    <form action={handleLogout}>
      <button
        type="submit"
        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${variantClasses}`}
      >
        Đăng xuất
      </button>
    </form>
  );
}
