import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOverviewModel } from '@/lib/admin/overview';
import {
  clearAdminSnapshot,
  dispatchSnapshotUpdated,
  loadAdminSnapshot,
  saveAdminSnapshot,
} from '@/lib/pwa/snapshot';

const model: AdminOverviewModel = {
  counts: {
    apps: { up: 1, down: 1, unknown: 0, off: 0, paused: 0 },
    targets: { up: 1, down: 1, unknown: 0, off: 2 },
    monitoredTargets: 2,
  },
  attention: [
    {
      appId: 'app-alpha',
      appName: 'Alpha',
      target: 'app',
      state: 'down',
      consecutiveFailures: 3,
      lastCheckAt: '2026-11-23T11:55:00.000Z',
      lastError: 'Timeout',
    },
  ],
  apps: [
    {
      id: 'app-alpha',
      name: 'Alpha',
      slug: 'alpha',
      iconUrl: null,
      isVisible: true,
      paused: false,
      worstState: 'down',
      app: {
        state: 'down',
        latencyMs: 420,
        lastCheckAt: '2026-11-23T11:55:00.000Z',
        consecutiveFailures: 3,
        lastError: 'Timeout',
      },
      supabase: null,
    },
  ],
  lastCheckAt: '2026-11-23T11:55:00.000Z',
  staleMinutes: 5,
  isStale: false,
  allPaused: false,
};

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('ecosystem-admin');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  vi.setSystemTime(new Date('2026-11-23T12:00:00.000Z'));
  await deleteDatabase();
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await deleteDatabase();
});

describe('admin snapshot storage', () => {
  it('saves and loads the model with version 1 and an ISO savedAt', async () => {
    await saveAdminSnapshot(model);

    const snapshot = await loadAdminSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.version).toBe(1);
    expect(snapshot?.savedAt).toBe('2026-11-23T12:00:00.000Z');
    expect(snapshot?.model).toEqual(model);
  });

  it('commits the write before resolving (load sees the snapshot right after save)', async () => {
    await saveAdminSnapshot(model);
    // A brand-new read must observe the committed value immediately: resolving
    // on request.onsuccess instead of tx.oncomplete could return before commit.
    expect(await loadAdminSnapshot()).not.toBeNull();
    expect((await loadAdminSnapshot())?.model).toEqual(model);
  });

  it('surfaces a commit-time abort instead of resolving on request success', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const commitError = new Error('commit failed');

    vi.stubGlobal('indexedDB', {
      open: () => {
        const openRequest: Record<string, unknown> = {
          result: {
            objectStoreNames: { contains: () => true },
            createObjectStore: () => {},
            close: () => {},
            transaction: () => {
              const storeRequest: Record<string, unknown> = {};
              const tx: Record<string, unknown> = {
                error: commitError,
                objectStore: () => ({
                  put: () => storeRequest,
                  delete: () => storeRequest,
                  get: () => storeRequest,
                }),
              };
              queueMicrotask(() => {
                // The request succeeds, but the transaction aborts at commit.
                if (typeof storeRequest.onsuccess === 'function') {
                  (storeRequest.onsuccess as () => void)();
                }
                if (typeof tx.onabort === 'function') {
                  (tx.onabort as () => void)();
                }
              });
              return tx;
            },
          },
        };
        queueMicrotask(() => {
          if (typeof openRequest.onsuccess === 'function') {
            (openRequest.onsuccess as () => void)();
          }
        });
        return openRequest;
      },
    });

    await saveAdminSnapshot(model);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('returns null when no snapshot exists', async () => {
    expect(await loadAdminSnapshot()).toBeNull();
  });

  it('clears the snapshot so load returns null', async () => {
    await saveAdminSnapshot(model);
    await clearAdminSnapshot();

    expect(await loadAdminSnapshot()).toBeNull();
  });

  it('overwrites the previous snapshot on save', async () => {
    await saveAdminSnapshot(model);
    const updated = { ...model, allPaused: true };
    await saveAdminSnapshot(updated);

    const snapshot = await loadAdminSnapshot();
    expect(snapshot?.model).toEqual(updated);
  });

  it('ignores snapshots with an unexpected version', async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('ecosystem-admin', 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('snapshots');
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').put(
          { version: 2, savedAt: 'x', model },
          'overview',
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });

    expect(await loadAdminSnapshot()).toBeNull();
  });

  it('dispatches admin-snapshot-updated on save', async () => {
    const listener = vi.fn();
    window.addEventListener('admin-snapshot-updated', listener);
    try {
      await saveAdminSnapshot(model);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    } finally {
      window.removeEventListener('admin-snapshot-updated', listener);
    }
  });

  it('dispatchSnapshotUpdated fires the event without writing', async () => {
    const listener = vi.fn();
    window.addEventListener('admin-snapshot-updated', listener);
    try {
      dispatchSnapshotUpdated();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(await loadAdminSnapshot()).toBeNull();
    } finally {
      window.removeEventListener('admin-snapshot-updated', listener);
    }
  });

  it('does not throw when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(saveAdminSnapshot(model)).resolves.toBeUndefined();
    expect(await loadAdminSnapshot()).toBeNull();
    await expect(clearAdminSnapshot()).resolves.toBeUndefined();

    errorSpy.mockRestore();
  });

  it('logs and resolves when IndexedDB open fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('boom');
      },
    });

    await expect(saveAdminSnapshot(model)).resolves.toBeUndefined();
    expect(await loadAdminSnapshot()).toBeNull();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
