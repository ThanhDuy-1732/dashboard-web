import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://hub.test';
process.env.NEXT_PUBLIC_HUB_NAME ??= 'Ecosystem Hub';
process.env.ADMIN_PASSWORD ??= 'test-password';
process.env.SESSION_SECRET ??= '01234567890123456789012345678901';
process.env.CRON_SECRET ??= '01234567890123456789012345678901';
process.env.IP_HASH_SALT ??= 'test-salt-0123456789';
