import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth/cron';
import { insertHealthRun } from '@/lib/db/health-runs';
import { claimHealthRun, releaseHealthRun } from '@/lib/db/settings';
import { getServerEnv } from '@/lib/env';
import { maybeCleanup } from '@/lib/health/cleanup';
import { createHealthDeps } from '@/lib/health/deps';
import { HealthRunError } from '@/lib/health/errors';
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

  const startedAt = new Date();
  let checked = 0;
  let failures = 0;
  let errorMessage: string | null = null;

  try {
    const result = await runHealthChecks(createHealthDeps());
    checked = result.checked;

    try {
      await maybeCleanup(new Date());
    } catch (error) {
      console.error('health cleanup failed', error);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HealthRunError) {
      checked = error.checked;
      failures = error.failures;
      errorMessage = error.describe();
    } else {
      errorMessage = error instanceof Error ? error.message : 'health run failed';
    }

    console.error('health run failed', error);
    return NextResponse.json({ error: 'health run failed' }, { status: 500 });
  } finally {
    try {
      await insertHealthRun({
        started_at: startedAt,
        finished_at: new Date(),
        ok: errorMessage === null,
        checked,
        failures,
        error: errorMessage,
      });
    } catch (error) {
      console.error('failed to record health run', error);
    }

    try {
      await releaseHealthRun(token);
    } catch (error) {
      console.error('failed to release health run lock', error);
    }
  }
}
