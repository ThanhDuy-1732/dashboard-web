import Link from 'next/link';
import { StatusPill } from '@/components/admin/status-pill';
import type { AdminAppView } from '@/lib/admin/overview';
import { formatLatency, formatRelativeTime } from '@/lib/format';

function targetState(
  target: AdminAppView['app'],
  paused: boolean,
): 'up' | 'down' | 'unknown' | 'off' | 'paused' {
  if (paused) return 'paused';
  return target?.state ?? 'off';
}

function latestCheckAt(app: AdminAppView): string | null {
  const times = [app.app?.lastCheckAt, app.supabase?.lastCheckAt].filter(
    (value): value is string => Boolean(value),
  );
  if (times.length === 0) return null;
  return times.reduce((latest, value) =>
    new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
  );
}

function AppStatusCardContent({
  app,
  now,
}: {
  app: AdminAppView;
  now: Date;
}) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {app.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={app.iconUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-moss font-display font-semibold text-paper"
          >
            {app.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-semibold text-ink">
            {app.name}
          </span>
          <span className="block truncate text-xs text-muted">/{app.slug}</span>
        </span>
        <span data-testid="app-worst-state">
          <StatusPill
            state={app.paused ? 'paused' : app.worstState}
            size="sm"
          />
        </span>
      </div>

      {!app.isVisible ? (
        <span className="mt-2 inline-block rounded-full border border-line px-2 py-0.5 text-xs text-muted">
          Đang ẩn
        </span>
      ) : null}

      {app.paused ? (
        <p className="mt-3 text-sm text-muted">Ứng dụng đang tạm dừng theo dõi.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-xs text-muted">App</span>
            <span className="flex items-center gap-2">
              <StatusPill state={targetState(app.app, app.paused)} size="sm" />
              <span className="text-xs tabular-nums text-muted">
                {formatLatency(app.app?.latencyMs ?? null)}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-xs text-muted">Supabase</span>
            <span className="flex items-center gap-2">
              <StatusPill state={targetState(app.supabase, app.paused)} size="sm" />
              <span className="text-xs tabular-nums text-muted">
                {formatLatency(app.supabase?.latencyMs ?? null)}
              </span>
            </span>
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-muted">
        Kiểm tra {formatRelativeTime(latestCheckAt(app), now)}
      </p>
    </>
  );
}

export function AppStatusCard({
  app,
  now,
  offline = false,
}: {
  app: AdminAppView;
  now: Date;
  offline?: boolean;
}) {
  const className = `block rounded-xl border border-line bg-card px-4 py-4 ${
    !app.paused && app.worstState === 'down'
      ? 'border-l-4 border-l-bad-fg bg-bad-bg'
      : ''
  } ${
    offline
      ? ''
      : 'transition-colors hover:border-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss'
  }`;

  if (offline) {
    return (
      <div className={className}>
        <AppStatusCardContent app={app} now={now} />
      </div>
    );
  }

  return (
    <Link href={`/admin/apps/${app.id}`} className={className}>
      <AppStatusCardContent app={app} now={now} />
    </Link>
  );
}
