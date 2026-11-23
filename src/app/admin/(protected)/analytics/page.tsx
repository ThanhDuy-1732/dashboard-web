import { connection } from 'next/server';
import { ClickChart } from '@/components/charts/click-chart';
import {
  clickCountsByApp,
  dailyClickSeries,
  summarizeClicks,
} from '@/lib/analytics/stats';
import { listAllApps } from '@/lib/db/apps';
import { listClicksSince } from '@/lib/db/clicks';

export const instant = false;

const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_DAYS = 30;
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const number = new Intl.NumberFormat('vi-VN');

export default async function AdminAnalyticsPage() {
  await connection();
  const now = new Date();
  const [apps, clicks] = await Promise.all([
    listAllApps(),
    listClicksSince(new Date(now.getTime() - ANALYTICS_DAYS * DAY_MS)),
  ]);
  const summary = summarizeClicks(clicks, now, TIME_ZONE);
  const series = dailyClickSeries(clicks, ANALYTICS_DAYS, now, TIME_ZONE);
  const clickCounts = new Map(
    clickCountsByApp(clicks).map(({ appId, count }) => [appId, count]),
  );
  const appRows = [...apps].sort(
    (a, b) =>
      (clickCounts.get(b.id) ?? 0) - (clickCounts.get(a.id) ?? 0) ||
      a.name.localeCompare(b.name),
  );

  const metrics = [
    ['Lượt bấm hôm nay', summary.today],
    ['7 ngày', summary.last7],
    ['30 ngày', summary.last30],
    ['Khách riêng 30 ngày', summary.unique30],
  ] as const;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Phân tích
        </h1>
        <p className="mt-1 text-sm text-muted">
          Lượt bấm và khách riêng trong 30 ngày gần nhất.
        </p>
      </header>

      <dl
        role="group"
        aria-label="Chỉ số lượt bấm"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-card px-4 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
              {number.format(value)}
            </dd>
          </div>
        ))}
      </dl>

      <section
        aria-labelledby="analytics-click-chart"
        className="rounded-xl border border-line bg-card p-5"
      >
        <div>
          <h2
            id="analytics-click-chart"
            className="font-display text-lg font-semibold text-ink"
          >
            Lượt bấm 30 ngày
          </h2>
          <p className="text-xs text-muted">Tất cả ứng dụng, theo ngày Việt Nam</p>
        </div>
        <div className="mt-3">
          <ClickChart data={series} />
        </div>
      </section>

      <section
        aria-labelledby="analytics-app-clicks"
        className="overflow-hidden rounded-xl border border-line bg-card"
      >
        <div className="border-b border-line px-5 py-4">
          <h2
            id="analytics-app-clicks"
            className="font-display text-lg font-semibold text-ink"
          >
            Lượt bấm theo ứng dụng
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table
            aria-label="Lượt bấm theo ứng dụng"
            className="min-w-full text-left text-sm"
          >
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">
                <th scope="col" className="px-5 py-3">
                  Ứng dụng
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Lượt bấm 30 ngày
                </th>
              </tr>
            </thead>
            <tbody>
              {appRows.map((app) => (
                <tr key={app.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-medium text-ink">
                    {app.name}
                  </th>
                  <td className="px-5 py-3 text-right tabular-nums text-muted">
                    {number.format(clickCounts.get(app.id) ?? 0)}
                  </td>
                </tr>
              ))}
              {appRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-5 py-8 text-center text-sm text-muted">
                    Chưa có ứng dụng.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
