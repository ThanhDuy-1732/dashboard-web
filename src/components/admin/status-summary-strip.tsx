import type { AdminOverviewCounts } from '@/lib/admin/overview';

const cells = [
  { state: 'up', label: 'Ổn', dot: 'bg-ok-fg' },
  { state: 'down', label: 'Lỗi', dot: 'bg-bad-fg' },
  { state: 'unknown', label: 'Chưa rõ', dot: 'bg-unknown-fg' },
] as const;

export function StatusSummaryStrip({
  counts,
  appCount,
}: {
  counts: AdminOverviewCounts;
  appCount: number;
}) {
  const visibleCells =
    counts.apps.paused > 0
      ? [
          ...cells,
          { state: 'paused', label: 'Tạm dừng', dot: 'bg-warn-fg' } as const,
        ]
      : cells;

  const summary =
    counts.monitoredTargets === 0
      ? `${appCount} ứng dụng · Chưa bật giám sát`
      : `${appCount} ứng dụng · ${counts.monitoredTargets} mục tiêu · ${counts.targets.up}/${counts.monitoredTargets} mục tiêu ổn`;

  return (
    <section aria-label="Tình trạng theo ứng dụng" className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Theo ứng dụng
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibleCells.map((cell) => (
          <div
            key={cell.state}
            data-state={cell.state}
            className="rounded-lg border border-line bg-paper/60 px-3 py-2.5"
          >
            <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${cell.dot}`}
              />
              {cell.label}
            </dt>
            <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">
              {counts.apps[cell.state]}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted">{summary}</p>
    </section>
  );
}
