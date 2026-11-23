// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/settings', () => ({
  claimHealthRun: vi.fn(),
  releaseHealthRun: vi.fn(),
}));
vi.mock('@/lib/db/health-runs', () => ({
  insertHealthRun: vi.fn(),
}));
vi.mock('@/lib/health/deps', () => ({
  createHealthDeps: vi.fn(() => ({}) as never),
}));
vi.mock('@/lib/health/runner', () => ({
  runHealthChecks: vi.fn(),
}));
vi.mock('@/lib/health/cleanup', () => ({
  maybeCleanup: vi.fn(async () => false),
}));

import { claimHealthRun, releaseHealthRun } from '@/lib/db/settings';
import { insertHealthRun } from '@/lib/db/health-runs';
import { maybeCleanup } from '@/lib/health/cleanup';
import { HealthRunError } from '@/lib/health/errors';
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
    vi.mocked(claimHealthRun).mockResolvedValue('token-1');
    vi.mocked(insertHealthRun).mockResolvedValue(undefined);
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
    vi.mocked(claimHealthRun).mockResolvedValue(null);

    const response = await POST(request(secret));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ skipped: true });
    expect(releaseHealthRun).not.toHaveBeenCalled();
  });

  it('runs and returns the checked count', async () => {
    const response = await POST(request(secret));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ checked: 2, skipped: false });
    expect(maybeCleanup).toHaveBeenCalledOnce();
    expect(releaseHealthRun).toHaveBeenCalledOnce();
    expect(releaseHealthRun).toHaveBeenCalledWith('token-1');
  });

  it('returns 500 but still releases the lock when the run throws', async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(new Error('db down'));

    const response = await POST(request(secret));

    expect(response.status).toBe(500);
    expect(releaseHealthRun).toHaveBeenCalledOnce();
    expect(releaseHealthRun).toHaveBeenCalledWith('token-1');
  });

  it('records a successful run', async () => {
    await POST(request(secret));

    expect(insertHealthRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        checked: 2,
        failures: 0,
        error: null,
        started_at: expect.any(Date),
        finished_at: expect.any(Date),
      }),
    );
  });

  it('records a generic failure', async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(new Error('db down'));

    await POST(request(secret));

    expect(insertHealthRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        checked: 0,
        failures: 0,
        error: 'db down',
      }),
    );
  });

  it('records persistence failure counts', async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(new HealthRunError(3, 2));

    const response = await POST(request(secret));

    expect(response.status).toBe(500);
    expect(insertHealthRun).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        checked: 3,
        failures: 2,
        error: '2 health target(s) failed to persist',
      }),
    );
  });

  it('does not record a run when the lock is held', async () => {
    vi.mocked(claimHealthRun).mockResolvedValue(null);

    await POST(request(secret));

    expect(insertHealthRun).not.toHaveBeenCalled();
  });

  it('keeps the response when recording the run fails', async () => {
    vi.mocked(insertHealthRun).mockRejectedValue(new Error('insert failed'));

    const response = await POST(request(secret));

    expect(response.status).toBe(200);
    expect(releaseHealthRun).toHaveBeenCalledOnce();
  });
});
