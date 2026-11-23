import Link from 'next/link';
import { StatusPill } from '@/components/admin/status-pill';
import type { AdminAppView } from '@/lib/admin/overview';
import { formatLatency } from '@/lib/format';

function targetState(
  target: AdminAppView['app'],
  paused: boolean,
): 'up' | 'down' | 'unknown' | 'off' | 'paused' {
  if (paused) return 'paused';
  return target?.state ?? 'off';
}

function AppStatusCardContent({ app }: { app: AdminAppView }) {
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
          <span className="block truncate text-xs text-ink/50">/{app.slug}</span>
        </span>
        {app.paused ? <StatusPill state="paused" size="sm" /> : null}
      </div>

      {app.paused ? (
        <p className="mt-3 text-sm text-ink/55">Ứng dụng đang tạm dừng theo dõi.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-xs text-ink/55">App</span>
            <span className="flex items-center gap-2">
              <StatusPill state={targetState(app.app, app.paused)} size="sm" />
              <span className="text-xs tabular-nums text-ink/55">
                {formatLatency(app.app?.latencyMs ?? null)}
              </span>
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-xs text-ink/55">Supabase</span>
            <span className="flex items-center gap-2">
              <StatusPill state={targetState(app.supabase, app.paused)} size="sm" />
              <span className="text-xs tabular-nums text-ink/55">
                {formatLatency(app.supabase?.latencyMs ?? null)}
              </span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}

export function AppStatusCard({
  app,
  offline = false,
}: {
  app: AdminAppView;
  offline?: boolean;
}) {
  const className = `block rounded-xl border border-line bg-card px-4 py-4 ${
    app.paused ? 'opacity-70' : app.worstState === 'down' ? 'border-l-4 border-l-red-500 bg-red-50' : ''
  } ${
    offline
      ? ''
      : 'transition-colors hover:border-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss'
  }`;

  if (offline) {
    return (
      <div className={className}>
        <AppStatusCardContent app={app} />
      </div>
    );
  }

  return (
    <Link href={`/admin/apps/${app.id}`} className={className}>
      <AppStatusCardContent app={app} />
    </Link>
  );
}
