// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOverviewModel } from '@/lib/admin/overview';
import { loadAdminSnapshot, saveAdminSnapshot } from '@/lib/pwa/snapshot';

const shellPath = path.join(process.cwd(), 'public/admin/offline.html');
const html = readFileSync(shellPath, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('offline shell inline script not found');
const shellScript = scriptMatch[1];

const NOW = '2026-11-23T12:00:00.000Z';

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('ecosystem-admin');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function baseModel(overrides: Partial<AdminOverviewModel> = {}): AdminOverviewModel {
  return {
    counts: {
      apps: { up: 1, down: 1, unknown: 0, off: 0, paused: 0 },
      targets: { up: 1, down: 1, unknown: 0, off: 0 },
      monitoredTargets: 2,
    },
    attention: [
      {
        appId: 'app-alpha',
        appName: 'Alpha',
        target: 'app',
        state: 'down',
        consecutiveFailures: 3,
        lastCheckAt: '2026-11-23T11:55:00.000Z',
        lastError: 'Timeout',
      },
    ],
    apps: [
      {
        id: 'app-alpha',
        name: 'Alpha',
        slug: 'alpha',
        iconUrl: null,
        isVisible: false,
        paused: false,
        worstState: 'down',
        app: {
          state: 'down',
          latencyMs: 420,
          lastCheckAt: '2026-11-23T11:55:00.000Z',
          consecutiveFailures: 3,
          lastError: 'Timeout',
        },
        supabase: null,
      },
    ],
    lastCheckAt: '2026-11-23T11:55:00.000Z',
    staleMinutes: 5,
    isStale: true,
    allPaused: false,
    ...overrides,
  };
}

function content(): HTMLElement {
  const node = document.getElementById('content');
  if (!node) throw new Error('#content not mounted');
  return node;
}

function mountShell(): void {
  document.body.innerHTML =
    '<main id="admin-snapshot"><h1>Ecosystem Admin</h1><div id="content"></div></main>';
  // Execute the shell's self-contained IIFE in the jsdom global scope, where
  // document / indexedDB / Intl are available — no real browser needed.
  new Function(shellScript)();
}

async function render(model: AdminOverviewModel): Promise<void> {
  vi.setSystemTime(new Date(NOW));
  await saveAdminSnapshot(model);
  mountShell();
  await vi.waitFor(() => {
    expect(content().textContent).toContain('Đang offline');
  });
}

beforeEach(async () => {
  await deleteDatabase();
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await deleteDatabase();
});

describe('admin offline shell — rendered behavior', () => {
  it('renders the hero with down-state precedence and a stale notice', async () => {
    await render(baseModel());

    const hero = content().querySelector('.hero');
    expect(hero).not.toBeNull();
    expect(hero?.classList.contains('hero-bad')).toBe(true);
    expect(hero?.querySelector('h2')?.textContent).toBe('1 ứng dụng đang lỗi');
    expect(hero?.textContent).toContain('1/1 ứng dụng ổn');
    expect(hero?.textContent).toContain('1 mục tiêu lỗi');
    expect(content().querySelector('.stale')?.textContent).toContain(
      'Dữ liệu giám sát đang cũ.',
    );
  });

  it('gives allPaused precedence over down counts in the hero', async () => {
    await render(baseModel({ allPaused: true }));

    expect(content().querySelector('.hero h2')?.textContent).toBe(
      'Đang tạm dừng giám sát',
    );
    expect(content().querySelector('.hero')?.classList.contains('hero-unknown')).toBe(
      true,
    );
  });

  it('renders the empty-apps hero when the snapshot has no apps', async () => {
    await render(baseModel({ apps: [], allPaused: false }));

    expect(content().querySelector('.hero h2')?.textContent).toBe(
      'Chưa có ứng dụng nào',
    );
  });

  it('renders attention cards with a validated state pill', async () => {
    await render(baseModel());

    const attention = [...content().querySelectorAll('section')].find(
      (section) => section.querySelector('h2')?.textContent === 'Cần chú ý',
    );
    expect(attention).toBeDefined();
    expect(attention?.textContent).toContain('Alpha');
    expect(attention?.textContent).toContain('3 lần lỗi liên tiếp');
    expect(attention?.textContent).toContain('Lỗi gần nhất: Timeout');

    const pill = attention?.querySelector('.pill');
    expect(pill?.classList.contains('pill-down')).toBe(true);
    expect(pill?.textContent).toBe('Lỗi');
  });

  it('maps inherited/invalid state keys to the unknown pill', async () => {
    const model = baseModel();
    // Simulate a corrupted/hostile snapshot value that is an inherited key.
    (model.attention[0] as { state: string }).state = 'toString';
    await render(model);

    const pill = content().querySelector('.pill');
    expect(pill?.classList.contains('pill-unknown')).toBe(true);
    expect(pill?.textContent).toBe('Chưa rõ');
  });

  it('renders app cards with an aria-hidden icon fallback, hidden badge and target rows', async () => {
    await render(baseModel());

    const appCard = [...content().querySelectorAll('.card')].find((card) =>
      card.textContent?.includes('/alpha'),
    );
    expect(appCard).toBeDefined();

    const fallback = appCard?.querySelector('.icon-fallback');
    expect(fallback?.getAttribute('aria-hidden')).toBe('true');
    expect(fallback?.textContent).toBe('A');
    expect(appCard?.querySelector('.hidden-badge')?.textContent).toBe('Đang ẩn');
    expect(appCard?.classList.contains('card-down')).toBe(true);
    expect(appCard?.querySelector('.pill-down')).not.toBeNull();

    const targetTexts = [...(appCard?.querySelectorAll('.target') ?? [])].map(
      (target) => target.textContent ?? '',
    );
    expect(targetTexts.some((text) => text.includes('App'))).toBe(true);
    expect(targetTexts.some((text) => text.includes('420 ms'))).toBe(true);
    expect(targetTexts.some((text) => text.includes('Supabase'))).toBe(true);
  });

  it('renders hostile snapshot strings as plain text, not markup', async () => {
    const model = baseModel();
    model.attention[0].appName = '<b>Alpha</b><script>window.__xss=1</script>';
    model.attention[0].lastError = '<img src=x onerror="window.__xss=2">';
    model.apps[0].name = '<svg onload="window.__xss=3">Beta';
    await render(model);

    expect(content().textContent).toContain('<b>Alpha</b>');
    expect(content().textContent).toContain('<script>window.__xss=1</script>');
    expect(content().textContent).toContain('<img src=x onerror="window.__xss=2">');
    expect(content().querySelector('b')).toBeNull();
    expect(content().querySelector('script')).toBeNull();
    expect(content().querySelector('img[onerror]')).toBeNull();
    expect(content().querySelector('svg')).toBeNull();
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('clears the snapshot and the IndexedDB key when Khoá is pressed', async () => {
    await render(baseModel());
    expect(await loadAdminSnapshot()).not.toBeNull();

    const lock = content().querySelector('button.lock') as HTMLButtonElement | null;
    expect(lock).not.toBeNull();
    expect(lock?.textContent).toBe('Khoá');
    lock?.click();

    await vi.waitFor(() => {
      expect(content().textContent).toContain('Đã xoá dữ liệu offline');
    });
    expect(await loadAdminSnapshot()).toBeNull();
  });

  it('shows the fallback message when no snapshot exists', async () => {
    vi.setSystemTime(new Date(NOW));
    mountShell();

    await vi.waitFor(() => {
      expect(content().textContent).toContain('Chưa có dữ liệu offline');
    });
  });
});
