import { describe, expect, it } from 'vitest';
import { parseAppForm } from '@/lib/validation/app';
import { pauseUntil } from '@/lib/admin/pause';

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const base = {
    name: 'Blog',
    slug: 'blog',
    description: '',
    url: 'https://blog.example.com',
    iconUrl: '',
    supabaseRef: '',
    supabaseHealthUrl: '',
    expectedStatus: '200',
    timeoutMs: '5000',
    monitorApp: 'on',
    monitorSupabase: 'on',
    ...overrides,
  };

  for (const [key, value] of Object.entries(base)) {
    if (value !== '') data.set(key, value);
  }

  return data;
}

describe('parseAppForm', () => {
  it('maps form fields and applies defaults', () => {
    const result = parseAppForm(form({ expectedStatus: '', timeoutMs: '' }));

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.name).toBe('Blog');
    expect(result.input.slug).toBe('blog');
    expect(result.input.expectedStatus).toBe(200);
    expect(result.input.timeoutMs).toBe(5000);
    expect(result.input.monitorApp).toBe(true);
    expect(result.input.monitorSupabase).toBe(true);
  });

  it('turns empty optional fields into undefined', () => {
    const result = parseAppForm(form());

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.description).toBeUndefined();
    expect(result.input.iconUrl).toBeUndefined();
    expect(result.input.supabaseRef).toBeUndefined();
    expect(result.input.supabaseHealthUrl).toBeUndefined();
  });

  it('maps unchecked monitor boxes to false', () => {
    const data = form();
    data.delete('monitorApp');
    data.delete('monitorSupabase');

    const result = parseAppForm(data);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.input.monitorApp).toBe(false);
    expect(result.input.monitorSupabase).toBe(false);
  });

  it('reports a slug error for an invalid slug', () => {
    const result = parseAppForm(form({ slug: 'Blog App' }));

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.errors.slug?.length).toBeGreaterThan(0);
  });
});

describe('pauseUntil', () => {
  it('returns an ISO timestamp N minutes in the future', () => {
    expect(pauseUntil(30, new Date('2026-11-18T00:00:00.000Z'))).toBe(
      '2026-11-18T00:30:00.000Z',
    );
  });
});
