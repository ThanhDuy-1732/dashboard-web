import { describe, expect, it } from 'vitest';
import { isCleanupDue } from '@/lib/health/cleanup-policy';

const now = new Date('2026-11-18T00:00:00.000Z');

describe('isCleanupDue', () => {
  it('is due when there has never been a cleanup', () => {
    expect(isCleanupDue(null, now)).toBe(true);
  });

  it('is not due within 24 hours', () => {
    expect(isCleanupDue(new Date(now.getTime() - 23 * 60 * 60 * 1000), now)).toBe(false);
  });

  it('is due after 24 hours', () => {
    expect(isCleanupDue(new Date(now.getTime() - 25 * 60 * 60 * 1000), now)).toBe(true);
  });
});
