'use client';

import { useEffect, useState } from 'react';

export const ADMIN_INSTALL_DISMISS_KEY = 'admin-install-prompt-dismissed-at';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type PromptMode = 'hidden' | 'ios' | 'chrome';

function matchesQuery(query: string): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (matchesQuery('(display-mode: standalone)')) return true;
  if (typeof navigator === 'undefined') return false;
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(ADMIN_INSTALL_DISMISS_KEY);
    if (raw === null) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    if (Date.now() - dismissedAt >= THIRTY_DAYS_MS) {
      localStorage.removeItem(ADMIN_INSTALL_DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function AdminInstallPrompt() {
  const [mode, setMode] = useState<PromptMode>('hidden');
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!matchesQuery('(max-width: 1023px)')) return;
    if (isStandalone() || isDismissed()) return;

    let active = true;
    if (isIos()) {
      // Defer: the first render must match the server output (nothing), and
      // browser-only details are only known after hydration.
      queueMicrotask(() => {
        if (active) setMode('ios');
      });
      return () => {
        active = false;
      };
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setMode('chrome');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  if (mode === 'hidden' || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(ADMIN_INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage can be unavailable in private mode; the prompt still hides.
    }
  };

  const handleInstall = () => {
    if (!installEvent) return;
    void Promise.resolve(installEvent.prompt()).catch(() => {});
    const choice = installEvent.userChoice;
    if (choice) {
      void choice
        .then(({ outcome }) => {
          if (outcome === 'accepted') setDismissed(true);
        })
        .catch(() => {});
    }
  };

  return (
    <div
      role="region"
      aria-label="Cài ứng dụng Ecosystem Admin"
      className="fixed inset-x-4 bottom-20 z-40 flex items-start gap-3 rounded-xl border border-line bg-card p-4 shadow-lg lg:hidden"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Cài ứng dụng Ecosystem Admin</p>
        {mode === 'ios' ? (
          <p className="mt-1 text-xs leading-5 text-muted">
            Chạm nút Chia sẻ trong Safari, rồi chọn &ldquo;Thêm vào màn hình
            chính&rdquo;.
          </p>
        ) : (
          <p className="mt-1 text-xs leading-5 text-muted">
            Cài ứng dụng để xem trạng thái nhanh cả khi đang offline.
          </p>
        )}
        {installEvent ? (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-3 min-h-11 rounded-md bg-moss px-3 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            Cài ứng dụng
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Ẩn lời nhắc cài đặt"
        className="-mr-1 -mt-1 min-h-11 min-w-11 rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        &times;
      </button>
    </div>
  );
}
