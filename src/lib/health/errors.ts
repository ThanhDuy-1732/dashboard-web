import type { Target } from '@/lib/db/types';

export type HealthRunFailure = {
  slug: string;
  target: Target;
  code: string | null;
  message: string;
};

export class HealthRunError extends Error {
  readonly checked: number;
  readonly failures: number;
  readonly details: HealthRunFailure[];

  constructor(checked: number, details: HealthRunFailure[]) {
    super(`${details.length} health target(s) failed to persist`);
    this.name = 'HealthRunError';
    this.checked = checked;
    this.failures = details.length;
    this.details = details;
  }

  describe(): string {
    if (this.details.length === 0) return this.message;

    const parts = this.details.map((detail) => {
      const code = detail.code ? `${detail.code} ` : '';
      return `${detail.slug}:${detail.target} ${code}${detail.message}`.trim();
    });

    return `${this.message}: ${parts.join(' | ')}`;
  }
}
