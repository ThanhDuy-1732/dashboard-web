import { describe, expect, it } from 'vitest';
import { appInputSchema } from '@/lib/validation/app';

const base = { name: 'Blog', slug: 'blog', url: 'https://blog.example.com' };

describe('appInputSchema', () => {
  it('accepts a minimal app and applies defaults', () => {
    const parsed = appInputSchema.parse(base);
    expect(parsed.expectedStatus).toBe(200);
    expect(parsed.timeoutMs).toBe(5000);
    expect(parsed.description).toBeUndefined();
    expect(parsed.iconUrl).toBeUndefined();
    expect(parsed.previewUrl).toBeUndefined();
  });

  it('keeps a preview url and rejects a broken one', () => {
    expect(appInputSchema.parse({ ...base, previewUrl: '/previews/blog.webp' }).previewUrl).toBe(
      '/previews/blog.webp',
    );
    expect(appInputSchema.safeParse({ ...base, previewUrl: 'nope' }).success).toBe(false);
  });

  it('trims the name', () => {
    expect(appInputSchema.parse({ ...base, name: '  Blog  ' }).name).toBe('Blog');
  });

  it.each(['Blog App', 'blog_app', '-blog', 'blog-'])('rejects invalid slug %s', (slug) => {
    expect(appInputSchema.safeParse({ ...base, slug }).success).toBe(false);
  });

  it('rejects an invalid url', () => {
    expect(appInputSchema.safeParse({ ...base, url: 'nope' }).success).toBe(false);
  });

  it('rejects timeout outside 1000..30000', () => {
    expect(appInputSchema.safeParse({ ...base, timeoutMs: 500 }).success).toBe(false);
  });
});
