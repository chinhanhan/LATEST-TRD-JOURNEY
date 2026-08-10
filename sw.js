const CACHE_NAME = 'trd-journey-v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization',
  './audioEngine.js?v=v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization',
  './dataEngine.js?v=v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization',
  './dock.js?v=v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization',
  './gallery.js?v=v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization',
  './app.js?v=v104-dimensions-1-to-4-deep-edge-cases-and-mae-mfe-sign-normalization',
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
