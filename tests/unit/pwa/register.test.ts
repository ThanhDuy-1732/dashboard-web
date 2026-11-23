import { describe, expect, it, vi } from 'vitest';
import {
  registerAdminServiceWorker,
  shouldRegisterPublicSw,
} from '@/lib/pwa/register';

function fakeNavigator() {
  const register = vi.fn().mockResolvedValue({});
  const nav = { serviceWorker: { register } } as unknown as Navigator;
  return { nav, register };
}

describe('registerAdminServiceWorker', () => {
  it('registers /admin/sw.js with the /admin scope', async () => {
    const { nav, register } = fakeNavigator();

    await expect(registerAdminServiceWorker(nav)).resolves.toBeUndefined();

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/admin/sw.js', { scope: '/admin' });
  });

  it('propagates registration failures to the caller', async () => {
    const error = new Error('registration failed');
    const { nav, register } = fakeNavigator();
    register.mockRejectedValue(error);

    await expect(registerAdminServiceWorker(nav)).rejects.toBe(error);
  });
});

describe('shouldRegisterPublicSw', () => {
  it('allows the public hub paths', () => {
    expect(shouldRegisterPublicSw('/')).toBe(true);
    expect(shouldRegisterPublicSw('/app/alpha')).toBe(true);
    expect(shouldRegisterPublicSw('/offline')).toBe(true);
  });

  it('skips /admin and every /admin/* path', () => {
    expect(shouldRegisterPublicSw('/admin')).toBe(false);
    expect(shouldRegisterPublicSw('/admin/apps')).toBe(false);
    expect(shouldRegisterPublicSw('/admin/sw.js')).toBe(false);
  });

  it('does not skip lookalike paths outside the admin segment', () => {
    expect(shouldRegisterPublicSw('/administrator')).toBe(true);
    expect(shouldRegisterPublicSw('/admin-tools')).toBe(true);
  });
});
