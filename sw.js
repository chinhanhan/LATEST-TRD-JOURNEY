const CACHE_NAME = 'trd-journey-v96-fix-normalize-trade-preflight-checklist-persistence';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v96-fix-normalize-trade-preflight-checklist-persistence',
  './audioEngine.js?v=v96-fix-normalize-trade-preflight-checklist-persistence',
  './dataEngine.js?v=v96-fix-normalize-trade-preflight-checklist-persistence',
  './dock.js?v=v96-fix-normalize-trade-preflight-checklist-persistence',
  './gallery.js?v=v96-fix-normalize-trade-preflight-checklist-persistence',
  './app.js?v=v96-fix-normalize-trade-preflight-checklist-persistence',
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

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
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
