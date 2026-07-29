const CACHE_NAME = 'trd-journey-v57-activity-ring-r-format-sanitized';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=v57-activity-ring-r-format-sanitized',
  './audioEngine.js?v=v57-activity-ring-r-format-sanitized',
  './dataEngine.js?v=v57-activity-ring-r-format-sanitized',
  './dock.js?v=v57-activity-ring-r-format-sanitized',
  './gallery.js?v=v57-activity-ring-r-format-sanitized',
  './app.js?v=v57-activity-ring-r-format-sanitized',
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
