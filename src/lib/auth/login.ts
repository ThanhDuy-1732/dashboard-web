import { createHash } from 'node:crypto';

export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_WINDOW_MINUTES = 15;

export function isLoginLocked(failures: number): boolean {
  return failures >= LOGIN_MAX_FAILURES;
}

export function loginIpHash(forwardedFor: string | null, salt: string): string {
  const ip = (forwardedFor ?? '').split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(`${ip}|${salt}`).digest('hex');
}
