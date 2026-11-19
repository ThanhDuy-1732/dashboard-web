import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppCard } from '@/components/app-card';
import type { PublicApp } from '@/lib/db/types';

const app: PublicApp = {
  id: '1',
  slug: 'blog',
  name: 'Blog',
  description: 'Ghi chép',
  url: 'https://blog.example.com',
  icon_url: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppCard', () => {
  it('opens the app in a new tab outside standalone mode', () => {
    render(<AppCard app={app} />);

    const link = screen.getByRole('link', { name: /Blog/ });
    expect(link).toHaveAttribute('href', '/api/go/blog');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('navigates in the same window inside standalone PWA mode', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    );

    render(<AppCard app={app} />);

    const link = screen.getByRole('link', { name: /Blog/ });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });
});
