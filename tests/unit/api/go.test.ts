// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/apps', () => ({
  getVisibleAppBySlug: vi.fn(),
}));
vi.mock('@/lib/db/clicks', () => ({
  insertClickEvent: vi.fn(),
}));

import { GET } from '@/app/api/go/[slug]/route';
import { getVisibleAppBySlug } from '@/lib/db/apps';
import { insertClickEvent } from '@/lib/db/clicks';

const app = {
  id: 'app-1',
  slug: 'blog',
  name: 'Blog',
  description: 'Ghi chép',
  url: 'https://blog.example.com',
  icon_url: null,
  preview_url: null,
};

function request(headers: Record<string, string> = {}) {
  return new Request('https://hub.test/api/go/blog', {
    headers: {
      'user-agent': 'Mozilla/5.0 Chrome/120',
      'x-forwarded-for': '203.0.113.5',
      ...headers,
    },
  });
}

function context(slug = 'blog') {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /api/go/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getVisibleAppBySlug).mockResolvedValue(app);
  });

  it('redirects to the app and records the click', async () => {
    const response = await GET(request(), context());

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(new URL(app.url).href);
    expect(insertClickEvent).toHaveBeenCalledOnce();
  });

  it('returns 404 for an unknown slug without recording', async () => {
    vi.mocked(getVisibleAppBySlug).mockResolvedValue(null);

    const response = await GET(request(), context('missing'));

    expect(response.status).toBe(404);
    expect(insertClickEvent).not.toHaveBeenCalled();
  });

  it('redirects but does not record bots', async () => {
    const response = await GET(request({ 'user-agent': 'Googlebot/2.1' }), context());

    expect(response.status).toBe(302);
    expect(insertClickEvent).not.toHaveBeenCalled();
  });

  it('sets cache-control to no-store', async () => {
    const response = await GET(request(), context());

    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
