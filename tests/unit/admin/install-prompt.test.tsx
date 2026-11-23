import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_INSTALL_DISMISS_KEY,
  AdminInstallPrompt,
} from '@/components/admin/install-prompt';

const originalMatchMedia = window.matchMedia;

function installMatchMedia({
  standalone = false,
  mobile = true,
}: { standalone?: boolean; mobile?: boolean } = {}) {
  const matchMedia = vi.fn((query: string) => ({
    matches: query.includes('display-mode') ? standalone : mobile,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
  return matchMedia;
}

function useIosUserAgent() {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  );
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe('AdminInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      Reflect.deleteProperty(window, 'matchMedia');
    }
  });

  it('renders nothing when already running in standalone mode', () => {
    installMatchMedia({ standalone: true, mobile: true });

    const { container } = render(<AdminInstallPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing outside the mobile breakpoint', () => {
    installMatchMedia({ standalone: false, mobile: false });

    const { container } = render(<AdminInstallPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows iOS add-to-home-screen instructions instead of a Chrome button', async () => {
    installMatchMedia({ mobile: true });
    useIosUserAgent();

    render(<AdminInstallPrompt />);

    expect(await screen.findByText(/Thêm vào màn hình chính/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cài ứng dụng' }),
    ).not.toBeInTheDocument();
  });

  it('shows a compact install button after beforeinstallprompt and calls prompt', async () => {
    installMatchMedia({ mobile: true });
    const prompt = vi.fn(async () => {});
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const });
    const event = new CustomEvent('beforeinstallprompt', {
      cancelable: true,
    }) as CustomEvent & { prompt: typeof prompt; userChoice: typeof userChoice };
    event.prompt = prompt;
    event.userChoice = userChoice;

    render(<AdminInstallPrompt />);
    act(() => {
      window.dispatchEvent(event);
    });

    const button = screen.getByRole('button', { name: 'Cài ứng dụng' });
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-xs');

    fireEvent.click(button);

    expect(prompt).toHaveBeenCalledOnce();
    await expect(userChoice).resolves.toEqual({ outcome: 'dismissed' });
  });

  it('does not surface an unhandled rejection when the install prompt fails', async () => {
    installMatchMedia({ mobile: true });
    const prompt = vi.fn(async () => {
      throw new Error('install declined');
    });
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const });
    const event = new CustomEvent('beforeinstallprompt', {
      cancelable: true,
    }) as CustomEvent & { prompt: typeof prompt; userChoice: typeof userChoice };
    event.prompt = prompt;
    event.userChoice = userChoice;

    render(<AdminInstallPrompt />);
    act(() => {
      window.dispatchEvent(event);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cài ứng dụng' }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });

  it('persists a dismissal and stays hidden for 30 days', async () => {
    installMatchMedia({ mobile: true });
    useIosUserAgent();

    const first = render(<AdminInstallPrompt />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ẩn lời nhắc cài đặt' }),
    );

    const stored = localStorage.getItem(ADMIN_INSTALL_DISMISS_KEY);
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(Date.now() - 60_000);

    first.unmount();
    const second = render(<AdminInstallPrompt />);
    expect(second.container).toBeEmptyDOMElement();
  });

  it('shows the prompt again once a dismissal is older than 30 days', async () => {
    installMatchMedia({ mobile: true });
    useIosUserAgent();
    localStorage.setItem(
      ADMIN_INSTALL_DISMISS_KEY,
      String(Date.now() - THIRTY_DAYS_MS - 1000),
    );

    render(<AdminInstallPrompt />);

    expect(await screen.findByText(/Thêm vào màn hình chính/)).toBeInTheDocument();
    expect(localStorage.getItem(ADMIN_INSTALL_DISMISS_KEY)).toBeNull();
  });

  it('does not crash when matchMedia is unavailable', () => {
    Reflect.deleteProperty(window, 'matchMedia');

    const { container } = render(<AdminInstallPrompt />);

    expect(container).toBeEmptyDOMElement();
  });
});
