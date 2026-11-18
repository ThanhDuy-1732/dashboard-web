import Link from 'next/link';

export const metadata = {
  title: 'Đang offline',
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-12 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-7">
        <p className="text-sm font-medium text-moss">Ecosystem Hub</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Bạn đang offline
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          Trang hub đã lưu sẽ hiển thị khi bạn mở lại từ màn hình chính. Kết nối mạng
          để tải danh sách mới nhất.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-moss px-4 py-2 text-sm font-semibold text-paper hover:bg-ink"
        >
          Thử lại
        </Link>
      </div>
    </main>
  );
}
