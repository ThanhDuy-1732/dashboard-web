'use client';

import { useEffect, useRef } from 'react';
import type { AdminOverviewModel } from '@/lib/admin/overview';
import { saveAdminSnapshot } from '@/lib/pwa/snapshot';

export function AdminSnapshotWriter({ model }: { model: AdminOverviewModel }) {
  const lastSerialized = useRef<string | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(model);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;
    void saveAdminSnapshot(model);
  }, [model]);

  return null;
}
