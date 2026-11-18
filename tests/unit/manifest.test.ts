import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';

describe('manifest', () => {
  it('describes the installable hub', () => {
    const result = manifest();

    expect(result.name).toBe('Ecosystem Hub');
    expect(result.short_name).toBe('Ecosystem Hub');
    expect(result.start_url).toBe('/');
    expect(result.display).toBe('standalone');
    expect(result.lang).toBe('vi');
    expect(result.theme_color).toBe('#eef2ea');
    expect(result.background_color).toBe('#eef2ea');
  });

  it('ships png icons with sizes', () => {
    const icons = manifest().icons ?? [];

    expect(icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of icons) {
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBe('image/png');
    }
    expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  });
});
