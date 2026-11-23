import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const manifestPath = path.join(process.cwd(), 'public/admin/manifest.webmanifest');
type AdminManifest = {
  name: string;
  short_name: string;
  description: string;
  lang: string;
  id: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  shortcuts: Array<{
    name: string;
    url: string;
    icons: Array<{ src: string; sizes: string; type: string }>;
  }>;
};

const readManifest = () =>
  JSON.parse(readFileSync(manifestPath, 'utf8')) as AdminManifest;

describe('admin PWA manifest', () => {
  it('defines an isolated installable admin app', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = readManifest();

    expect(manifest.name).toBe('Ecosystem Admin');
    expect(manifest.short_name).toBe('Admin');
    expect(manifest.description).toBe('Theo dõi trạng thái hệ sinh thái');
    expect(manifest.lang).toBe('vi');
    expect(manifest.id).toBe('/admin');
    expect(manifest.start_url).toBe('/admin');
    expect(manifest.scope).toBe('/admin');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    expect(manifest.theme_color).toBe('#0f172a');
    expect(manifest.background_color).toBe('#f8fafc');
  });

  it('references generated admin PNG icons with their intended sizes and purpose', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = readManifest();

    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icons/admin-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/admin-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/admin-icon-maskable-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        }),
      ]),
    );

    for (const src of [
      '/icons/admin-icon-192.png',
      '/icons/admin-icon-512.png',
      '/icons/admin-icon-maskable-512.png',
    ]) {
      expect(existsSync(path.join(process.cwd(), 'public', src))).toBe(true);
    }
  });

  it('provides admin shortcuts with a 192px icon', () => {
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = readManifest();

    expect(manifest.shortcuts).toEqual([
      {
        name: 'Tổng quan',
        url: '/admin',
        icons: [
          {
            src: '/icons/admin-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Ứng dụng',
        url: '/admin/apps',
        icons: [
          {
            src: '/icons/admin-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Phân tích',
        url: '/admin/analytics',
        icons: [
          {
            src: '/icons/admin-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Cài đặt',
        url: '/admin/settings',
        icons: [
          {
            src: '/icons/admin-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ]);
  });
});
