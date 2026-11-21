import type { HealthState } from '@/lib/db/types';
import { StatusPill } from './status-pill';

export function StatusBadge({ state = 'unknown' }: { state?: HealthState }) {
  return <StatusPill state={state} size="sm" />;
}
