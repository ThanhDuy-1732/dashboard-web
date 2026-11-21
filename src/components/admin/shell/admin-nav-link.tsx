'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type AdminNavLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  variant?: 'sidebar' | 'mobile';
};

export function AdminNavLink({
  href,
  label,
  icon,
  exact = false,
  variant = 'mobile',
}: AdminNavLinkProps) {
  const pathname = usePathname() ?? '';
  const active = exact ? pathname === href : pathname.startsWith(href);
  const variantClasses =
    variant === 'sidebar'
      ? 'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm focus-visible:outline-white'
      : 'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] leading-tight focus-visible:outline-moss';
  const stateClasses =
    variant === 'sidebar'
      ? active
        ? 'bg-white/10 text-white'
        : 'text-white/70 hover:bg-white/5 hover:text-white'
      : active
        ? 'text-moss'
        : 'text-muted hover:text-ink';

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${variantClasses} ${stateClasses} transition-colors focus-visible:outline-2 focus-visible:outline-offset-2`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
