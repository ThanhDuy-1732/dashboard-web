import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOverviewModel } from '@/lib/admin/overview';

const mocks = vi.hoisted(() => ({
  loadAdminSnapshot: vi.fn(),
}));

vi.mock('@/lib/pwa/snapshot', () => ({
  ADMIN_SNAPSHOT_EVENT: 'admin-snapshot-updated',
  loadAdminSnapshot: mocks.loadAdminSnapshot,
}));

const SNAPSHOT_EVENT = 'admin-snapshot-updated';

import { AdminBadge } from '@/components/admin/admin-badge';

function snapshotWithDown(down: number) {
  const model: AdminOverviewModel = {
    counts: {
      apps: { up: 0, down, unknown: 0, off: 0, paused: 0 },
      targets: { up: 0, down, unknown: 0, off: 0 },
      monitoredTargets: down,
    },
    attention: [],
    apps: [],
    lastCheckAt: null,
    staleMinutes: null,
    isStale: false,
    allPaused: false,
  };
  return { version: 1 as const, savedAt: '2026-11-23T12:00:00.000Z', model };
}

describe('AdminBadge', () => {
  let setAppBadge: ReturnType<typeof vi.fn>;
  let clearAppBadge: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAdminSnapshot.mockReset();
    mocks.loadAdminSnapshot.mockResolvedValue(null);
    setAppBadge = vi.fn(async () => {});
    clearAppBadge = vi.fn(async () => {});
    Object.defineProperty(navigator, 'setAppBadge', {
      configurable: true,
      value: setAppBadge,
    });
    Object.defineProperty(navigator, 'clearAppBadge', {
      configurable: true,
      value: clearAppBadge,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'setAppBadge');
    Reflect.deleteProperty(navigator, 'clearAppBadge');
  });

  it('sets the badge to the server-provided down target count', async () => {
    const { container } = render(<AdminBadge downTargetCount={2} />);

    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(2));
    expect(clearAppBadge).not.toHaveBeenCalled();
    expect(mocks.loadAdminSnapshot).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('clears the badge when the down count is zero', async () => {
    render(<AdminBadge downTargetCount={0} />);

    await waitFor(() => expect(clearAppBadge).toHaveBeenCalledOnce());
    expect(setAppBadge).not.toHaveBeenCalled();
  });

  it('falls back to the snapshot count and refreshes on snapshot updates', async () => {
    mocks.loadAdminSnapshot.mockResolvedValue(snapshotWithDown(1));

    render(<AdminBadge />);
    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(1));

    mocks.loadAdminSnapshot.mockResolvedValue(snapshotWithDown(3));
    act(() => {
      window.dispatchEvent(new Event(SNAPSHOT_EVENT));
    });

    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(3));
  });

  it('clears the badge when a snapshot update reports no down targets', async () => {
    mocks.loadAdminSnapshot.mockResolvedValue(snapshotWithDown(2));

    render(<AdminBadge />);
    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(2));

    mocks.loadAdminSnapshot.mockResolvedValue(snapshotWithDown(0));
    act(() => {
      window.dispatchEvent(new Event(SNAPSHOT_EVENT));
    });

    await waitFor(() => expect(clearAppBadge).toHaveBeenCalled());
  });

  it('does not throw when badge APIs are unsupported', () => {
    Reflect.deleteProperty(navigator, 'setAppBadge');
    Reflect.deleteProperty(navigator, 'clearAppBadge');

    expect(() => render(<AdminBadge downTargetCount={2} />)).not.toThrow();
  });

  it('does not throw when a badge promise rejects', async () => {
    setAppBadge.mockRejectedValueOnce(new Error('permission denied'));

    expect(() => render(<AdminBadge downTargetCount={2} />)).not.toThrow();
    await waitFor(() => expect(setAppBadge).toHaveBeenCalledWith(2));
  });
});
