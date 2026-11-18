import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_HUB_NAME: z.string().min(1).default('Ecosystem Hub'),
  ADMIN_PASSWORD: z.string().min(12),
  SESSION_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),
  IP_HASH_SALT: z.string().min(16),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ALERT_FROM_EMAIL: z.string().min(3).default('onboarding@resend.dev'),
});

export type ServerEnv = z.infer<typeof envSchema>;

const placeholderSecrets = new Set([
  'change-me-now',
  'replace-with-at-least-32-random-characters',
  'replace-with-at-least-16-random-characters',
]);

export function getServerEnv(): ServerEnv {
  const env = envSchema.parse(process.env);

  if (process.env.NODE_ENV === 'production') {
    for (const key of ['ADMIN_PASSWORD', 'SESSION_SECRET', 'CRON_SECRET', 'IP_HASH_SALT'] as const) {
      if (placeholderSecrets.has(env[key])) {
        throw new Error(`${key} still uses a documented placeholder; set a real secret`);
      }
    }
  }

  return env;
}
