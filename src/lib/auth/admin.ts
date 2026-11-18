import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

export {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  adminGate,
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from '@/lib/auth/session';

export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token || !(await verifySessionToken(token))) {
    redirect('/admin/login');
  }
}
