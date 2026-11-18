'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPassword,
} from '@/lib/auth/admin';
import { getServerEnv } from '@/lib/env';

const passwordSchema = z.string().min(1);

export async function loginAction(formData: FormData) {
  const parsed = passwordSchema.safeParse(formData.get('password'));

  if (!parsed.success) {
    redirect('/admin/login?error=1');
  }

  const env = getServerEnv();
  if (!verifyPassword(parsed.data, env.ADMIN_PASSWORD)) {
    redirect('/admin/login?error=1');
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
