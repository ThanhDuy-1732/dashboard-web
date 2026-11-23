// @vitest-environment node
import { describe, expect, it } from 'vitest';
import nextConfig from '../../../next.config';

describe('/admin/sw.js response headers', () => {
  it('serves the admin SW with JS content type, no-store and an expanded scope', async () => {
    const headersFn = nextConfig.headers;
    expect(typeof headersFn).toBe('function');

    const rules = await headersFn!();
    const rule = rules.find((candidate) => candidate.source === '/admin/sw.js');
    expect(rule).toBeDefined();

    const values = Object.fromEntries(rule!.headers.map((header) => [header.key, header.value]));
    expect(values).toEqual({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/admin',
    });
  });
});
