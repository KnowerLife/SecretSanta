const CACHE_NAME = 'secret-santa-v59-dashboard';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=59',
  './app.js?v=59',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './assets/images/hero-winter-scene.jpg',
  './assets/images/step-create-game.jpg',
  './assets/images/step-invite-friends.jpg',
  './assets/images/step-draw-gifts.jpg',
  './assets/images/dashboard-empty.jpg',
  './assets/images/audience-remote.jpg',
  './assets/images/feature-anonymous-chat.jpg',
  './assets/images/privacy-who-sees.jpg',
  './assets/images/gift-ideas.jpg',
  './assets/images/cta-celebration.jpg',
  './assets/images/chat-empty.jpg',
  './assets/images/quick-draw-success.jpg',
  './assets/images/social-cover.jpg',
  './assets/images/mode-online.jpg',
  './assets/images/mode-quick.jpg',
  './assets/images/mode-demo.jpg',
  './assets/images/rules-fair-draw.jpg',
  './assets/images/testimonials-friends.jpg',
  './assets/images/faq-help.jpg',
  './assets/images/create-game-head.jpg',
  './assets/images/join-game-head.jpg',
  './assets/images/quick-draw-head.jpg',
  './assets/images/recipient-waiting.jpg',
  './assets/images/chat-waiting.jpg',
  './assets/images/profile-empty.jpg',
  './assets/images/wishlist-empty.jpg',
  './assets/images/invite-share.jpg',
  './assets/images/access-empty.jpg',
  './assets/images/activity-empty.jpg'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
      }
      return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
    return r;
  })));
});
self.addEventListener('sync', e => {
  if (e.tag !== 'secret-santa-sync') return;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      const client = clients.find(c => c.focused) || clients[0];
      if (client) client.postMessage({ type: 'flush-offline-queue' });
    }));
});
