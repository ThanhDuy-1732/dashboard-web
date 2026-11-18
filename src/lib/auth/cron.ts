import { createHash, timingSafeEqual } from 'node:crypto';

export function verifyCronSecret(header: string | null, secret: string): boolean {
  if (!header) return false;

  const received = createHash('sha256').update(header).digest();
  const expected = createHash('sha256').update(secret).digest();

  return timingSafeEqual(received, expected);
}
