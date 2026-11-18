import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  adminGate,
  verifySessionToken,
} from '@/lib/auth/session';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const hasValidSession = token ? await verifySessionToken(token) : false;

  const decision = adminGate({
    pathname: request.nextUrl.pathname,
    hasValidSession,
  });

  if (decision === 'login') {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
