import type { RecentIncidentRow } from '@/lib/db/checks';
import { formatDateTime } from '@/lib/format';

const targetNames = {
  app: 'Ứng dụng',
  supabase: 'Supabase',
} as const;

export function IncidentRail({
  incidents,
}: {
  incidents: RecentIncidentRow[];
}) {
  return (
    <aside className="rounded-xl border border-line bg-card p-4">
      <h2 className="font-display text-base font-semibold">Sự cố gần đây</h2>
      {incidents.length === 0 ? (
        <p className="mt-4 rounded-lg bg-paper px-3 py-4 text-sm text-muted">
          Không có sự cố
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {incidents.map((incident) => (
            <li
              key={incident.id}
              className="border-l-2 border-line pl-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-ink">
                  {incident.app_name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {targetNames[incident.target]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Bắt đầu {formatDateTime(incident.started_at)}
              </p>
              <p className="text-xs text-muted">
                {incident.resolved_at
                  ? `Đã khôi phục ${formatDateTime(incident.resolved_at)}`
                  : 'đang mở'}
              </p>
              {incident.app_paused ? (
                <p className="mt-1 text-xs font-medium text-amber-800">
                  Tạm dừng theo dõi
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
