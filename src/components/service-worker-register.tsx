'use client';

import { useEffect } from 'react';
import { shouldRegisterPublicSw } from '@/lib/pwa/register';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    if (!shouldRegisterPublicSw(window.location.pathname)) return;

    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('service worker registration failed', error);
    });
  }, []);

  return null;
}
