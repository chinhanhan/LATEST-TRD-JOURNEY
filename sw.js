const CACHE_NAME = 'trd-journey-v64-multi-bugfix-date-grouping-streak-guards';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v64-multi-bugfix-date-grouping-streak-guards',
  './audioEngine.js?v=v64-multi-bugfix-date-grouping-streak-guards',
  './dataEngine.js?v=v64-multi-bugfix-date-grouping-streak-guards',
  './dock.js?v=v64-multi-bugfix-date-grouping-streak-guards',
  './gallery.js?v=v64-multi-bugfix-date-grouping-streak-guards',
  './app.js?v=v64-multi-bugfix-date-grouping-streak-guards',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Network-first strategy to ensure users always get the latest app version
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    fetch(e.request).then((networkRes) => {
      if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
      }
      return networkRes;
    }).catch(() => {
      return caches.match(e.request).then((res) => {
        if (res) return res;
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
