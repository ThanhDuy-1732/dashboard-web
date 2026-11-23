import type { AdminOverviewModel } from '@/lib/admin/overview';

export const ADMIN_DB_NAME = 'ecosystem-admin';
export const ADMIN_DB_VERSION = 1;
export const ADMIN_SNAPSHOT_STORE = 'snapshots';
export const ADMIN_SNAPSHOT_KEY = 'overview';
export const ADMIN_SNAPSHOT_EVENT = 'admin-snapshot-updated';

export type AdminSnapshot = {
  version: 1;
  savedAt: string;
  model: AdminOverviewModel;
};

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ADMIN_DB_NAME, ADMIN_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ADMIN_SNAPSHOT_STORE)) {
        db.createObjectStore(ADMIN_SNAPSHOT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
    request.onblocked = () => reject(new Error('indexedDB open blocked'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(ADMIN_SNAPSHOT_STORE, mode);
      let result!: T;
      const request = run(tx.objectStore(ADMIN_SNAPSHOT_STORE));
      // A request succeeding only means the operation was queued; the write is
      // not durable until the transaction commits. Capture the value here and
      // settle the promise on tx.oncomplete, never on request.onsuccess.
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () =>
        reject(tx.error ?? request.error ?? new Error('indexedDB request failed'));
      tx.onabort = () =>
        reject(tx.error ?? request.error ?? new Error('indexedDB transaction aborted'));
    });
  } finally {
    // close() only drops new-transaction access; the in-flight transaction is
    // allowed to finish, and by now it has committed (or rejected).
    db.close();
  }
}

export function dispatchSnapshotUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_SNAPSHOT_EVENT));
}

export async function saveAdminSnapshot(model: AdminOverviewModel): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const snapshot: AdminSnapshot = {
      version: 1,
      savedAt: new Date().toISOString(),
      model,
    };
    await withStore('readwrite', (store) => store.put(snapshot, ADMIN_SNAPSHOT_KEY));
    dispatchSnapshotUpdated();
  } catch (error) {
    console.error('failed to save admin snapshot', error);
  }
}

export async function loadAdminSnapshot(): Promise<AdminSnapshot | null> {
  if (!hasIndexedDb()) return null;
  try {
    const value = await withStore<unknown>('readonly', (store) =>
      store.get(ADMIN_SNAPSHOT_KEY),
    );
    if (
      value &&
      typeof value === 'object' &&
      (value as AdminSnapshot).version === 1 &&
      typeof (value as AdminSnapshot).savedAt === 'string' &&
      (value as AdminSnapshot).model
    ) {
      return value as AdminSnapshot;
    }
    return null;
  } catch (error) {
    console.error('failed to load admin snapshot', error);
    return null;
  }
}

export async function clearAdminSnapshot(): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    await withStore('readwrite', (store) => store.delete(ADMIN_SNAPSHOT_KEY));
  } catch (error) {
    console.error('failed to clear admin snapshot', error);
  }
}
