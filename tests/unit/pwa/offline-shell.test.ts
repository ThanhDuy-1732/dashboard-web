// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const shellPath = path.join(process.cwd(), 'public/admin/offline.html');

describe('admin offline shell', () => {
  it('exists as a static file', () => {
    expect(existsSync(shellPath)).toBe(true);
  });

  it('reads the same IndexedDB database, store and key as the snapshot helpers', () => {
    const html = readFileSync(shellPath, 'utf8');
    expect(html).toContain('ecosystem-admin');
    expect(html).toContain('snapshots');
    expect(html).toContain('overview');
    expect(html).toContain('indexedDB');
    expect(html).toContain('admin-snapshot');
  });

  it('never uses innerHTML (all snapshot strings go through textContent/DOM)', () => {
    const html = readFileSync(shellPath, 'utf8');
    expect(html).not.toContain('innerHTML');
    expect(html).not.toContain('insertAdjacentHTML');
    expect(html).not.toContain('document.write');
    expect(html).toContain('textContent');
  });

  it('shows the offline banner, attention section and a Khoá button', () => {
    const html = readFileSync(shellPath, 'utf8');
    expect(html).toContain('Đang offline');
    expect(html).toContain('Dữ liệu lúc');
    expect(html).toContain('Kiểm tra cuối');
    expect(html).toContain('Cần chú ý');
    expect(html).toContain('Khoá');
  });

  it('mirrors the OverviewMobile hero precedence strings', () => {
    const html = readFileSync(shellPath, 'utf8');
    expect(html).toContain('Chưa có ứng dụng nào');
    expect(html).toContain('Đang tạm dừng giám sát');
    expect(html).toContain('Chưa bật giám sát');
    expect(html).toContain('ứng dụng đang lỗi');
    expect(html).toContain('Cần kiểm tra');
    expect(html).toContain('Tất cả hệ thống ổn định');
  });

  it('is self-contained: no Next chunks, no links, no external scripts', () => {
    const html = readFileSync(shellPath, 'utf8');
    expect(html).not.toContain('/_next/');
    expect(html).not.toMatch(/<a[\s>]/);
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href=/);
  });

  it('clears the snapshot key when Khoá is pressed', () => {
    const html = readFileSync(shellPath, 'utf8');
    expect(html).toMatch(/\.delete\(/);
  });
});
