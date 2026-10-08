// Service worker: offline shell plus the Android share target.
//
// Sharing an image to the installed app POSTs it to ./share-target (see
// manifest.webmanifest). No server exists to receive it, so this worker
// intercepts the POST, parks the image in a cache and redirects to the app,
// which picks it up (app.js, takeSharedImage).

const SHELL_CACHE = 'chess-capture-shell-v1';
const SHARE_CACHE = 'chess-capture-share';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'fen.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== SHELL_CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(receiveShare(event.request));
    return;
  }

  if (event.request.method === 'GET') {
    event.respondWith(networkFirst(event.request));
  }
});

async function receiveShare(request) {
  const back = new URL('./?shared', self.registration.scope).href;
  try {
    const form = await request.formData();
    const image = form.get('image');
    if (image) {
      const cache = await caches.open(SHARE_CACHE);
      await cache.put(
        'shared-image',
        new Response(image, { headers: { 'Content-Type': image.type || 'image/jpeg' } }),
      );
    }
  } catch {
    // Fall through: open the app without a photo rather than an error page.
  }
  return Response.redirect(back, 303);
}

// Network first, so a deploy shows up on the next load; the cache is only the
// offline fallback.
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw new Error(`offline and not cached: ${request.url}`);
  }
}
