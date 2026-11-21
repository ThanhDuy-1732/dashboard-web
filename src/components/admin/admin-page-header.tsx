import type { ReactNode } from 'react';
import { formatRelativeTime } from '@/lib/format';

const tones = {
  ok: 'bg-ok-bg text-ok-fg',
  warn: 'bg-warn-bg text-warn-fg',
  neutral: 'bg-unknown-bg text-unknown-fg',
} as const;

export function AdminPageHeader({
  title,
  description,
  lastCheckAt,
  isStale,
  now,
  actions,
}: {
  title: string;
  description?: string;
  lastCheckAt: string | null;
  isStale: boolean;
  now: Date;
  actions?: ReactNode;
}) {
  const tone = lastCheckAt === null ? 'neutral' : isStale ? 'warn' : 'ok';
  const freshness =
    lastCheckAt === null
      ? 'Chưa có dữ liệu'
      : `Cập nhật ${formatRelativeTime(lastCheckAt, now)}`;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <span
            data-tone={tone}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {freshness}
          </span>
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
