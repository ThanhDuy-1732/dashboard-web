import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { Suspense } from 'react';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import './globals.css';

const display = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
});

const body = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

const hubName = process.env.NEXT_PUBLIC_HUB_NAME ?? 'Ecosystem Hub';

export const metadata: Metadata = {
  title: hubName,
  description: 'Chọn ứng dụng trong hệ sinh thái để tiếp tục.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: hubName,
  },
};

export const viewport: Viewport = {
  themeColor: '#eef2ea',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper font-sans text-ink">
        {children}
        <Suspense fallback={null}>
          <ServiceWorkerRegister />
        </Suspense>
      </body>
    </html>
  );
}
