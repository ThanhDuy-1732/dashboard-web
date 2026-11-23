import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearAdminSnapshot: vi.fn(async () => {}),
}));

vi.mock('@/lib/pwa/snapshot', () => ({
  clearAdminSnapshot: mocks.clearAdminSnapshot,
}));

import { ClearSnapshotOnLogin } from '@/components/admin/clear-snapshot-on-login';

describe('ClearSnapshotOnLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears the snapshot on mount', async () => {
    render(<ClearSnapshotOnLogin />);

    await waitFor(() => {
      expect(mocks.clearAdminSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  it('renders nothing visible', () => {
    const { container } = render(<ClearSnapshotOnLogin />);
    expect(container).toBeEmptyDOMElement();
  });
});
