import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isRetryableDbError, withDbRetry } from '@/lib/db/retry';

const sleep = vi.fn(async () => {});

describe('isRetryableDbError', () => {
  it('accepts connection-level errors', () => {
    expect(isRetryableDbError({ code: 'CONNECTION_CLOSED' })).toBe(true);
    expect(isRetryableDbError({ code: 'CONNECT_TIMEOUT' })).toBe(true);
    expect(isRetryableDbError({ code: 'ECONNRESET' })).toBe(true);
    expect(isRetryableDbError({ code: '57P01' })).toBe(true);
  });

  it('rejects data and logic errors', () => {
    expect(isRetryableDbError({ code: '23505' })).toBe(false);
    expect(isRetryableDbError(new Error('boom'))).toBe(false);
    expect(isRetryableDbError(null)).toBe(false);
    expect(isRetryableDbError('CONNECTION_CLOSED')).toBe(false);
  });
});

describe('withDbRetry', () => {
  beforeEach(() => {
    sleep.mockClear();
  });

  it('retries a transient error and returns the result', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ code: 'CONNECTION_CLOSED' })
      .mockResolvedValue('ok');

    await expect(withDbRetry(fn, { sleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('does not retry a non-transient error', async () => {
    const error = { code: '23505' };
    const fn = vi.fn<() => Promise<void>>(async () => {
      throw error;
    });

    await expect(withDbRetry(fn, { sleep })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('stops at the attempt limit and rethrows the last error', async () => {
    const fn = vi.fn<() => Promise<void>>(async () => {
      throw { code: 'CONNECTION_CLOSED' };
    });

    await expect(withDbRetry(fn, { sleep, attempts: 3 })).rejects.toMatchObject({
      code: 'CONNECTION_CLOSED',
    });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
