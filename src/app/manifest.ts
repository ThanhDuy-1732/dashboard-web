import type { MetadataRoute } from 'next';

const hubName = process.env.NEXT_PUBLIC_HUB_NAME ?? 'Ecosystem Hub';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: hubName,
    short_name: hubName,
    description: 'Chọn ứng dụng trong hệ sinh thái để tiếp tục.',
    start_url: '/',
    display: 'standalone',
    lang: 'vi',
    theme_color: '#eef2ea',
    background_color: '#eef2ea',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
