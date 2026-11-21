import type { ReactNode } from 'react';

export const adminNavItems: {
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
}[] = [
  {
    href: '/admin',
    label: 'Tổng quan',
    exact: true,
    icon: (
      <svg
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3.75" y="3.75" width="6.5" height="6.5" rx="1" />
        <rect x="13.75" y="3.75" width="6.5" height="6.5" rx="1" />
        <rect x="3.75" y="13.75" width="6.5" height="6.5" rx="1" />
        <rect x="13.75" y="13.75" width="6.5" height="6.5" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/apps',
    label: 'Ứng dụng',
    icon: (
      <svg
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <path d="M3.5 9h17M8 9v10.5" />
      </svg>
    ),
  },
  {
    href: '/admin/analytics',
    label: 'Phân tích',
    icon: (
      <svg
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19.5V4.5M4 19.5h16" />
        <path d="m7 15 3.5-4 3 2 4.5-6" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'Cài đặt',
    icon: (
      <svg
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="9" cy="6" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="18" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];
