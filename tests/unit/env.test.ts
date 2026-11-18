// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getServerEnv } from '@/lib/env';

const valid = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  NEXT_PUBLIC_SITE_URL: 'https://hub.test',
  NEXT_PUBLIC_HUB_NAME: 'Ecosystem Hub',
  ADMIN_PASSWORD: 'a-strong-password',
  SESSION_SECRET: 's'.repeat(40),
  CRON_SECRET: 'c'.repeat(40),
  IP_HASH_SALT: 'i'.repeat(20),
  ALERT_FROM_EMAIL: 'onboarding@resend.dev',
};

function stub(overrides: Record<string, string>) {
  for (const [key, value] of Object.entries({ ...valid, ...overrides })) {
    vi.stubEnv(key, value);
  }
  vi.stubEnv('NODE_ENV', 'production');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getServerEnv', () => {
  it('accepts real values', () => {
    stub({});

    expect(getServerEnv().ADMIN_PASSWORD).toBe('a-strong-password');
  });

  it.each([
    ['SESSION_SECRET', 'replace-with-at-least-32-random-characters'],
    ['CRON_SECRET', 'replace-with-at-least-32-random-characters'],
    ['IP_HASH_SALT', 'replace-with-at-least-16-random-characters'],
    ['ADMIN_PASSWORD', 'change-me-now'],
  ])('rejects the documented placeholder for %s', (key, value) => {
    stub({ [key]: value });

    expect(() => getServerEnv()).toThrow();
  });

  it('rejects an admin password shorter than 12 characters', () => {
    stub({ ADMIN_PASSWORD: 'short-pass' });

    expect(() => getServerEnv()).toThrow();
  });
});
