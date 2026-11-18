import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildClickEvent } from '@/lib/analytics/click-payload';

const now = new Date('2026-11-18T00:00:00.000Z');
const salt = 'test-salt';
const userAgent = 'Mozilla/5.0 (Macintosh) Chrome/120.0.0.0';

function headers(overrides: Record<string, string> = {}) {
  return new Headers({
    'user-agent': userAgent,
    'x-forwarded-for': '203.0.113.5, 10.0.0.1',
    'x-vercel-ip-country': 'VN',
    referer: 'https://google.com/search',
    ...overrides,
  });
}

describe('buildClickEvent', () => {
  it('builds a hashed click event with country and referrer', () => {
    const event = buildClickEvent({ appId: 'app-1', headers: headers(), now, salt });

    expect(event).not.toBeNull();
    expect(event?.ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(event?.country).toBe('VN');
    expect(event?.referrer).toBe('https://google.com/search');
    expect(event?.app_id).toBe('app-1');
    expect(event?.clicked_at).toBe(now);
  });

  it('hashes the same ip, user agent and salt to the same value', () => {
    const first = buildClickEvent({ appId: 'app-1', headers: headers(), now, salt });
    const second = buildClickEvent({ appId: 'app-1', headers: headers(), now, salt });
    const expected = createHash('sha256')
      .update(`203.0.113.5|${userAgent}|${salt}`)
      .digest('hex');

    expect(first?.ip_hash).toBe(expected);
    expect(second?.ip_hash).toBe(expected);
  });

  it('changes the hash when the ip changes', () => {
    const first = buildClickEvent({ appId: 'app-1', headers: headers(), now, salt });
    const second = buildClickEvent({
      appId: 'app-1',
      headers: headers({ 'x-forwarded-for': '203.0.113.6' }),
      now,
      salt,
    });

    expect(first?.ip_hash).not.toBe(second?.ip_hash);
  });

  it('ignores bots', () => {
    const event = buildClickEvent({
      appId: 'app-1',
      headers: headers({ 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }),
      now,
      salt,
    });

    expect(event).toBeNull();
  });

  it('still builds an event when the forwarded ip is missing', () => {
    const event = buildClickEvent({
      appId: 'app-1',
      headers: headers({ 'x-forwarded-for': '' }),
      now,
      salt,
    });

    expect(event?.ip_hash).toBe(
      createHash('sha256').update(`unknown|${userAgent}|${salt}`).digest('hex'),
    );
  });
});
