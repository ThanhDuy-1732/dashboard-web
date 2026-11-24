import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HubGrid } from '@/components/hub-grid';
import type { PublicApp } from '@/lib/db/types';

const apps: PublicApp[] = [
  {
    id: '1',
    slug: 'blog',
    name: 'Blog',
    description: 'Ghi chép',
    url: 'https://blog.example.com',
    icon_url: null,
    preview_url: null,
  },
];

describe('HubGrid', () => {
  it('links each app to its redirect endpoint', () => {
    render(<HubGrid apps={apps} />);

    expect(screen.getByRole('link', { name: /Blog/ })).toHaveAttribute(
      'href',
      '/api/go/blog',
    );
  });

  it('shows the description', () => {
    render(<HubGrid apps={apps} />);

    expect(screen.getByText('Ghi chép')).toBeInTheDocument();
  });

  it('falls back to the first letter when there is no icon', () => {
    render(<HubGrid apps={apps} />);

    expect(screen.getByTestId('app-icon-fallback')).toHaveTextContent('B');
  });

  it('shows an empty state when there are no apps', () => {
    render(<HubGrid apps={[]} />);

    expect(screen.getByText('Chưa có ứng dụng nào')).toBeInTheDocument();
  });
});
