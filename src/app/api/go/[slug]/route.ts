import { NextResponse } from 'next/server';
import { buildClickEvent } from '@/lib/analytics/click-payload';
import { getVisibleAppBySlug } from '@/lib/db/apps';
import { insertClickEvent } from '@/lib/db/clicks';
import { getServerEnv } from '@/lib/env';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const app = await getVisibleAppBySlug(slug);

  if (!app) {
    return new NextResponse('Not found', { status: 404 });
  }

  const event = buildClickEvent({
    appId: app.id,
    headers: request.headers,
    now: new Date(),
    salt: getServerEnv().IP_HASH_SALT,
  });

  if (event) {
    try {
      await insertClickEvent(event);
    } catch (error) {
      console.error('failed to record click', error);
    }
  }

  const response = NextResponse.redirect(app.url, 302);
  response.headers.set('cache-control', 'no-store');
  return response;
}
