/* sw.js — ออฟไลน์เต็มรูปแบบ + โค้ดสดใหม่ทุกครั้งที่รีเฟรช */
const CACHE = 'lanka-v__BUILD_SHA__';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/game.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  /* Google Fonts — cache-first (ของเดิม) */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(r => r ||
        fetch(e.request).then(res => {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cl));
          return res;
        }).catch(() => caches.match(e.request))
      )
    );
    return;
  }

  /* ไฟล์ของเว็บเรา */
  if (url.origin === self.location.origin) {

    /* ★ จุดแก้: หน้าหลัก (navigate) ต้องดึงจากเซิร์ฟเวอร์สถานเดียว
       ห้ามให้ HTTP cache ของเบราว์เซอร์ตอบ (ต้นเหตุของอาการรีเฟรชแล้วไม่อัพเดท) */
    const forceFresh = e.request.mode === 'navigate' ? { cache: 'no-store' } : {};

    e.respondWith(
      fetch(e.request, forceFresh)
        .then(res => {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cl));
          return res;
        })
        .catch(() =>
          /* ออฟไลน์: ใช้ cache แทน — ignoreSearch เพื่อให้ match ได้
             แม้ URL คนละ ?v= (กันเกมพังตอนออฟไลน์หลังอัพเดท) */
          caches.match(e.request, { ignoreSearch: true })
            .then(r => r || caches.match('index.html'))
        )
    );
  }
});
