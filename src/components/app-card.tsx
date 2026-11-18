import type { PublicApp } from '@/lib/db/types';

export function AppCard({ app }: { app: PublicApp }) {
  return (
    <a
      href={`/api/go/${app.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-line bg-card px-4 py-4 transition-colors hover:border-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
    >
      {app.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.icon_url}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover"
        />
      ) : (
        <span
          data-testid="app-icon-fallback"
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-moss font-display text-xl font-semibold text-paper"
        >
          {app.name.slice(0, 1).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-semibold tracking-tight text-ink">
          {app.name}
        </span>
        {app.description ? (
          <span className="mt-0.5 block truncate text-sm text-ink/60">{app.description}</span>
        ) : null}
      </span>

      <span
        aria-hidden="true"
        className="text-xl text-ink/30 transition-transform group-hover:translate-x-0.5 group-hover:text-moss"
      >
        →
      </span>
    </a>
  );
}
