const CACHE = 'ecosystem-admin-v1';
const PRECACHE = [
  '/admin/offline',
  '/admin/manifest.webmanifest',
  '/icons/admin-icon-192.png',
  '/icons/admin-icon-512.png',
  '/icons/admin-icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('ecosystem-admin-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.searchParams.has('_rsc') || request.headers.has('RSC')) return;
  if (request.headers.has('Next-Action')) return;

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, event));
    return;
  }

  if (request.mode !== 'navigate') return;
  if (!(url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) return;

  event.respondWith(navigationNetworkFirst(request));
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    /^\/icons\/[^/]+\.(png|svg|webp|ico)$/.test(pathname) ||
    /\.(woff2?|ttf|otf|eot)$/i.test(pathname)
  );
}

async function cacheFirst(request, event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  if (cached) {
    event.waitUntil(
      fetch(request)
        .then((response) => {
          if (response.ok) return cache.put(request, response.clone());
        })
        .catch(() => undefined),
    );
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone()).catch(() => {});
  return response;
}

async function navigationNetworkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match('/admin/offline')) || Response.error();
  }
}
