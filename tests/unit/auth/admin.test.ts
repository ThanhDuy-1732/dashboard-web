// @vitest-environment node
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
  adminGate,
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from '@/lib/auth/session';
import { isLoginLocked, loginIpHash } from '@/lib/auth/login';

const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

describe('verifyPassword', () => {
  it('accepts the matching password', () => {
    expect(verifyPassword('secret', 'secret')).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(verifyPassword('wrong', 'secret')).toBe(false);
  });

  it('rejects passwords of different lengths without throwing', () => {
    expect(verifyPassword('short', 'a-much-longer-password')).toBe(false);
  });
});

describe('adminGate', () => {
  it('sends anonymous visitors to login', () => {
    expect(adminGate({ pathname: '/admin', hasValidSession: false })).toBe('login');
  });

  it('allows a valid session', () => {
    expect(adminGate({ pathname: '/admin/apps', hasValidSession: true })).toBe('allow');
  });

  it('always allows the login page', () => {
    expect(adminGate({ pathname: '/admin/login', hasValidSession: false })).toBe('allow');
  });

  it('allows public paths', () => {
    expect(adminGate({ pathname: '/', hasValidSession: false })).toBe('allow');
    expect(adminGate({ pathname: '/api/go/x', hasValidSession: false })).toBe('allow');
  });
});

describe('login protection', () => {
  it('locks after ten failures', () => {
    expect(isLoginLocked(9)).toBe(false);
    expect(isLoginLocked(10)).toBe(true);
  });

  it('hashes the first forwarded ip', () => {
    const first = loginIpHash('203.0.113.5, 10.0.0.1', 'salt');
    const second = loginIpHash('203.0.113.5', 'salt');

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('session tokens', () => {
  it('verifies a token it created', async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it('rejects garbage', async () => {
    expect(await verifySessionToken('not-a-jwt')).toBe(false);
  });

  it('rejects an expired token', async () => {
    const expired = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    expect(await verifySessionToken(expired)).toBe(false);
  });
});
