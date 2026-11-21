export type StatusPillState = 'up' | 'down' | 'unknown' | 'off' | 'paused';
export type StatusPillSize = 'sm' | 'md' | 'lg';

const labels: Record<StatusPillState, string> = {
  up: 'Ổn',
  down: 'Lỗi',
  unknown: 'Chưa rõ',
  off: 'Tắt',
  paused: 'Tạm dừng',
};

const styles: Record<StatusPillState, string> = {
  up: 'bg-ok-bg text-ok-fg',
  down: 'bg-bad-bg text-bad-fg',
  unknown: 'bg-unknown-bg text-unknown-fg',
  off: 'bg-unknown-bg text-unknown-fg',
  paused: 'bg-warn-bg text-warn-fg',
};

const sizes: Record<StatusPillSize, { pill: string; dot: string }> = {
  sm: { pill: 'gap-1.5 px-2 py-0.5 text-xs', dot: 'h-1.5 w-1.5' },
  md: { pill: 'gap-2 px-2.5 py-1 text-[13px]', dot: 'h-2 w-2' },
  lg: { pill: 'gap-2 px-3 py-1.5 text-sm', dot: 'h-2.5 w-2.5' },
};

export function StatusPill({
  state,
  label,
  size = 'md',
}: {
  state: StatusPillState;
  label?: string;
  size?: StatusPillSize;
}) {
  const sizing = sizes[size];

  return (
    <span
      data-state={state}
      className={`inline-flex items-center rounded-full font-medium ${styles[state]} ${sizing.pill}`}
    >
      <span aria-hidden="true" className={`rounded-full bg-current ${sizing.dot}`} />
      {label ?? labels[state]}
    </span>
  );
}
