import { connection } from 'next/server';
import { LogoutButton } from '@/components/admin/logout-button';
import { SettingsForm } from '@/components/admin/settings-form';
import { getSettings } from '@/lib/db/settings';

export const instant = false;

export default async function SettingsPage() {
  await connection();
  const settings = await getSettings();

  return (
    <section>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Cài đặt</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Cấu hình kênh cảnh báo và ngưỡng giám sát. Nút gửi thử dùng ứng dụng đầu tiên
        trong danh sách.
      </p>

      <SettingsForm initial={settings} />

      <div className="mt-6 rounded-xl border border-line bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Phiên đăng nhập</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Kết thúc phiên quản trị trên thiết bị này. Bạn sẽ cần nhập lại mật khẩu để tiếp tục.
        </p>
        <div className="mt-4 max-w-xs">
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
