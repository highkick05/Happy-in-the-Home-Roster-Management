self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch listener is required for PWAs to trigger the install prompt
  // In a real scenario, this would intercept and serve from cache
  event.respondWith(fetch(event.request).catch(() => new Response('Offline')));
});
