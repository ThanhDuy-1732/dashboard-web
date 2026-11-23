'use client';

import Link from 'next/link';
import { pauseMonitoringAction, resumeMonitoringAction } from '@/app/admin/(protected)/apps/actions';

export function PauseMenu({
  appId,
  paused,
  showEdit = false,
}: {
  appId: string;
  paused: boolean;
  showEdit?: boolean;
}) {
  return (
    <details className="relative inline-block text-left">
      <summary
        aria-label="Tùy chọn giám sát"
        className="cursor-pointer list-none rounded-md border border-line px-2 py-1 text-sm leading-none text-muted hover:border-moss hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
      >
        <span aria-hidden="true">⋯</span>
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
        {showEdit ? (
          <Link
            href={`/admin/apps/${appId}/edit`}
            className="rounded-md px-2.5 py-2 text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-moss"
          >
            Sửa
          </Link>
        ) : null}
      </div>
    </details>
  );
}
