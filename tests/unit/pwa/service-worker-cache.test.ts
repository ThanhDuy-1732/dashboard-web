// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const hubSw = readFileSync(path.join(process.cwd(), 'public/sw.js'), 'utf8');
const adminSw = readFileSync(path.join(process.cwd(), 'public/admin/sw.js'), 'utf8');

describe('service worker cache isolation', () => {
  it('deletes only caches owned by each app', () => {
    expect(hubSw).toContain("startsWith('ecosystem-hub-')");
    expect(adminSw).toContain("startsWith('ecosystem-admin-')");
    expect(hubSw).not.toContain('key !== CACHE');
    expect(adminSw).not.toContain('key !== CACHE');
    expect(hubSw).not.toContain("startsWith('ecosystem-admin-')");
    expect(adminSw).not.toContain("startsWith('ecosystem-hub-')");
  });

  it('keeps the two cache names distinct', () => {
    expect(hubSw).toContain("'ecosystem-hub-v1'");
    expect(adminSw).toContain("'ecosystem-admin-v1'");
  });
});

describe('admin service worker strategy', () => {
  it('precaches the offline shell, manifest and admin icons', () => {
    for (const asset of [
      '/admin/offline',
      '/admin/manifest.webmanifest',
      '/icons/admin-icon-192.png',
      '/icons/admin-icon-512.png',
      '/icons/admin-icon-maskable-512.png',
    ]) {
      expect(adminSw).toContain(`'${asset}'`);
    }
  });

  it('handles /admin and /admin/* navigations with an offline fallback', () => {
    expect(adminSw).toContain("pathname === '/admin'");
    expect(adminSw).toContain("pathname.startsWith('/admin/')");
    expect(adminSw).toContain("caches.match('/admin/offline')");
    expect(adminSw).toContain("request.mode !== 'navigate'");
  });

  it('never caches RSC, API, server action or admin HTML responses', () => {
    expect(adminSw).toContain("searchParams.has('_rsc')");
    expect(adminSw).toContain("request.headers.has('RSC')");
    expect(adminSw).toContain("request.headers.has('Next-Action')");
    expect(adminSw).toContain("pathname.startsWith('/api/')");
    expect(adminSw).not.toContain("cache.put('/admin'");
  });

  it('uses cache-first for Next static assets and claims clients on activate', () => {
    expect(adminSw).toContain("pathname.startsWith('/_next/static/')");
    expect(adminSw).toContain('self.skipWaiting()');
    expect(adminSw).toContain('self.clients.claim()');
  });
});
