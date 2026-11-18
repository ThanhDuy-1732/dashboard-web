import { describe, expect, it } from 'vitest';
import { formatDateTime, formatLatency, formatUptime } from '@/lib/format';

describe('formatDateTime', () => {
  it('formats in Vietnam time', () => {
    expect(formatDateTime('2026-11-18T07:05:00.000Z')).toBe('18/11/2026 14:05');
  });
});

describe('formatUptime', () => {
  it('returns a dash for no data', () => {
    expect(formatUptime(null)).toBe('—');
  });

  it('rounds to one decimal', () => {
    expect(formatUptime(99.94)).toBe('99.9%');
    expect(formatUptime(100)).toBe('100%');
  });
});

describe('formatLatency', () => {
  it('returns a dash for no data', () => {
    expect(formatLatency(null)).toBe('—');
  });

  it('rounds milliseconds', () => {
    expect(formatLatency(123.4)).toBe('123 ms');
  });
});
