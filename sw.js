/* sw.js — แคชทุกอย่างไว้ เล่นออฟไลน์เต็มรูปแบบ */
const CACHE='lanka-v1.1';
const ASSETS=['./','index.html','css/style.css','js/game.js','manifest.json','icon.svg'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(e.request.url.startsWith(self.location.origin)){
        const cl=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));
      }
      return res;
    }).catch(()=>caches.match('index.html')))
  );
});
