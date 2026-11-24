'use client';

import { useEffect, useState } from 'react';
import type { PublicApp } from '@/lib/db/types';

function useStandaloneDisplay(): boolean {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia('(display-mode: standalone)');
    const update = () => {
      const iosStandalone =
        'standalone' in window.navigator &&
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setStandalone(media.matches || iosStandalone);
    };

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return standalone;
}

const thumbFrame = 'block overflow-hidden border-b border-line bg-moss/5';

function AppThumb({ app }: { app: PublicApp }) {
  if (app.preview_url) {
    return (
      <span className={`${thumbFrame} bg-moss/10`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={app.preview_url}
          alt=""
          width={1200}
          height={750}
          loading="lazy"
          decoding="async"
          className="aspect-[16/10] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
    );
  }

  if (app.icon_url) {
    return (
      <span className={`${thumbFrame} flex aspect-[16/10] items-center justify-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={app.icon_url}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="h-14 w-14 rounded-xl border border-line object-cover"
        />
      </span>
    );
  }

  return (
    <span className={`${thumbFrame} flex aspect-[16/10] items-center justify-center`}>
      <span
        data-testid="app-icon-fallback"
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-moss font-display text-2xl font-semibold text-paper"
      >
        {app.name.slice(0, 1).toUpperCase()}
      </span>
    </span>
  );
}

export function AppCard({ app }: { app: PublicApp }) {
  const standalone = useStandaloneDisplay();

  return (
    <a
      href={`/api/go/${app.slug}`}
      target={standalone ? undefined : '_blank'}
      rel={standalone ? undefined : 'noopener noreferrer'}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition-colors hover:border-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss"
    >
      <AppThumb app={app} />

      <span className="flex flex-1 flex-col gap-1 px-4 pt-3 pb-4">
        <span className="font-display text-lg font-semibold leading-6 tracking-tight text-ink">
          {app.name}
        </span>
        {app.description ? (
          <span className="line-clamp-2 text-sm leading-5 text-ink/70">{app.description}</span>
        ) : null}
      </span>
    </a>
  );
}
