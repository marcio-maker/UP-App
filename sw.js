// sw.js - Service Worker para Universidade de Pais (COM ESTRATÉGIA HÍBRIDA E RECURSOS COMPLETOS)

// AUMENTAMOS A VERSÃO para forçar a atualização do Service Worker e do cache.
const CACHE_NAME = 'universidade-pais-v2.3.3'; 
// Cache de Ativos Estáticos
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/course-data.json', 
  '/quiz-data.json',
  '/intro.html',
  '/login.html',
  '/auth.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação: Cacheia ativos
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((error) => console.error('❌ Falha na instalação:', error))
  );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('🔥 Service Worker ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Híbrida (SWR pra JSON, Cache First pro resto)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.includes('/course-data.json') || url.pathname.includes('/quiz-data.json')) {
    console.log(`📡 SWR para: ${url.pathname}`);
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.destination === 'document') {
            return caches.match('/index.html'); 
          }
          return new Response('Conteúdo offline não disponível', { status: 503 });
        });
    })
  );
});

// Função SWR
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(cache => {
    return cache.match(request).then(cachedResponse => {
      const networkFetch = fetch(request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(error => console.error(`Falha na rede (SWR): ${request.url}`, error));
      return cachedResponse || networkFetch;
    });
  });
}

// Push e Notification (mantido original)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { 
    title: 'Novo Lembrete do Curso', 
    body: 'Uma nova aula espera por você!', 
    icon: '/icons/icon-192x192.png' 
  };

  const options = {
    body: data.body,
    icon: data.icon,
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'curso-familia-notificacao',
    data: { url: data.url || '/index.html#aula-recente' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Comunicação com cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});