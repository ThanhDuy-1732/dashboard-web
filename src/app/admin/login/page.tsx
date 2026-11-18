import { loginAction } from '@/app/admin/login/actions';

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === '1';
  const isLocked = params.error === 'locked';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-12 text-ink">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-7"
      >
        <p className="text-sm font-medium text-moss">Ecosystem Hub</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Quản trị</h1>
        <p className="mt-2 text-sm text-ink/55">Nhập mật khẩu để xem bảng điều khiển.</p>

        <label htmlFor="password" className="mt-6 block text-sm font-medium">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-base outline-none focus:border-moss focus:ring-2 focus:ring-moss/20"
        />

        {hasError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Sai mật khẩu.
          </p>
        ) : null}
        {isLocked ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Quá nhiều lần thử. Thử lại sau 15 phút.
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-moss px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
        >
          Đăng nhập
        </button>
      </form>
    </main>
  );
}
