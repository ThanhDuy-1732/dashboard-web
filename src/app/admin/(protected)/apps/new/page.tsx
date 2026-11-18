import Link from 'next/link';
import { AppForm } from '@/components/admin/app-form';
import { createAppAction } from '../actions';

export const instant = false;

export default function NewAppPage() {
  return (
    <section>
      <Link href="/admin/apps" className="text-sm text-ink/50 hover:text-ink">
        ← Ứng dụng
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Thêm ứng dụng
      </h1>
      <p className="mt-1 text-sm text-ink/55">
        Thông tin này hiển thị trên hub và dùng cho health check.
      </p>

      <AppForm action={createAppAction} submitLabel="Lưu ứng dụng" />
    </section>
  );
}
