
const CACHE = 'lanka-v${{ github.sha }}';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/game.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', e => {
  self.skipWaiting(); // ⚡ activate ทันที ไม่ต้องรอ
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE) 
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); 
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl));
        return res;
      }).catch(() => caches.match(e.request)))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // โหลดสำเร็จ → อัพเดท cache ให้ใหม่
          const cl = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, cl));
          return res;
        })
        .catch(() => {

          return caches.match(e.request).then(r => r || caches.match('index.html'));
        })
    );
  }
});
