import { Suspense } from 'react';
import { connection } from 'next/server';
import { HubGrid } from '@/components/hub-grid';
import { listVisibleApps } from '@/lib/db/apps';

const hubName = process.env.NEXT_PUBLIC_HUB_NAME ?? 'Ecosystem Hub';

async function HubList() {
  await connection();
  const apps = await listVisibleApps();

  return (
    <>
      <p className="mt-6 text-sm text-ink/55">
        {apps.length} ứng dụng đang mở
      </p>
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
            Chọn một ứng dụng để mở. Tất cả trong một chỗ, không cần nhớ link.
          </p>
        </header>

        <Suspense
          fallback={
            <div className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="Đang tải danh sách">
              {[0, 1].map((item) => (
                <div key={item} className="h-[82px] animate-pulse rounded-xl border border-line bg-card" />
              ))}
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
