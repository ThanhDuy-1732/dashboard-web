import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { StatusBadge } from '@/components/admin/status-badge';
import { ClickChart } from '@/components/charts/click-chart';
import { LatencyChart } from '@/components/charts/latency-chart';
import {
  averageLatency,
  dailyClickSeries,
  dayKey,
  summarizeClicks,
  uptimePercent,
} from '@/lib/analytics/stats';
import { getAppById } from '@/lib/db/apps';
import {
  getStatuses,
  listChecksForAppSince,
  listIncidents,
  listRecentChecks,
} from '@/lib/db/checks';
import { listClicksSince } from '@/lib/db/clicks';
import type { CheckRow, HealthState, Target } from '@/lib/db/types';
import { formatDateTime, formatLatency, formatUptime } from '@/lib/format';

export const instant = false;

const tz = 'Asia/Ho_Chi_Minh';
const DAY_MS = 24 * 60 * 60 * 1000;

function latencyByDay(checks: CheckRow[], days: number, now: Date) {
  const keys = Array.from({ length: days }, (_, index) =>
    dayKey(new Date(now.getTime() - (days - 1 - index) * DAY_MS), tz),
  );
  const groups = new Map<string, number[]>(keys.map((key) => [key, []]));

  for (const check of checks) {
    const key = dayKey(new Date(check.checked_at), tz);
    const group = groups.get(key);
    if (group) group.push(check.latency_ms);
  }

  return keys.map((day) => {
    const values = groups.get(day) ?? [];
    return {
      day,
      avgMs: values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : null,
    };
  });
}

function TargetSection({
  appId,
  target,
  label,
  checks7,
  recentChecks,
  incidents,
  status,
  now,
}: {
  appId: string;
  target: Target;
  label: string;
  checks7: CheckRow[];
  recentChecks: CheckRow[];
  incidents: Awaited<ReturnType<typeof listIncidents>>;
  status?: HealthState;
  now: Date;
}) {
  const since24 = now.getTime() - DAY_MS;
  const checks24 = checks7.filter(
    (check) => new Date(check.checked_at).getTime() >= since24,
  );
  const targetIncidents = incidents.filter((incident) => incident.target === target);
  const rows = recentChecks.filter((check) => check.target === target).slice(0, 20);

  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold">{label}</h2>
          <StatusBadge state={status} />
        </div>
        <Link
          href={`/admin/apps/${appId}/edit`}
          className="text-xs text-ink/45 hover:text-ink"
        >
          Sửa cấu hình →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-ink/45">Uptime 24h</p>
          <p className="mt-0.5 font-display text-xl font-semibold">
            {formatUptime(uptimePercent(checks24))}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink/45">Uptime 7 ngày</p>
          <p className="mt-0.5 font-display text-xl font-semibold">
            {formatUptime(uptimePercent(checks7))}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink/45">Độ trễ TB 7 ngày</p>
          <p className="mt-0.5 font-display text-xl font-semibold">
            {formatLatency(averageLatency(checks7))}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs text-ink/45">Độ trễ theo ngày</p>
        <LatencyChart data={latencyByDay(checks7, 7, now)} />
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Lần kiểm tra gần đây</h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-ink/45">Chưa có dữ liệu.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-ink/45">
                <tr>
                  <th className="py-1 pr-3 font-medium">Thời điểm</th>
                  <th className="py-1 pr-3 font-medium">Trạng thái</th>
                  <th className="py-1 pr-3 font-medium">HTTP</th>
                  <th className="py-1 pr-3 font-medium">Độ trễ</th>
                  <th className="py-1 font-medium">Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((check) => (
                  <tr key={check.id}>
                    <td className="py-1.5 pr-3 text-ink/60">
                      {formatDateTime(check.checked_at)}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className={check.ok ? 'text-moss' : 'text-red-700'}>
                        {check.ok ? 'Ổn' : 'Lỗi'}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-ink/60">{check.status_code ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-ink/60">{check.latency_ms} ms</td>
                    <td className="max-w-48 truncate py-1.5 text-ink/45">
                      {check.error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold">Sự cố</h3>
        {targetIncidents.length === 0 ? (
          <p className="mt-2 text-sm text-ink/45">Chưa có sự cố.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-xs">
            {targetIncidents.map((incident) => (
              <li key={incident.id} className="rounded-lg border border-line px-3 py-2">
                <p className="text-ink/70">
                  {formatDateTime(incident.started_at)} →{' '}
                  {incident.resolved_at ? formatDateTime(incident.resolved_at) : 'đang mở'}
                </p>
                {incident.first_error ? (
                  <p className="mt-0.5 text-ink/45">{incident.first_error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const app = await getAppById(id);
  if (!app) notFound();

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const since7 = new Date(now.getTime() - 7 * DAY_MS);

  const [allClicks, checks7, recentChecks, incidents, statuses] = await Promise.all([
    listClicksSince(since30),
    listChecksForAppSince(app.id, since7),
    listRecentChecks(app.id, 40),
    listIncidents(app.id, 20),
    getStatuses(),
  ]);

  const clicks = allClicks.filter((click) => click.app_id === app.id);
  const summary = summarizeClicks(clicks, now, tz);
  const series = dailyClickSeries(clicks, 30, now, tz);
  const statusMap = new Map(
    statuses
      .filter((status) => status.app_id === app.id)
      .map((status) => [status.target, status.state]),
  );

  return (
    <section>
      <Link href="/admin/apps" className="text-sm text-ink/50 hover:text-ink">
        ← Ứng dụng
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{app.name}</h1>
          <p className="mt-1 text-sm text-ink/50">
            /{app.slug} ·{' '}
            <a href={app.url} target="_blank" rel="noreferrer" className="hover:text-ink">
              {app.url}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!app.is_visible ? (
            <span className="rounded-full border border-line px-2 py-0.5 text-ink/50">
              Đang ẩn
            </span>
          ) : null}
          {app.monitoring_paused_until ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
              Tạm dừng giám sát
            </span>
          ) : null}
          <Link
            href={`/admin/apps/${app.id}/edit`}
            className="rounded-md border border-line px-2.5 py-1.5 text-ink/70 hover:border-moss hover:text-ink"
          >
            Sửa
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <p className="text-xs text-ink/45">Lượt bấm 30 ngày</p>
          <p className="mt-1 font-display text-2xl font-semibold">{summary.last30}</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <p className="text-xs text-ink/45">Khách riêng 30 ngày</p>
          <p className="mt-1 font-display text-2xl font-semibold">{summary.unique30}</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <p className="text-xs text-ink/45">Lượt bấm hôm nay</p>
          <p className="mt-1 font-display text-2xl font-semibold">{summary.today}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Lượt bấm 30 ngày</h2>
        <div className="mt-3">
          <ClickChart data={series} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <TargetSection
          appId={app.id}
          target="app"
          label="Ứng dụng"
          checks7={checks7.filter((check) => check.target === 'app')}
          recentChecks={recentChecks}
          incidents={incidents}
          status={statusMap.get('app') as HealthState | undefined}
          now={now}
        />
        <TargetSection
          appId={app.id}
          target="supabase"
          label="Supabase"
          checks7={checks7.filter((check) => check.target === 'supabase')}
          recentChecks={recentChecks}
          incidents={incidents}
          status={statusMap.get('supabase') as HealthState | undefined}
          now={now}
        />
      </div>
    </section>
  );
}
