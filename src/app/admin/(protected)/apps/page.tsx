import Link from 'next/link';
import { connection } from 'next/server';
import { AppsTable } from '@/components/admin/apps-table';
import { listAllApps } from '@/lib/db/apps';
import { getStatuses } from '@/lib/db/checks';

export const instant = false;

export default async function AppsPage() {
  await connection();
  const [apps, statuses] = await Promise.all([listAllApps(), getStatuses()]);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Ứng dụng</h1>
          <p className="mt-1 text-sm text-ink/55">
            {apps.length} ứng dụng · kéo để sắp xếp thứ tự trên hub
          </p>
        </div>
        <Link
          href="/admin/apps/new"
          className="rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-ink"
        >
          Thêm ứng dụng
        </Link>
      </div>

      <AppsTable apps={apps} statuses={statuses} />
    </section>
  );
}
