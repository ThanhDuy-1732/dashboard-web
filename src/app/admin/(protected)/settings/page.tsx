import { connection } from 'next/server';
import { SettingsForm } from '@/components/admin/settings-form';
import { getSettings } from '@/lib/db/settings';

export const instant = false;

export default async function SettingsPage() {
  await connection();
  const settings = await getSettings();

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Cài đặt</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink/55">
        Cấu hình kênh cảnh báo và ngưỡng giám sát. Nút gửi thử dùng ứng dụng đầu tiên
        trong danh sách.
      </p>

      <SettingsForm initial={settings} />
    </section>
  );
}
