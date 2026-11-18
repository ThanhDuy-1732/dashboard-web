'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPassword,
} from '@/lib/auth/admin';
import {
  LOGIN_WINDOW_MINUTES,
  isLoginLocked,
  loginIpHash,
} from '@/lib/auth/login';
import {
  clearLoginFailures,
  countRecentLoginFailures,
  recordLoginFailure,
} from '@/lib/db/login';
import { getServerEnv } from '@/lib/env';

const passwordSchema = z.string().min(1);

export async function loginAction(formData: FormData) {
  const parsed = passwordSchema.safeParse(formData.get('password'));
  const env = getServerEnv();
  const headerStore = await headers();
  const ipHash = loginIpHash(headerStore.get('x-forwarded-for'), env.IP_HASH_SALT);

  let locked = false;
  try {
    const failures = await countRecentLoginFailures(
      ipHash,
      new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000),
    );
    locked = isLoginLocked(failures);
  } catch (error) {
    console.error('login throttle check failed', error);
  }

  if (locked) {
    redirect('/admin/login?error=locked');
  }

  const valid = parsed.success && verifyPassword(parsed.data, env.ADMIN_PASSWORD);

  if (!valid) {
    try {
      await recordLoginFailure(ipHash);
    } catch (error) {
      console.error('failed to record login failure', error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    redirect('/admin/login?error=1');
  }

  try {
    await clearLoginFailures(ipHash);
  } catch (error) {
    console.error('failed to clear login failures', error);
  }

  const token = await createSessionToken();
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect('/admin');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/admin/login');
}
