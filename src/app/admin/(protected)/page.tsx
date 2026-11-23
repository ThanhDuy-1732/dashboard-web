import Link from 'next/link';
import { connection } from 'next/server';
import { AdminBadge } from '@/components/admin/admin-badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { OverviewDesktop } from '@/components/admin/overview-desktop';
import { OverviewMobile } from '@/components/admin/overview-mobile';
import { AdminSnapshotWriter } from '@/components/admin/snapshot-writer';
import { buildAdminOverview } from '@/lib/admin/overview';
import { listAllApps } from '@/lib/db/apps';
import { getStatuses, listChecksSince, listRecentIncidents } from '@/lib/db/checks';
import { listRecentHealthRuns } from '@/lib/db/health-runs';

export const instant = false;

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminOverviewPage() {
  await connection();
  const now = new Date();
  const [apps, statuses, checks, incidents, recentRuns] = await Promise.all([
    listAllApps(),
    getStatuses(),
    listChecksSince(new Date(now.getTime() - DAY_MS)),
    listRecentIncidents(10),
    listRecentHealthRuns(1),
  ]);
  const model = buildAdminOverview(apps, statuses, checks, now);
  const latestRun = recentRuns[0] ?? null;

  return (
    <div className="space-y-5">
      <AdminSnapshotWriter model={model} />
      <AdminBadge downTargetCount={model.counts.targets.down} />
      <AdminPageHeader
        title="Tổng quan"
        description="Tình trạng sức khỏe ứng dụng và các sự cố gần đây."
        lastCheckAt={model.lastCheckAt}
        isStale={model.isStale}
        now={now}
        actions={
          <Link
            href="/admin/apps"
            className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:border-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            Quản lý ứng dụng
          </Link>
        }
      />

      {latestRun && !latestRun.ok ? (
        <div className="rounded-lg border border-bad-fg bg-bad-bg px-4 py-3 text-sm text-bad-fg">
          <strong className="font-semibold">Lần chạy giám sát gần nhất thất bại.</strong>{' '}
          {latestRun.error ?? 'Không rõ lỗi'} · {latestRun.checked} mục tiêu đã kiểm tra,{' '}
          {latestRun.failures} lỗi ghi.
        </div>
      ) : null}

      <div className="hidden lg:block">
        <OverviewDesktop model={model} incidents={incidents} now={now} />
      </div>
      <div className="lg:hidden">
        <OverviewMobile model={model} now={now} />
      </div>
    </div>
  );
}
