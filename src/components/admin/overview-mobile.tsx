import Link from 'next/link';
import type { AdminOverviewModel } from '@/lib/admin/overview';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { AppStatusCard } from './app-status-card';
import { AttentionList } from './attention-list';

type Hero = {
  title: string;
  detail?: string;
  className: string;
};

function statusHero(model: AdminOverviewModel, now: Date): Hero {
  const { counts, apps } = model;

  if (apps.length === 0) {
    return {
      title: 'Chưa có ứng dụng nào',
      className: 'border-line bg-card text-ink',
    };
  }

  if (model.allPaused) {
    return {
      title: 'Đang tạm dừng giám sát',
      className: 'border-line bg-unknown-bg text-unknown-fg',
    };
  }

  if (counts.monitoredTargets === 0) {
    return {
      title: 'Chưa bật giám sát',
      className: 'border-line bg-unknown-bg text-unknown-fg',
    };
  }

  if (counts.apps.down > 0) {
    return {
      title: `${counts.apps.down} ứng dụng đang lỗi`,
      detail: `${counts.apps.up}/${apps.length} ứng dụng ổn · ${counts.targets.down} mục tiêu lỗi · ${formatRelativeTime(model.lastCheckAt, now)}`,
      className: 'border-bad-fg bg-bad-bg text-bad-fg',
    };
  }

  if (counts.apps.unknown > 0) {
    return {
      title: 'Cần kiểm tra',
      className: 'border-warn-fg bg-warn-bg text-warn-fg',
    };
  }

  return {
    title: 'Tất cả hệ thống ổn định',
    className: 'border-ok-fg bg-ok-bg text-ok-fg',
  };
}

export function OverviewMobile({
  model,
  now,
  offline = false,
  savedAt,
}: {
  model: AdminOverviewModel;
  now: Date;
  offline?: boolean;
  savedAt?: string | Date;
}) {
  const hero = statusHero(model, now);

  return (
    <div className="space-y-4">
      {offline ? (
        <p
          role="status"
          className="rounded-lg border border-line bg-card px-4 py-3 text-sm text-muted"
        >
          Đang offline · Dữ liệu lúc{' '}
          {savedAt ? formatDateTime(savedAt) : '—'} · Kiểm tra cuối{' '}
          {formatRelativeTime(model.lastCheckAt, now)}
        </p>
      ) : null}

      {model.isStale ? (
        <div
          role="status"
          className="rounded-lg border border-warn-fg bg-warn-bg px-4 py-3"
        >
          <p className="font-semibold text-warn-fg">
            Dữ liệu giám sát đang cũ.
          </p>
          <p className="mt-1 text-sm text-muted">
            {model.lastCheckAt
              ? `Kiểm tra cuối ${formatRelativeTime(model.lastCheckAt, now)}.`
              : 'Chưa có lần kiểm tra nào.'}
          </p>
        </div>
      ) : null}

      <section
        aria-labelledby="overview-mobile-status"
        className={`rounded-xl border p-5 ${hero.className}`}
      >
        <h2
          id="overview-mobile-status"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          {hero.title}
        </h2>
        {hero.detail ? (
          <p className="mt-2 text-sm text-muted">{hero.detail}</p>
        ) : null}
        {model.apps.length === 0 && !offline ? (
          <Link
            href="/admin/apps/new"
            className="mt-4 inline-flex rounded-md bg-moss px-3 py-2 text-sm font-semibold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
          >
            Thêm ứng dụng
          </Link>
        ) : null}
      </section>

      <AttentionList items={model.attention} now={now} offline={offline} />

      {model.apps.length > 0 ? (
        <section aria-labelledby="overview-mobile-apps">
          <h2
            id="overview-mobile-apps"
            className="font-display text-lg font-semibold"
          >
            Tất cả ứng dụng
          </h2>
          <div className="mt-3 space-y-3">
            {model.apps.map((app) => (
              <AppStatusCard
                key={app.id}
                app={app}
                now={now}
                offline={offline}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
