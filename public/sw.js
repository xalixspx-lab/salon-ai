// خدمة عمل (Service Worker) بسيطة عمدًا: تجعل الموقع "قابلًا للتثبيت" كتطبيق، وتعرض
// صفحة اتصال بديلة عند انقطاع الإنترنت. لا تخزّن أي صفحات ديناميكية (حجوزات، حساب،
// لوحة مالك) حتى لا يظهر للمستخدم محتوى قديم أو تُخزَّن بيانات شخصية على الجهاز.
const CACHE = 'salon-ai-shell-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()));
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
