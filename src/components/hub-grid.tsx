import { AppCard } from '@/components/app-card';
import type { PublicApp } from '@/lib/db/types';

export function HubGrid({ apps }: { apps: PublicApp[] }) {
  if (apps.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-line px-6 py-16 text-center">
        <p className="font-display text-lg font-semibold text-ink">Chưa có ứng dụng nào</p>
        <p className="mt-1 text-sm text-ink/55">Danh sách sẽ xuất hiện ở đây khi được thêm vào.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2">
      {apps.map((app) => (
        <AppCard key={app.id} app={app} />
      ))}
    </div>
  );
}
