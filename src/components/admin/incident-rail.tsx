import type { RecentIncidentRow } from '@/lib/db/checks';
import { formatDateTime } from '@/lib/format';

const targetNames = {
  app: 'Ứng dụng',
  supabase: 'Supabase',
} as const;

function formatDuration(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 1) return 'chưa tới 1 phút';
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;

  return `${Math.floor(hours / 24)} ngày`;
}

export function IncidentRail({
  incidents,
  now,
}: {
  incidents: RecentIncidentRow[];
  now: Date;
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
          {incidents.map((incident) => {
            const startedAt = new Date(incident.started_at);
            const endedAt = incident.resolved_at ? new Date(incident.resolved_at) : now;
            const duration = formatDuration(startedAt, endedAt);

            return (
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
                {incident.resolved_at ? (
                  <p className="text-xs text-muted">
                    Đã khôi phục {formatDateTime(incident.resolved_at)}
                  </p>
                ) : null}
                <p className="text-xs text-muted">
                  {incident.resolved_at
                    ? `Kéo dài ${duration}`
                    : `Đang mở ${duration}`}
                </p>
                {incident.app_paused ? (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Tạm dừng theo dõi
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
