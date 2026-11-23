import Link from 'next/link';
import type { RecentIncidentRow } from '@/lib/db/checks';
import type { AdminOverviewModel } from '@/lib/admin/overview';
import { formatRelativeTime } from '@/lib/format';
import { AppStatusRow } from './app-status-row';
import { IncidentRail } from './incident-rail';
import { StatusSummaryStrip } from './status-summary-strip';

const targetLabels = {
  app: 'Ứng dụng',
  supabase: 'Supabase',
} as const;

export function OverviewDesktop({
  model,
  incidents,
  now,
}: {
  model: AdminOverviewModel;
  incidents: RecentIncidentRow[];
  now: Date;
}) {
  const attention = model.attention[0];
  const attentionTone =
    attention?.state === 'unknown'
      ? 'border-warn-fg bg-warn-bg text-warn-fg focus-visible:outline-warn-fg'
      : 'border-bad-fg bg-bad-bg text-bad-fg focus-visible:outline-bad-fg';

  return (
    <div className="space-y-5">
      <StatusSummaryStrip counts={model.counts} appCount={model.apps.length} />

      {model.isStale ? (
        <div
          role="status"
          className="rounded-lg border border-warn-fg bg-warn-bg px-4 py-3"
        >
          <p className="font-semibold text-warn-fg">
            Dữ liệu giám sát đang cũ.
          </p>
          <p className="mt-1 text-sm text-muted">
            {model.lastCheckAt
              ? `Kiểm tra cuối ${formatRelativeTime(model.lastCheckAt, now)}.`
              : 'Chưa có lần kiểm tra nào.'}
          </p>
        </div>
      ) : null}

      {attention ? (
        <Link
          href={`/admin/apps/${attention.appId}`}
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${attentionTone}`}
        >
          <span className="font-semibold">{attention.appName}</span>
          <span aria-hidden="true">·</span>
          <span>{targetLabels[attention.target]}</span>
          <span aria-hidden="true">·</span>
          <span>
            {attention.consecutiveFailures > 0
              ? `${attention.consecutiveFailures} lần lỗi liên tiếp`
              : 'Chưa có dữ liệu kiểm tra'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formatRelativeTime(attention.lastCheckAt, now)}</span>
          <span className="ml-auto font-semibold">Xem chi tiết</span>
        </Link>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <div className="overflow-visible rounded-xl border border-line bg-card">
            <table
              aria-label="Tình trạng ứng dụng"
              className="min-w-full text-left text-sm"
            >
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3">
                    Ứng dụng
                  </th>
                  <th scope="col" className="px-4 py-3">
                    App
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Supabase
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Độ trễ
                  </th>
                  <th scope="col" className="sr-only">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {model.apps.map((app) => (
                  <AppStatusRow key={app.id} app={app} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="xl:hidden">
            <IncidentRail incidents={incidents} />
          </div>
        </div>

        <div className="hidden xl:block">
          <IncidentRail incidents={incidents} />
        </div>
      </div>
    </div>
  );
}
