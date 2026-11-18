import type { CheckResult, HealthTarget } from '@/lib/health/types';

export async function pingTarget(
  target: HealthTarget,
  fetchImpl: typeof fetch = fetch,
): Promise<CheckResult> {
  const started = performance.now();

  try {
    const response = await fetchImpl(target.url, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'user-agent': 'EcosystemHubHealth/1.0' },
      signal: AbortSignal.timeout(target.timeoutMs),
    });

    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    const ok = response.status === target.expectedStatus;

    return {
      ok,
      statusCode: response.status,
      latencyMs,
      error: ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    const name = error instanceof Error ? error.name : '';
    const isTimeout = name === 'AbortError' || name === 'TimeoutError';

    return {
      ok: false,
      statusCode: null,
      latencyMs,
      error: isTimeout
        ? 'timeout'
        : error instanceof Error
          ? error.message
          : 'network error',
    };
  }
}
