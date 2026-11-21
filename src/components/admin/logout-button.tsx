'use client';

import { logoutAction } from '@/app/admin/login/actions';

export function LogoutButton() {
  return (
    <form action={logoutAction} className="mt-6 border-t border-white/15 pt-4">
      <button
        type="submit"
        className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Đăng xuất
      </button>
    </form>
  );
}
