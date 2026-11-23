'use client';

import { useEffect, useState } from 'react';

export function ConnectivityBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    // The first render matches the server output; connectivity is a
    // browser-only detail, so read it after hydration.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      queueMicrotask(() => {
        if (active) setOffline(true);
      });
    }

    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-warn-fg bg-warn-bg px-4 py-3 text-sm text-warn-fg"
    >
      <span className="font-semibold">Bạn đang offline</span>
      <span>Kiểm tra kết nối và thử lại.</span>
    </div>
  );
}
