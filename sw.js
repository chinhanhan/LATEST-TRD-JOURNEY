const CACHE_NAME = 'trd-journey-v97-deep-audit-rule-matching-and-closed-trade-editing-fix';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v97-deep-audit-rule-matching-and-closed-trade-editing-fix',
  './audioEngine.js?v=v97-deep-audit-rule-matching-and-closed-trade-editing-fix',
  './dataEngine.js?v=v97-deep-audit-rule-matching-and-closed-trade-editing-fix',
  './dock.js?v=v97-deep-audit-rule-matching-and-closed-trade-editing-fix',
  './gallery.js?v=v97-deep-audit-rule-matching-and-closed-trade-editing-fix',
  './app.js?v=v97-deep-audit-rule-matching-and-closed-trade-editing-fix',
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
