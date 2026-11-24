import { Suspense } from 'react';
import { connection } from 'next/server';
import { HubGrid } from '@/components/hub-grid';
import { listVisibleApps } from '@/lib/db/apps';

const hubName = process.env.NEXT_PUBLIC_HUB_NAME ?? 'Ecosystem Hub';

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="aspect-[16/10] w-full animate-pulse bg-line/40" />
      <div className="space-y-2 px-4 pt-3 pb-4">
        <div className="h-4 w-1/2 animate-pulse rounded bg-line/50" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-line/40" />
      </div>
    </div>
  );
}

async function HubList() {
  await connection();
  const apps = await listVisibleApps();

  return (
    <>
      <p className="mt-6 text-sm text-ink/55">{apps.length} ứng dụng</p>
      <HubGrid apps={apps} />
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-20">
        <header className="border-b border-line pb-8">
          <p className="text-sm font-medium text-moss">Hệ sinh thái của tôi</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {hubName}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-ink/60">
            Mỗi ứng dụng làm một việc riêng. Chọn cái bạn cần — không cần nhớ link.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="mt-6">
              <div className="h-4 w-24 animate-pulse rounded bg-line/50" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2" aria-label="Đang tải danh sách">
                {[0, 1, 2, 3].map((item) => (
                  <CardSkeleton key={item} />
                ))}
              </div>
            </div>
          }
        >
          <HubList />
        </Suspense>

        <footer className="mt-14 border-t border-line pt-5 text-xs text-ink/40">
          {hubName}
        </footer>
      </div>
    </main>
  );
}
