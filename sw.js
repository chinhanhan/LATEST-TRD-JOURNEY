const CACHE_NAME = 'trd-journey-v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup',
  './audioEngine.js?v=v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup',
  './dataEngine.js?v=v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup',
  './dock.js?v=v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup',
  './gallery.js?v=v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup',
  './app.js?v=v77-multi-bugfix-images-for-filter-metrics-winrate-pnl-delete-trade-cleanup',
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
