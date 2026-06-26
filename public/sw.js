const CACHE_NAME = 'sabanos-bi-v2';

// Static precache assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use Promise.allSettled to handle individual asset registration failures gracefully
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn(`Failed to precache ${url}:`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Removing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip cross-origin POST/PUT and Google Sheets proxy calls
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);

  // Avoid caching google sheets APIs, webmanifest/assets from outside, and backend API requests
  if (
    url.hostname.includes('docs.google.com') || 
    url.pathname.includes('spreadsheets') || 
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 1. Navigation Request (index.html / root) - NETWORK-FIRST STRATEGY
  // This guarantees that when online, the client always receives the fresh index.html with the correct hashed build names.
  // When offline, it falls back gracefully to the offline cached index shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // 2. Static Resources & Dynamic Assets - CACHE-FIRST WITH SELF-HEALING FALLBACK FOR 404 HASHED BUNDLES
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // If the server returns a 404 for a build asset (meaning this client is running an old version
          // referencing outdated assets that have been cleaned up/deleted on Vercel deployment)
          if (
            networkResponse.status === 404 &&
            (url.pathname.includes('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))
          ) {
            console.warn(`Critical build asset missing (404): ${url.pathname}. Healing client...`);
            
            // Return dynamic code that instructs the client to bypass the cache and reload
            if (url.pathname.endsWith('.js')) {
              return new Response(
                'console.warn("Stale PWA build asset detected. Reloading page directly..."); setTimeout(() => window.location.reload(true), 50);',
                { headers: { 'Content-Type': 'application/javascript' } }
              );
            }
            if (url.pathname.endsWith('.css')) {
              return new Response(
                '/* Stale CSS */',
                { headers: { 'Content-Type': 'text/css' } }
              );
            }
          }

          // Cache standard successful GET responses
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.error(`PWA offline fetch failed for: ${request.url}`, err);
        });
    })
  );
});
