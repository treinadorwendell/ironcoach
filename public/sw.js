// IronCoach PWA Service Worker - 100% Offline Support for Gym / Tablet
const CACHE_NAME = 'ironcoach-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial failure:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension, internal APIs and dev assets
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/api/')) {
    return; // Pass through to network directly without service worker interception
  }

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/').then((res) => res || Response.error());
      })
    );
    return;
  }

  // Static assets cache
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !url.pathname.startsWith('/_next/')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});

// BACKGROUND REST TIMER & NOTIFICATIONS
let scheduledRestTimeout = null;

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_REST_NOTIFICATION') {
    if (scheduledRestTimeout) {
      clearTimeout(scheduledRestTimeout);
      scheduledRestTimeout = null;
    }

    const { targetTime, exerciseName, setNumber } = event.data;
    const now = Date.now();
    const delay = Math.max(0, targetTime - now);

    scheduledRestTimeout = setTimeout(() => {
      self.registration.showNotification('⏱️ Descanso Finalizado!', {
        body: `Hora da Série #${setNumber || 1} de ${exerciseName || 'Exercício'}. Bora lá!`,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'ironcoach-rest-complete',
        renotify: true,
        requireInteraction: true,
        vibrate: [250, 100, 250, 100, 400],
        data: {
          url: '/',
          exerciseName,
          setNumber,
        },
      });
      scheduledRestTimeout = null;
    }, delay);
  } else if (event.data.type === 'CANCEL_REST_NOTIFICATION') {
    if (scheduledRestTimeout) {
      clearTimeout(scheduledRestTimeout);
      scheduledRestTimeout = null;
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

