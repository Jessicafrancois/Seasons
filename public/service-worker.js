const CACHE_PREFIX = 'seasons-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v7';
const HOME = '/';
const STATIC_FILES = [
  '/manifest.webmanifest',
  '/register-pwa.js',
  '/icons/seasons-180.png',
  '/icons/seasons-192.png',
  '/icons/seasons-512.png',
  '/seasons/fall/forest.jpeg',
  '/assets/profile/profile-qr.png',
  '/assets/fonts/dm-sans-400.woff2',
  '/assets/fonts/dm-sans-500.woff2',
  '/assets/fonts/dm-sans-600.woff2',
  '/assets/fonts/dm-sans-700.woff2',
  '/assets/fonts/italiana-400.woff2',
  '/js/app.js',
  '/js/components/page-head.js',
  '/js/components/project-card.js',
  '/js/components/season-hero.js',
  '/js/components/track-list.js',
  '/seasons/fall/content.js',
  '/js/content/index.js',
  '/js/pages/collection.js',
  '/js/pages/home.js',
  '/js/pages/inquiry.js',
  '/js/pages/profile.js',
  '/js/pages/project.js',
  '/js/pages/seasons.js',
  '/js/pages/track.js',
  '/js/router.js',
  '/styles/seasons.css',
  '/styles/home-editorial.css'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([HOME, ...STATIC_FILES].map(path => new Request(path, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function openHome(request) {
  const cache = await caches.open(CACHE_NAME);
  let response;
  try {
    response = await fetch(request);
  } catch {
    return (await cache.match(HOME)) ?? Response.error();
  }

  if (response.ok && response.headers.get('Content-Type')?.startsWith('text/html')) {
    await cache.put(HOME, response.clone()).catch(error => {
      console.warn('Seasons could not update the offline page.', error);
    });
  }
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Every page of the export renders from the hash on the home document.
  if (request.mode === 'navigate' && url.pathname === HOME) {
    event.respondWith(openHome(request));
  } else if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(request)) ?? fetch(request);
    })());
  }
});
