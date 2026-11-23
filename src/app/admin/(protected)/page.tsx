import Link from 'next/link';
import { connection } from 'next/server';
import { ClickChart } from '@/components/charts/click-chart';
import { StatusBadge } from '@/components/admin/status-badge';
import { pauseMonitoringAction } from '@/app/admin/(protected)/apps/actions';
import { dailyClickSeries, clickCountsByApp, summarizeClicks, averageLatency } from '@/lib/analytics/stats';
import { listAllApps } from '@/lib/db/apps';
import { getStatuses, listChecksSince } from '@/lib/db/checks';
import { listClicksSince } from '@/lib/db/clicks';
import { listRecentHealthRuns } from '@/lib/db/health-runs';
import type { CheckRow, HealthState } from '@/lib/db/types';
import { isMonitoringPaused } from '@/lib/health/targets';

export const instant = false;

const tz = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;
const number = new Intl.NumberFormat('vi-VN');

function formatRelative(minutes: number): string {
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  return `${hours} giờ trước`;
}

function lastCheckMap(checks: CheckRow[]): Map<string, CheckRow> {
  const map = new Map<string, CheckRow>();
  for (const check of checks) {
    const key = `${check.app_id}:${check.target}`;
    const current = map.get(key);
    if (!current || new Date(check.checked_at) > new Date(current.checked_at)) {
      map.set(key, check);
    }
  }
  return map;
}

function formatMs(value: number | null): string {
  return value === null ? '—' : `${value} ms`;
}

export default async function AdminOverviewPage() {
  await connection();
  const now = new Date();
  const [apps, clicks, checks, statuses, recentRuns] = await Promise.all([
    listAllApps(),
    listClicksSince(new Date(now.getTime() - 30 * DAY_MS)),
    listChecksSince(new Date(now.getTime() - DAY_MS)),
    getStatuses(),
    listRecentHealthRuns(1),
  ]);

  const summary = summarizeClicks(clicks, now, tz);
  const series = dailyClickSeries(clicks, 30, now, tz);
  const counts = new Map(clickCountsByApp(clicks).map((row) => [row.appId, row.count]));
  const statusMap = new Map(statuses.map((status) => [`${status.app_id}:${status.target}`, status]));
  const latestChecks = lastCheckMap(checks);
  const newestCheck = checks.reduce<Date | null>((latest, check) => {
    const at = new Date(check.checked_at);
    return !latest || at > latest ? at : latest;
  }, null);
  const staleMinutes = newestCheck ? Math.floor((now.getTime() - newestCheck.getTime()) / 60000) : null;
  const isStale = staleMinutes === null || staleMinutes > 10;
  const downTargets = statuses.filter((status) => status.state === 'down').length;
  const avgLatency = averageLatency(checks);
  const latestRun = recentRuns[0] ?? null;
  const sortedApps = [...apps].sort(
    (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Tổng quan</h1>
          <p className="mt-1 text-sm text-ink/55">
            {apps.length} ứng dụng · cập nhật {now.toLocaleDateString('vi-VN')}
          </p>
        </div>
        <Link href="/admin/apps" className="text-sm text-moss hover:text-ink">
          Quản lý ứng dụng →
        </Link>
      </div>

      {isStale ? (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Dữ liệu giám sát đang cũ.</strong>{' '}
          {staleMinutes === null
            ? 'Chưa có lần kiểm tra nào.'
            : `Lần kiểm tra cuối ${formatRelative(staleMinutes)}.`}{' '}
          Kiểm tra cron-job.org và endpoint <code>/api/cron/health</code>.
        </div>
      ) : null}

      {latestRun && !latestRun.ok ? (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong className="font-semibold">Lần chạy giám sát gần nhất thất bại.</strong>{' '}
          {latestRun.error ?? 'Không rõ lỗi'} · {latestRun.checked} mục tiêu đã kiểm tra,{' '}
          {latestRun.failures} lỗi ghi.
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Lượt bấm hôm nay', number.format(summary.today)],
          ['7 ngày', number.format(summary.last7)],
          ['30 ngày', number.format(summary.last30)],
          ['Khách riêng 30 ngày', number.format(summary.unique30)],
          ['Ứng dụng', `${apps.filter((app) => app.is_visible).length}/${apps.length} đang hiện`],
          ['Mục tiêu lỗi', number.format(downTargets)],
          ['Độ trễ TB 24h', formatMs(avgLatency)],
          ['Lần kiểm tra cuối', staleMinutes === null ? '—' : formatRelative(staleMinutes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-card px-4 py-4">
            <p className="text-xs text-ink/50">{label}</p>
            <p className="mt-1 font-display text-2xl font-semibold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-card p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Lượt bấm 30 ngày</h2>
            <p className="text-xs text-ink/45">Tất cả ứng dụng, theo ngày Việt Nam</p>
          </div>
        </div>
        <div className="mt-3">
          <ClickChart data={series} />
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-line bg-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">Ứng dụng</h2>
        </div>
        <div className="divide-y divide-line">
          {sortedApps.map((app) => {
            const appStatus = statusMap.get(`${app.id}:app`)?.state ?? 'unknown';
            const supabaseStatus = statusMap.get(`${app.id}:supabase`)?.state ?? 'unknown';
            const appLatency = latestChecks.get(`${app.id}:app`)?.latency_ms ?? null;
            const supabaseLatency = latestChecks.get(`${app.id}:supabase`)?.latency_ms ?? null;
            const paused = isMonitoringPaused(app, now);
            const count = counts.get(app.id) ?? 0;

            return (
              <div
                key={app.id}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/apps/${app.id}/edit`}
                      className="truncate font-medium hover:text-moss"
                    >
                      {app.name}
                    </Link>
                    {!app.is_visible ? (
                      <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink/45">
                        Đang ẩn
                      </span>
                    ) : null}
                    {paused ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        Tạm dừng
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink/40">{app.url}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-ink/55">
                  <span className="flex items-center gap-1.5">
                    App <StatusBadge state={appStatus as HealthState} />
                    <span className="text-ink/35">{formatMs(appLatency)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    Supabase <StatusBadge state={supabaseStatus as HealthState} />
                    <span className="text-ink/35">{formatMs(supabaseLatency)}</span>
                  </span>
                  <span className="min-w-14 text-right font-medium text-ink/70">
                    {number.format(count)} lượt
                  </span>
                  {!paused ? (
                    <form
                      action={pauseMonitoringAction.bind(null, app.id, 30)}
                      className="inline"
                    >
                      <button
                        type="submit"
                        className="rounded-md border border-line px-2 py-1 text-ink/55 hover:border-moss hover:text-ink"
                      >
                        Tạm dừng 30p
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
