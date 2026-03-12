const CACHE_NAME = 'hamkkebom-pwa-v4';
const PRECACHE_URLS = [
    '/',
    '/stars/dashboard',
    '/offline',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // 오프라인 페이지 등을 사전 캐시 시도하지만, 
            // 실패해도 SW 설치는 진행되도록 catch 처리합니다.
            return cache.addAll(PRECACHE_URLS).catch(err => {
                console.warn('Precache failed (some URLs may not exist yet):', err);
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FALLBACK_RESPONSE = () =>
    new Response('', { status: 504, statusText: 'Offline' });

const FALLBACK_JSON = () =>
    new Response(JSON.stringify({ error: { code: 'OFFLINE', message: 'Offline' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
    });

const FALLBACK_HTML = () =>
    new Response('<h1>Offline</h1>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
    });

/** Network first — 성공 시 캐시 갱신, 실패 시 캐시 폴백 */
async function networkFirst(request, fallbackFn) {
    try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
            const cache = await caches.open(CACHE_NAME);
            try { await cache.put(request, response.clone()); } catch { /* cache put 실패 무시 */ }
        }
        return response;
    } catch {
        try {
            const cached = await caches.match(request);
            if (cached) return cached;
        } catch { /* 캐시 조회 실패 무시 */ }
        return fallbackFn ? fallbackFn() : FALLBACK_RESPONSE();
    }
}

/** Cache first — 캐시 히트 시 즉시 반환, 미스 시 네트워크 */
async function cacheFirst(request) {
    try {
        const cached = await caches.match(request);
        if (cached) return cached;
    } catch { /* 캐시 조회 실패 무시 */ }

    try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
            const cache = await caches.open(CACHE_NAME);
            try { await cache.put(request, response.clone()); } catch { /* cache put 실패 무시 */ }
        }
        return response;
    } catch {
        return FALLBACK_RESPONSE();
    }
}

// ─── Fetch handler ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
    // GET 요청만 처리 (navigate 포함)
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Same-origin만 처리
    if (url.origin !== self.location.origin) return;

    // 개발 모드 HMR / hot-reload / 내부 Next.js 요청은 무시
    if (url.pathname.startsWith('/_next/webpack')) return;
    if (url.pathname.startsWith('/__nextjs')) return;

    // 1. API: Network First
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(event.request, FALLBACK_JSON));
        return;
    }

    // 2. Next.js 정적 에셋: Cache First
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // 3. 페이지 탐색: Network First + /offline 폴백
    if (event.request.mode === 'navigate') {
        event.respondWith(
            networkFirst(event.request, async () => {
                const offline = await caches.match('/offline');
                return offline || FALLBACK_HTML();
            })
        );
        return;
    }

    // 4. 나머지 (이미지, favicon, manifest 등): Cache First
    event.respondWith(cacheFirst(event.request));
});

// Push Notification 처리
self.addEventListener('push', (event) => {
    if (event.data) {
        let data;
        try {
            data = event.data.json();
        } catch {
            data = { title: '새로운 알림', body: event.data.text() };
        }

        const options = {
            body: data.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            data: { url: data.url || '/' },
            vibrate: [100, 50, 100],
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});
