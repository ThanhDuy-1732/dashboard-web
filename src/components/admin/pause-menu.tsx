'use client';

import { pauseMonitoringAction, resumeMonitoringAction } from '@/app/admin/(protected)/apps/actions';

export function PauseMenu({
  appId,
  paused,
}: {
  appId: string;
  paused: boolean;
}) {
  return (
    <details className="relative inline-block text-left">
      <summary className="cursor-pointer list-none rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink/70 hover:border-moss hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss">
        Tùy chọn giám sát
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid min-w-44 gap-1 rounded-lg border border-line bg-card p-1.5 shadow-lg">
        {paused ? (
          <button
            type="button"
            onClick={() => void resumeMonitoringAction(appId)}
            className="rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss"
          >
            Tiếp tục giám sát
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void pauseMonitoringAction(appId, 30)}
              className="rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss"
            >
              Tạm dừng 30 phút
            </button>
            <button
              type="button"
              onClick={() => void pauseMonitoringAction(appId, 60)}
              className="rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss"
            >
              Tạm dừng 60 phút
            </button>
          </>
        )}
      </div>
    </details>
  );
}
