// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/settings', () => ({
  claimHealthRun: vi.fn(),
  releaseHealthRun: vi.fn(),
}));
vi.mock('@/lib/health/deps', () => ({
  createHealthDeps: vi.fn(() => ({}) as never),
}));
vi.mock('@/lib/health/runner', () => ({
  runHealthChecks: vi.fn(),
}));

import { claimHealthRun, releaseHealthRun } from '@/lib/db/settings';
import { runHealthChecks } from '@/lib/health/runner';
import { POST } from '@/app/api/cron/health/route';

const secret = process.env.CRON_SECRET!;

function request(value?: string) {
  return new Request('https://hub.test/api/cron/health', {
    method: 'POST',
    headers: value ? { 'x-cron-secret': value } : {},
  });
}

describe('POST /api/cron/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimHealthRun).mockResolvedValue(true);
    vi.mocked(runHealthChecks).mockResolvedValue({ checked: 2, skipped: false });
  });

  it('rejects a missing secret', async () => {
    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(claimHealthRun).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret, including a shorter one', async () => {
    expect((await POST(request('nope'))).status).toBe(401);
    expect((await POST(request(secret.slice(0, 10)))).status).toBe(401);
  });

  it('returns 202 when another run holds the lock', async () => {
    vi.mocked(claimHealthRun).mockResolvedValue(false);

    const response = await POST(request(secret));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ skipped: true });
    expect(releaseHealthRun).not.toHaveBeenCalled();
  });

  it('runs and returns the checked count', async () => {
    const response = await POST(request(secret));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ checked: 2, skipped: false });
    expect(releaseHealthRun).toHaveBeenCalledOnce();
  });

  it('returns 500 but still releases the lock when the run throws', async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(new Error('db down'));

    const response = await POST(request(secret));

    expect(response.status).toBe(500);
    expect(releaseHealthRun).toHaveBeenCalledOnce();
  });
});
