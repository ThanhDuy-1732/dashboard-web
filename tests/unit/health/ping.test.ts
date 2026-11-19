// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { pingTarget } from '@/lib/health/ping';
import type { HealthTarget } from '@/lib/health/types';

const target: HealthTarget = {
  appId: 'app-1',
  slug: 'blog',
  name: 'Blog',
  target: 'app',
  url: 'https://blog.example.com',
  expectedStatus: 200,
  timeoutMs: 5000,
  method: 'GET',
  headers: {},
};

describe('pingTarget', () => {
  it('records a successful response', async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 200 }),
    );

    const result = await pingTarget(target, fetchImpl);

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeNull();
  });

  it('records a non-matching status', async () => {
    const result = await pingTarget(
      target,
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.error).toBe('HTTP 503');
  });

  it('uses the configured method and headers', async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) =>
        new Response(null, { status: 200 }),
    );

    await pingTarget(
      { ...target, method: 'POST', headers: { authorization: 'Bearer token' } },
      fetchImpl,
    );

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'user-agent': 'EcosystemHubHealth/1.0',
      authorization: 'Bearer token',
    });
  });

  it('records network errors', async () => {
    const result = await pingTarget(
      target,
      vi.fn(async () => {
        throw new Error('boom');
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.error).toBe('boom');
  });

  it('records a timeout', async () => {
    const fetchImpl = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );

    const result = await pingTarget({ ...target, timeoutMs: 10 }, fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('timeout');
  });
});
