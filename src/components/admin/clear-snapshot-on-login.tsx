'use client';

import { useEffect } from 'react';
import { clearAdminSnapshot } from '@/lib/pwa/snapshot';

export function ClearSnapshotOnLogin() {
  useEffect(() => {
    void clearAdminSnapshot();
  }, []);

  return null;
}
