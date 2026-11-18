import type { HealthState } from '@/lib/db/types';

const styles: Record<HealthState, string> = {
  up: 'border-moss/25 bg-moss/10 text-moss',
  down: 'border-red-200 bg-red-50 text-red-700',
  unknown: 'border-line bg-ink/5 text-ink/50',
};

const labels: Record<HealthState, string> = {
  up: 'Ổn',
  down: 'Lỗi',
  unknown: 'Chưa rõ',
};

export function StatusBadge({ state = 'unknown' }: { state?: HealthState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[state]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[state]}
    </span>
  );
}
