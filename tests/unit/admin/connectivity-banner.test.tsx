import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConnectivityBanner } from '@/components/admin/connectivity-banner';

describe('ConnectivityBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an amber offline banner and hides it when connectivity returns', () => {
    render(<ConnectivityBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Bạn đang offline');
    expect(banner).toHaveTextContent('Kiểm tra kết nối và thử lại');
    expect(banner).toHaveClass('bg-warn-bg', 'text-warn-fg');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('honours navigator.onLine on mount', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    render(<ConnectivityBanner />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Bạn đang offline',
    );
  });
});
