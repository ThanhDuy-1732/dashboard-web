import { createHash } from 'node:crypto';
import type { NewClickEvent } from '@/lib/db/types';

const botPattern = /bot|crawler|spider|crawl|slurp|bingpreview|facebookexternalhit|headless/i;
const MAX_TEXT = 1000;

export function buildClickEvent(input: {
  appId: string;
  headers: Headers;
  now: Date;
  salt: string;
}): NewClickEvent | null {
  const userAgent = (input.headers.get('user-agent') ?? '').trim().slice(0, MAX_TEXT);

  if (botPattern.test(userAgent)) return null;

  const forwarded = input.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0]?.trim() || 'unknown';
  const ipHash = createHash('sha256')
    .update(`${ip}|${userAgent}|${input.salt}`)
    .digest('hex');

  const referrer = (input.headers.get('referer') ?? '').trim().slice(0, MAX_TEXT);
  const country = input.headers.get('x-vercel-ip-country')?.trim().slice(0, 2);

  return {
    app_id: input.appId,
    clicked_at: input.now,
    referrer: referrer || null,
    user_agent: userAgent || null,
    ip_hash: ipHash,
    country: country || null,
  };
}
