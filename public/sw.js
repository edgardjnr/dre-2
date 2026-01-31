const CACHE_NAME = 'dre-pwa-v4';
const scopeUrl = new URL(self.registration.scope);
const basePath = scopeUrl.pathname.endsWith('/') ? scopeUrl.pathname.slice(0, -1) : scopeUrl.pathname;
const withBase = (path) => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}`;
};
const CORE_CACHE = [
  withBase('/'),
  withBase('/manifest.json'),
  withBase('/favicon.svg'),
  withBase('/icon-192.png'),
  withBase('/icon-512.png')
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(CORE_CACHE);
      })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  // Evitar cache para assets de build do Vite (sempre rede)
  if (event.request.url.includes('/assets/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Scripts e styles: priorizar rede
  if (event.request.destination === 'script' || event.request.destination === 'style') {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  // Navegação: network-only para evitar index.html desatualizado após deploy
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'reload' })).catch(async () => {
        const cached = await caches.match(withBase('/'));
        return cached || new Response('Offline', { status: 503 });
      })
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          return new Response(JSON.stringify({ error: 'Falha na conexão de rede' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle background sync logic here
  console.log('Background sync triggered');
  return Promise.resolve();
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do DRE',
    icon: withBase('/icon-192.png'),
    badge: withBase('/icon-192.png'),
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir DRE',
        icon: withBase('/icon-192.png')
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: withBase('/icon-192.png')
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Sistema DRE', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow(scopeUrl.origin + withBase('/'))
    );
  }
});

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
