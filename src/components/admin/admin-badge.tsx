'use client';

import { useEffect } from 'react';
import { ADMIN_SNAPSHOT_EVENT, loadAdminSnapshot } from '@/lib/pwa/snapshot';

export function AdminBadge({ downTargetCount }: { downTargetCount?: number }) {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (
      typeof navigator.setAppBadge !== 'function' ||
      typeof navigator.clearAppBadge !== 'function'
    ) {
      return;
    }

    let active = true;

    const apply = (count: number) => {
      if (!active) return;
      try {
        const result =
          count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
        void Promise.resolve(result).catch(() => {});
      } catch {
        // Badging can be blocked by the browser; never surface as an error.
      }
    };

    if (downTargetCount !== undefined) {
      apply(downTargetCount);
      return () => {
        active = false;
      };
    }

    const refresh = () => {
      void loadAdminSnapshot()
        .then((snapshot) => {
          if (!active || !snapshot) return;
          apply(snapshot.model.counts.targets.down);
        })
        .catch(() => {});
    };

    refresh();
    window.addEventListener(ADMIN_SNAPSHOT_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(ADMIN_SNAPSHOT_EVENT, refresh);
    };
  }, [downTargetCount]);

  return null;
}
