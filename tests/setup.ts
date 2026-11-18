import '@testing-library/jest-dom/vitest';

process.env.SUPABASE_URL ??= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key';
process.env.NEXT_PUBLIC_SITE_URL ??= 'https://hub.test';
process.env.CRON_SECRET ??= '01234567890123456789012345678901';
process.env.IP_HASH_SALT ??= 'test-salt-0123456789';
process.env.ADMIN_EMAILS ??= 'owner@example.com';
process.env.NEXT_PUBLIC_HUB_NAME ??= 'Ecosystem Hub';
