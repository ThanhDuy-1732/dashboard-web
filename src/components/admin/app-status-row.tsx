import Link from 'next/link';
import { PauseMenu } from '@/components/admin/pause-menu';
import { StatusPill, statusPillLabels } from '@/components/admin/status-pill';
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
  const appState = targetState(app, 'app');
  const supabaseState = targetState(app, 'supabase');

  return (
    <tr
      className={`border-b border-line ${
        failing ? 'border-l-4 border-l-bad-fg bg-bad-bg' : ''
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
            <span className="block truncate text-xs text-muted">/{app.slug}</span>
            {!app.isVisible ? (
              <span className="mt-1 inline-block rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                Đang ẩn
              </span>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill
          state={appState}
          size="sm"
          ariaLabel={`${app.name}, App, ${statusPillLabels[appState]}`}
        />
      </td>
      <td className="px-4 py-3">
        <StatusPill
          state={supabaseState}
          size="sm"
          ariaLabel={`${app.name}, Supabase, ${statusPillLabels[supabaseState]}`}
        />
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-muted">
        {formatLatency(latency)}
      </td>
      <td className="px-4 py-3 text-right">
        <PauseMenu appId={app.id} paused={app.paused} showEdit />
      </td>
    </tr>
  );
}
