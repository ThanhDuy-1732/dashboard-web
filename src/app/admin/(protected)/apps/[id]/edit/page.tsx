import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppForm } from '@/components/admin/app-form';
import { getAppById } from '@/lib/db/apps';
import { updateAppAction } from '../../actions';

export const instant = false;

export default async function EditAppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getAppById(id);

  if (!app) notFound();

  return (
    <section>
      <Link href="/admin/apps" className="text-sm text-muted hover:text-ink">
        ← Ứng dụng
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Sửa {app.name}
      </h1>
      <p className="mt-1 text-sm text-muted">Thay đổi có hiệu lực ngay sau khi lưu.</p>

      <AppForm
        action={updateAppAction.bind(null, app.id)}
        initial={{
          name: app.name,
          slug: app.slug,
          description: app.description ?? undefined,
          url: app.url,
          iconUrl: app.icon_url ?? undefined,
          supabaseRef: app.supabase_ref ?? undefined,
          supabaseHealthUrl: app.supabase_health_url ?? undefined,
          expectedStatus: app.expected_status,
          timeoutMs: app.timeout_ms,
          monitorApp: app.monitor_app,
          monitorSupabase: app.monitor_supabase,
        }}
        submitLabel="Lưu thay đổi"
      />
    </section>
  );
}
