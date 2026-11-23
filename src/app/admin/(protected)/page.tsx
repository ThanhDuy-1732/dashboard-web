import Link from 'next/link';
import { connection } from 'next/server';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { OverviewDesktop } from '@/components/admin/overview-desktop';
import { OverviewMobile } from '@/components/admin/overview-mobile';
import { buildAdminOverview } from '@/lib/admin/overview';
import { listAllApps } from '@/lib/db/apps';
import { getStatuses, listChecksSince, listRecentIncidents } from '@/lib/db/checks';

export const instant = false;

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminOverviewPage() {
  await connection();
  const now = new Date();
  const [apps, statuses, checks, incidents] = await Promise.all([
    listAllApps(),
    getStatuses(),
    listChecksSince(new Date(now.getTime() - DAY_MS)),
    listRecentIncidents(10),
  ]);
  const model = buildAdminOverview(apps, statuses, checks, now);

  return (
    <div className="space-y-5">
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

      <div className="hidden lg:block">
        <OverviewDesktop model={model} incidents={incidents} now={now} />
      </div>
      <div className="lg:hidden">
        <OverviewMobile model={model} now={now} />
      </div>
    </div>
  );
}
