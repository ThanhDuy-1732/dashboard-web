import Link from 'next/link';
import { PauseMenu } from '@/components/admin/pause-menu';
import { StatusPill } from '@/components/admin/status-pill';
import type { AdminAppView } from '@/lib/admin/overview';
import { formatLatency } from '@/lib/format';

function targetState(
  app: AdminAppView,
  target: 'app' | 'supabase',
): 'up' | 'down' | 'unknown' | 'off' | 'paused' {
  if (app.paused) return 'paused';
  return (target === 'app' ? app.app : app.supabase)?.state ?? 'off';
}

export function AppStatusRow({ app }: { app: AdminAppView }) {
  const failing = !app.paused && app.worstState === 'down';
  const latency = app.paused
    ? null
    : (app.app?.latencyMs ?? app.supabase?.latencyMs ?? null);

  return (
    <tr
      className={`border-b border-line ${
        app.paused
          ? 'opacity-60'
          : failing
            ? 'border-l-4 border-l-red-500 bg-red-50'
            : ''
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {app.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.iconUrl}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-moss font-display font-semibold text-paper"
            >
              {app.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={`/admin/apps/${app.id}`}
              className="block truncate font-semibold text-ink hover:text-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
            >
              {app.name}
            </Link>
            <span className="block truncate text-xs text-ink/50">/{app.slug}</span>
            {!app.isVisible ? (
              <span className="mt-1 inline-block rounded-full border border-line px-2 py-0.5 text-[11px] text-ink/55">
                Đang ẩn
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill state={targetState(app, 'app')} size="sm" />
      </td>
      <td className="px-4 py-3">
        <StatusPill state={targetState(app, 'supabase')} size="sm" />
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-ink/65">
        {formatLatency(latency)}
      </td>
      <td className="px-4 py-3 text-right">
        <PauseMenu appId={app.id} paused={app.paused} />
      </td>
    </tr>
  );
}
