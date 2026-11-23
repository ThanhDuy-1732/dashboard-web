import Link from 'next/link';
import type { AdminAttentionItem } from '@/lib/admin/overview';
import type { Target } from '@/lib/db/types';
import { formatRelativeTime } from '@/lib/format';
import { StatusPill, statusPillLabels } from './status-pill';

const targetLabels: Record<Target, string> = {
  app: 'Ứng dụng',
  supabase: 'Supabase',
};

const cardClass = 'block rounded-xl border border-line bg-card p-3';
const linkClass = `${cardClass} transition-colors hover:border-moss/50 hover:bg-paper/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss`;

function AttentionItemContent({
  item,
  now,
}: {
  item: AdminAttentionItem;
  now: Date;
}) {
  const detail =
    item.consecutiveFailures > 0
      ? `${item.consecutiveFailures} lần lỗi liên tiếp`
      : 'Chưa có dữ liệu kiểm tra';

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{item.appName}</p>
        <p className="mt-0.5 text-sm text-muted">
          {targetLabels[item.target]} · {detail}
        </p>
        {item.lastError ? (
          <p className="mt-1 line-clamp-2 break-words text-sm text-muted">
            Lỗi gần nhất: {item.lastError}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusPill
          state={item.state}
          size="sm"
          ariaLabel={`${item.appName}, ${targetLabels[item.target]}, ${statusPillLabels[item.state]}`}
        />
        <span className="text-xs text-muted">
          {formatRelativeTime(item.lastCheckAt, now)}
        </span>
      </div>
    </div>
  );
}

export function AttentionList({
  items,
  now,
  offline = false,
}: {
  items: AdminAttentionItem[];
  now: Date;
  offline?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Cần chú ý">
      <h2 className="font-display text-lg font-semibold">Cần chú ý</h2>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={`${item.appId}:${item.target}`}>
            {offline ? (
              <div className={cardClass}>
                <AttentionItemContent item={item} now={now} />
              </div>
            ) : (
              <Link
                href={`/admin/apps/${item.appId}`}
                className={linkClass}
              >
                <AttentionItemContent item={item} now={now} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
