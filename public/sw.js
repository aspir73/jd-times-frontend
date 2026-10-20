/**
 * JD Times 서비스 워커 — 최소 구성.
 * 뉴스는 실시간 데이터라 API 응답이나 페이지는 캐시하지 않는다(항상 네트워크).
 * 오프라인일 때 페이지 이동 요청에만 미리 저장해둔 안내 화면(offline.html)을 보여준다.
 */
const CACHE = 'jd-times-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
