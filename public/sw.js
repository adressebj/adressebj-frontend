const CACHE_NAME = 'adressebj-v2';
const ADDRESS_CACHE = 'adressebj-addresses-v2';
const MAX_CACHED_ADDRESSES = 10;
const PRECACHE_URLS = ['/', '/offline.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ADDRESS_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

async function trimAddressCache() {
  const cache = await caches.open(ADDRESS_CACHE);
  const keys = await cache.keys();
  if (keys.length <= MAX_CACHED_ADDRESSES) return;
  const excess = keys.length - MAX_CACHED_ADDRESSES;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i]);
  }
}

// « Network-first » pour les pages d'adresse `/a/:code` : en ligne, on sert
// TOUJOURS la version fraîche du réseau (et on rafraîchit le cache), car les
// instructions d'une adresse peuvent être corrigées — servir une version
// périmée enverrait un visiteur au mauvais endroit. Le cache ne sert que de
// repli hors-ligne (un visiteur qui a déjà ouvert l'adresse la retrouve sans
// réseau). C'était auparavant du « stale-while-revalidate », qui affichait
// d'abord l'ancienne version mise en cache — d'où des mises en page périmées.
async function networkFirst(request) {
  const cache = await caches.open(ADDRESS_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
      await trimAddressCache();
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || caches.match('/offline.html');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.includes('/api/v1/auth')) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith('/a/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match('/offline.html')),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  if (url) {
    event.waitUntil(self.clients.openWindow(url));
  }
});
