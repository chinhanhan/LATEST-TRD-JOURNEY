const CACHE_NAME = 'trd-journey-v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards',
  './audioEngine.js?v=v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards',
  './dataEngine.js?v=v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards',
  './dock.js?v=v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards',
  './gallery.js?v=v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards',
  './app.js?v=v105-dimension5-jsdoc-types-passive-listeners-and-runtime-resilience-guards',
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
