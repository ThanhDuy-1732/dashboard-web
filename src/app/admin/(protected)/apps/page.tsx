import Link from 'next/link';
import { connection } from 'next/server';
import { AdminBadge } from '@/components/admin/admin-badge';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AppsTable } from '@/components/admin/apps-table';
import { buildAdminOverview } from '@/lib/admin/overview';
import { listAllApps } from '@/lib/db/apps';
import { getStatuses } from '@/lib/db/checks';

export const instant = false;

export default async function AppsPage() {
  await connection();
  const now = new Date();
  const [apps, statuses] = await Promise.all([listAllApps(), getStatuses()]);
  const model = buildAdminOverview(apps, statuses, [], now);

  return (
    <section className="space-y-5">
      <AdminBadge downTargetCount={model.counts.targets.down} />
      <AdminPageHeader
        title="Ứng dụng"
        description={`${apps.length} ứng dụng · kéo để sắp xếp thứ tự trên hub`}
        lastCheckAt={model.lastCheckAt}
        isStale={model.isStale}
        now={now}
        actions={
          <Link
            href="/admin/apps/new"
            className="rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink"
          >
            Thêm ứng dụng
          </Link>
        }
      />

      <AppsTable apps={apps} statuses={statuses} />
    </section>
  );
}
