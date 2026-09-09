/* sw.js — ออฟไลน์เต็มรูปแบบ + โค้ดสดใหม่ทุกครั้งที่รีเฟรช */
const CACHE = 'lanka-v__BUILD_SHA__'; // แนะนำให้เปลี่ยนเป็นเวอร์ชันจริง เช่น 'lanka-v1.0.5' หากไม่ได้ใช้ Build Tool
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
  
  // ข้าม request ที่ไม่ใช่ http/https (เช่น chrome-extension, data:)
  if (!e.request.url.startsWith('http')) return;

  const url = new URL(e.request.url);

  /* Google Fonts — Cache-First (โหลดครั้งเดียวแล้วใช้ยาวๆ) */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(r => r ||
        fetch(e.request).then(res => {
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cl));
          return res;
        }).catch(() => new Response('Offline - Google Fonts', { status: 503 }))
      )
    );
    return;
  }

  /* ไฟล์ของเว็บเรา (Network-First + Bypass HTTP Cache) */
  if (url.origin === self.location.origin) {
    const forceFresh = e.request.mode === 'navigate'
      ? { cache: 'no-store' }    // หน้าเว็บ: ห้ามใช้ HTTP cache เด็ดขาด ดึงใหม่เสมอ
      : { cache: 'no-cache' };   // js/css: ถามเซิร์ฟเวอร์ทุกครั้ง (ได้ 304 เร็วๆ) แต่ได้ไฟล์ใหม่ทันทีที่เนื้อหาเปลี่ยน
      
    e.respondWith(
      fetch(e.request, forceFresh)
        .then(res => {
          // อัปเดต Cache API ให้เป็นเวอร์ชันล่าสุด
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cl));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then(r => {
            if (r) return r; // เจอใน Cache API
            // Fallback ไป index.html เฉพาะการโหลดหน้าเว็บ (SPA Navigation) เท่านั้น
            if (e.request.mode === 'navigate') {
              return caches.match('index.html');
            }
            // ถ้าเป็น JS/CSS/Images แล้วออฟไลน์且ไม่มีใน Cache ให้ส่ง 503
            return new Response('Offline Content', { status: 503, headers: { 'Content-Type': 'text/plain' } });
          })
        )
    );
  }
});
