// Memora Service Worker - Minimal PWA Support
// This is a basic service worker for PWA installation

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through - no caching for now
  event.respondWith(fetch(event.request));
});
