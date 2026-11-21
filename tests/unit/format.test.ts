import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatLatency,
  formatRelativeTime,
  formatUptime,
} from '@/lib/format';

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

describe('formatRelativeTime', () => {
  const now = new Date('2026-11-21T12:00:00.000Z');

  it('returns a dash for no value', () => {
    expect(formatRelativeTime(null, now)).toBe('—');
  });

  it('returns "vừa xong" under a minute', () => {
    expect(formatRelativeTime('2026-11-21T11:59:30.000Z', now)).toBe('vừa xong');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime('2026-11-21T11:55:00.000Z', now)).toBe('5 phút trước');
  });

  it('formats hours', () => {
    expect(formatRelativeTime('2026-11-21T10:30:00.000Z', now)).toBe('1 giờ trước');
  });

  it('formats days', () => {
    expect(formatRelativeTime('2026-11-18T12:00:00.000Z', now)).toBe('3 ngày trước');
  });
});
