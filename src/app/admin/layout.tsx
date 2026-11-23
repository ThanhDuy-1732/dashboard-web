import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AdminServiceWorkerRegister } from '@/components/admin/admin-sw-register';

export const metadata: Metadata = {
  title: 'Ecosystem Admin',
  description: 'Theo dõi trạng thái hệ sinh thái',
  manifest: '/admin/manifest.webmanifest',
  icons: {
    icon: '/icons/admin-icon-192.png',
    apple: '/icons/admin-icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ecosystem Admin',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminServiceWorkerRegister />
      {children}
    </>
  );
}
