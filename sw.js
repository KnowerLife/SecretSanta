const CACHE_NAME = 'secret-santa-v29-exclusions-ux';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './assets/images/hero-winter-scene.jpg',
  './assets/images/step-create-game.jpg',
  './assets/images/step-invite-friends.jpg',
  './assets/images/step-draw-gifts.jpg',
  './assets/images/dashboard-empty.jpg'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; const url = new URL(e.request.url); if (url.origin !== location.origin) return; e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => { const copy=r.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)); return r; }).catch(()=>caches.match('./index.html')))); });
