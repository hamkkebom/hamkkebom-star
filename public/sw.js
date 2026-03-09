const CACHE_NAME = 'hamkkebom-pwa-v1';
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

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API GET 요청: Network First
    if (url.pathname.startsWith('/api/')) {
        if (event.request.method === 'GET') {
            event.respondWith(
                fetch(event.request)
                    .then((response) => {
                        const resClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
                        return response;
                    })
                    .catch(() => caches.match(event.request))
            );
        }
        return; // POST/PUT/DELETE는 브라우저 기본 동작에 맡김
    }

    // 2. Next.js 정적 에셋: Cache First
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
                    return res;
                });
            })
        );
        return;
    }

    // 3. 페이지 탐색 (오프라인 폴백 처리)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((cachedResponse) => {
                        return cachedResponse || caches.match('/offline');
                    });
                })
        );
        return;
    }

    // 4. 나머지 에셋 (이미지 등): Stale-While-Revalidate
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (event.request.method === 'GET') {
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
                }
                return networkResponse;
            }).catch(() => cachedResponse);
            return cachedResponse || fetchPromise;
        })
    );
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
