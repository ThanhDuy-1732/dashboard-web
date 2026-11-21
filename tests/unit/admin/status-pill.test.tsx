import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/admin/status-badge';
import { StatusPill, type StatusPillState } from '@/components/admin/status-pill';

const cases: Array<[StatusPillState, string]> = [
  ['up', 'Ổn'],
  ['down', 'Lỗi'],
  ['unknown', 'Chưa rõ'],
  ['off', 'Tắt'],
  ['paused', 'Tạm dừng'],
];

describe('StatusPill', () => {
  it.each(cases)('renders %s as "%s"', (state, label) => {
    render(<StatusPill state={state} />);

    const text = screen.getByText(label);
    expect(text).toBeInTheDocument();
    expect(text.closest('[data-state]')).toHaveAttribute('data-state', state);
  });

  it('renders the dot as decorative', () => {
    const { container } = render(<StatusPill state="up" />);

    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeNull();
  });

  it('applies the requested size', () => {
    const { rerender } = render(<StatusPill state="up" size="sm" />);
    expect(screen.getByText('Ổn')).toHaveClass('text-xs');

    rerender(<StatusPill state="up" size="lg" />);
    expect(screen.getByText('Ổn')).toHaveClass('text-sm');
  });

  it('accepts a custom label', () => {
    render(<StatusPill state="down" label="Supabase lỗi" />);

    expect(screen.getByText('Supabase lỗi')).toBeInTheDocument();
    expect(screen.getByText('Supabase lỗi').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'down',
    );
  });
});

describe('StatusBadge', () => {
  it('delegates to StatusPill', () => {
    render(<StatusBadge state="down" />);

    const text = screen.getByText('Lỗi');
    expect(text.closest('[data-state]')).toHaveAttribute('data-state', 'down');
  });
});
