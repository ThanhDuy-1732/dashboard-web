'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { shouldRegisterPublicSw } from '@/lib/pwa/register';

export function ServiceWorkerRegister() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    if (!shouldRegisterPublicSw(pathname ?? '')) return;

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('service worker registration failed', error);
    });
  }, [pathname]);

  return null;
}
