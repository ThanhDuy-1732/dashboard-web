import type { AppRow, Target } from '@/lib/db/types';

export type CheckResult = {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
};

export type HealthTarget = {
  appId: string;
  slug: string;
  name: string;
  target: Target;
  url: string;
  expectedStatus: number;
  timeoutMs: number;
  method: string;
  headers: Record<string, string>;
};

export type HealthAlert = {
  kind: 'down' | 'recovered' | 'slow' | 'down-reminder';
  app: AppRow;
  target: Target;
  check: CheckResult;
  at: Date;
  downtimeMs?: number;
};
