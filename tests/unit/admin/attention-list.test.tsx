import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AdminAttentionItem } from '@/lib/admin/overview';
import { AttentionList } from '@/components/admin/attention-list';

const now = new Date('2026-11-21T12:00:00.000Z');

const items: AdminAttentionItem[] = [
  {
    appId: 'app-alpha',
    appName: 'Alpha',
    target: 'app',
    state: 'down',
    consecutiveFailures: 3,
    lastCheckAt: '2026-11-21T11:55:00.000Z',
    lastError: 'Timeout sau 5000ms',
  },
  {
    appId: 'app-beta',
    appName: 'Beta',
    target: 'supabase',
    state: 'unknown',
    consecutiveFailures: 0,
    lastCheckAt: null,
    lastError: null,
  },
];

describe('AttentionList', () => {
  it('renders every attention item with target, failures, error and relative time', () => {
    render(<AttentionList items={items} now={now} />);

    expect(screen.getByRole('heading', { name: 'Cần chú ý' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();

    expect(screen.getByText(/Ứng dụng/)).toBeInTheDocument();
    expect(screen.getByText(/3 lần lỗi liên tiếp/)).toBeInTheDocument();
    expect(screen.getByText(/Timeout sau 5000ms/)).toBeInTheDocument();
    expect(screen.getByText('5 phút trước')).toBeInTheDocument();

    expect(screen.getByText(/Supabase/)).toBeInTheDocument();
    expect(screen.getByText(/Chưa có dữ liệu kiểm tra/)).toBeInTheDocument();
  });

  it('labels down and unknown items with status text and a dot', () => {
    render(<AttentionList items={items} now={now} />);

    const downPill = screen.getByText('Lỗi').closest('[data-state]');
    expect(downPill).toHaveAttribute('data-state', 'down');
    expect(downPill?.querySelector('[aria-hidden="true"]')).not.toBeNull();

    const unknownPill = screen.getByText('Chưa rõ').closest('[data-state]');
    expect(unknownPill).toHaveAttribute('data-state', 'unknown');
    expect(unknownPill?.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('uses the item state for the pill, not the failure count', () => {
    const unknownWithFailure: AdminAttentionItem = {
      appId: 'app-gamma',
      appName: 'Gamma',
      target: 'app',
      state: 'unknown',
      consecutiveFailures: 1,
      lastCheckAt: '2026-11-21T11:59:00.000Z',
      lastError: 'Không kết nối được',
    };

    render(<AttentionList items={[unknownWithFailure]} now={now} />);

    expect(screen.getByText('Chưa rõ')).toBeInTheDocument();
    expect(screen.queryByText('Lỗi')).not.toBeInTheDocument();
    expect(screen.getByText(/1 lần lỗi liên tiếp/)).toBeInTheDocument();
  });

  it('links each item to the app detail page', () => {
    render(<AttentionList items={items} now={now} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/admin/apps/app-alpha');
    expect(links[1]).toHaveAttribute('href', '/admin/apps/app-beta');
  });

  it('renders non-interactive cards when offline', () => {
    const { container } = render(
      <AttentionList items={items} now={now} offline />,
    );

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<AttentionList items={[]} now={now} />);

    expect(container).toBeEmptyDOMElement();
  });
});
