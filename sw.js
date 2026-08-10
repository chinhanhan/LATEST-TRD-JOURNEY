const CACHE_NAME = 'trd-journey-v94-dynamic-sop-checklist-length-and-quick-edit';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v94-dynamic-sop-checklist-length-and-quick-edit',
  './audioEngine.js?v=v94-dynamic-sop-checklist-length-and-quick-edit',
  './dataEngine.js?v=v94-dynamic-sop-checklist-length-and-quick-edit',
  './dock.js?v=v94-dynamic-sop-checklist-length-and-quick-edit',
  './gallery.js?v=v94-dynamic-sop-checklist-length-and-quick-edit',
  './app.js?v=v94-dynamic-sop-checklist-length-and-quick-edit',
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
