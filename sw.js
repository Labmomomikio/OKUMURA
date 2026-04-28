// ====== Service Worker for 歯科技工指示書 PWA ======
// バージョンを上げるとキャッシュが更新されます
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `gikou-shijisho-${CACHE_VERSION}`;

// プリキャッシュするアセット
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// ===== install: 静的アセットをキャッシュ =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ===== activate: 古いキャッシュを削除 =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('gikou-shijisho-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ===== fetch: Cache First（オフライン優先）+ ネットワーク更新 =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 以外はそのまま通す
  if (req.method !== 'GET') return;

  // chrome-extension などのスキームは無視
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      // バックグラウンドでネットワーク取得 → キャッシュ更新
      const network = fetch(req).then((res) => {
        // 同一オリジンの正常レスポンスのみキャッシュ更新
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => cached); // ネットワーク失敗時はキャッシュにフォールバック

      // キャッシュがあればそれを即返し、なければネットワークを待つ
      return cached || network;
    })
  );
});

// ===== ページからの skipWaiting メッセージ受信 =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
