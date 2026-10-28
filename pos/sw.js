/* =============================================
   SHADEN POS — Service Worker (PWA para PC)
   Cache inteligente, offline app shell y
   sincronización en segundo plano.
   ============================================= */

const CACHE_NAME = 'shaden-pos-v1.2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/pos.css',
  './js/pos-app.js',
  './js/pos-db.js',
  './js/pos-scanner.js',
  './js/pos-utils.js',
  '../js/supabase.js',
  '../js/data.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/chart.js@4'
];

/* ── 1. INSTALL: Precaching de assets críticos ── */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Precaching app shell para escritorio...');
      // Intentar cachear uno por uno para que una falla externa no rompa el install
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('[SW] No se pudo precachear:', asset, e);
        }
      }
    })
  );
});

/* ── 2. ACTIVATE: Limpieza de caches antiguos ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ── 3. FETCH: Estrategia híbrida ── */
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // No interceptar peticiones POST/PUT/DELETE o llamadas a Supabase REST
  if (req.method !== 'GET' || url.hostname.includes('supabase.co')) {
    return;
  }

  // Para navegación HTML (document): Network First con fallback a Cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Para recursos estáticos (CSS, JS, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return networkRes;
        })
        .catch(() => {
          // Si no hay red, usar cache
        });

      return cached || fetchPromise;
    })
  );
});
