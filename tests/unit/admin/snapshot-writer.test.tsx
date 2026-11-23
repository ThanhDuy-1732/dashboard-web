import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOverviewModel } from '@/lib/admin/overview';

const mocks = vi.hoisted(() => ({
  saveAdminSnapshot: vi.fn(async () => {}),
}));

vi.mock('@/lib/pwa/snapshot', () => ({
  saveAdminSnapshot: mocks.saveAdminSnapshot,
}));

import { AdminSnapshotWriter } from '@/components/admin/snapshot-writer';

const model: AdminOverviewModel = {
  counts: {
    apps: { up: 1, down: 0, unknown: 0, off: 0, paused: 0 },
    targets: { up: 1, down: 0, unknown: 0, off: 1 },
    monitoredTargets: 1,
  },
  attention: [],
  apps: [],
  lastCheckAt: '2026-11-23T11:55:00.000Z',
  staleMinutes: 5,
  isStale: false,
  allPaused: false,
};

describe('AdminSnapshotWriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves the model on mount and renders nothing', async () => {
    const { container } = render(<AdminSnapshotWriter model={model} />);

    await waitFor(() => {
      expect(mocks.saveAdminSnapshot).toHaveBeenCalledTimes(1);
    });
    expect(mocks.saveAdminSnapshot).toHaveBeenCalledWith(model);
    expect(container).toBeEmptyDOMElement();
  });

  it('skips writes when the serialized model is unchanged', async () => {
    const { rerender } = render(<AdminSnapshotWriter model={model} />);
    await waitFor(() => {
      expect(mocks.saveAdminSnapshot).toHaveBeenCalledTimes(1);
    });

    rerender(<AdminSnapshotWriter model={{ ...model }} />);
    rerender(<AdminSnapshotWriter model={JSON.parse(JSON.stringify(model))} />);

    await waitFor(() => {
      expect(mocks.saveAdminSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  it('writes again when the model changes', async () => {
    const { rerender } = render(<AdminSnapshotWriter model={model} />);
    await waitFor(() => {
      expect(mocks.saveAdminSnapshot).toHaveBeenCalledTimes(1);
    });

    const changed = { ...model, staleMinutes: 11, isStale: true };
    rerender(<AdminSnapshotWriter model={changed} />);

    await waitFor(() => {
      expect(mocks.saveAdminSnapshot).toHaveBeenCalledTimes(2);
    });
    expect(mocks.saveAdminSnapshot).toHaveBeenLastCalledWith(changed);
  });
});
