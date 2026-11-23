'use client';

import { useEffect } from 'react';
import { registerAdminServiceWorker } from '@/lib/pwa/register';

export function AdminServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    registerAdminServiceWorker(navigator).catch((error) => {
      console.error('admin service worker registration failed', error);
    });
  }, []);

  return null;
}
