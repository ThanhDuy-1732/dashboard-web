import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { getServerEnv } from '@/lib/env';

export const SESSION_COOKIE = 'hub_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function hash(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function verifyPassword(input: string, expected: string): boolean {
  return timingSafeEqual(hash(input), hash(expected));
}

export async function createSessionToken(): Promise<string> {
  const secret = encoder.encode(getServerEnv().SESSION_SECRET);

  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = encoder.encode(getServerEnv().SESSION_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export function adminGate(input: {
  pathname: string;
  hasValidSession: boolean;
}): 'allow' | 'login' {
  if (!input.pathname.startsWith('/admin')) return 'allow';
  if (input.pathname === '/admin/login' || input.pathname.startsWith('/admin/login/')) {
    return 'allow';
  }
  return input.hasValidSession ? 'allow' : 'login';
}
