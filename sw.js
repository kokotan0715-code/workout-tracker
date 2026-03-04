// Service Worker - Iron Log
// オフラインキャッシュ（Chart.js CDN含む）

const CACHE_NAME = 'iron-log-v1';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/ui.js',
    './js/dashboard.js',
    './js/workout.js',
    './js/history.js',
    './js/stats.js',
    './js/settings.js',
    './manifest.json',
    // Chart.js CDN - オフラインでもグラフが動作するようキャッシュ
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
    // Google Fonts
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
];

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// アクティベーション（古いキャッシュ削除）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// フェッチ（キャッシュファースト）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // 成功したリクエストをキャッシュ（GETのみ）
                if (response && response.status === 200 && event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // オフラインでキャッシュにもない場合
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// 通知クリック時のイベント
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // 通知をクリックしたらアプリ（ワークアウト画面など）を開く/フォーカスする
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // 既に開いているタブがあればフォーカス
            for (let client of windowClients) {
                if (client.url.includes('/workout-tracker/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // なければ新しく開く
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});
