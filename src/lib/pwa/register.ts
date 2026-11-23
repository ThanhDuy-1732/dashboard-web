const ADMIN_PREFIX = '/admin';

export async function registerAdminServiceWorker(nav: Navigator): Promise<void> {
  await nav.serviceWorker.register('/admin/sw.js', { scope: ADMIN_PREFIX });
}

export function shouldRegisterPublicSw(pathname: string): boolean {
  return !(pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`));
}
