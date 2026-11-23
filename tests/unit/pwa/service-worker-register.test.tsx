// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathname } = vi.hoisted(() => ({
  usePathname: vi.fn((): string => '/'),
}));

vi.mock('next/navigation', () => ({ usePathname }));

import { ServiceWorkerRegister } from '@/components/service-worker-register';

describe('ServiceWorkerRegister', () => {
  let register: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    register = vi.fn().mockResolvedValue(undefined);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('navigator', { serviceWorker: { register } });
    usePathname.mockReturnValue('/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('registers /sw.js on a hub path', () => {
    render(<ServiceWorkerRegister />);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('does not register on an admin path', () => {
    usePathname.mockReturnValue('/admin/apps');
    render(<ServiceWorkerRegister />);

    expect(register).not.toHaveBeenCalled();
  });

  it('registers after a client-side navigation from admin to the hub', () => {
    usePathname.mockReturnValue('/admin');
    const { rerender } = render(<ServiceWorkerRegister />);
    expect(register).not.toHaveBeenCalled();

    usePathname.mockReturnValue('/');
    rerender(<ServiceWorkerRegister />);

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('keeps the production and serviceWorker guards', () => {
    vi.stubEnv('NODE_ENV', 'test');
    render(<ServiceWorkerRegister />);
    expect(register).not.toHaveBeenCalled();

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('navigator', {});
    render(<ServiceWorkerRegister />);
    expect(register).not.toHaveBeenCalled();
  });
});
