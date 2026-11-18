import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth/cron';
import { claimHealthRun, releaseHealthRun } from '@/lib/db/settings';
import { getServerEnv } from '@/lib/env';
import { maybeCleanup } from '@/lib/health/cleanup';
import { createHealthDeps } from '@/lib/health/deps';
import { runHealthChecks } from '@/lib/health/runner';

export async function POST(request: Request) {
  const secret = getServerEnv().CRON_SECRET;

  if (!verifyCronSecret(request.headers.get('x-cron-secret'), secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const token = await claimHealthRun();
  if (!token) {
    return NextResponse.json({ skipped: true }, { status: 202 });
  }

  try {
    const result = await runHealthChecks(createHealthDeps());

    try {
      await maybeCleanup(new Date());
    } catch (error) {
      console.error('health cleanup failed', error);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('health run failed', error);
    return NextResponse.json({ error: 'health run failed' }, { status: 500 });
  } finally {
    try {
      await releaseHealthRun(token);
    } catch (error) {
      console.error('failed to release health run lock', error);
    }
  }
}
