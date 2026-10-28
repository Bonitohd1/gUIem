const CACHE='gulem-v3';
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
); });
self.addEventListener('fetch', e=>{
  const u=e.request.url;
  // không bao giờ cache các endpoint động / HTML trang chính -> luôn lấy bản mới
  if(/ntfy\.sh|trycloudflare|cfg\.json|\/webhook\//.test(u)) return;
  const isDoc = e.request.mode==='navigate' || (e.request.destination==='document');
  if(isDoc){
    // network-first tuyệt đối cho index.html, không dùng bản cache nếu mạng còn sống
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(
    fetch(e.request).then(r=>{
      if(e.request.method==='GET' && r.ok && u.startsWith(self.location.origin)){
        const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c));
      }
      return r;
    }).catch(()=>caches.match(e.request))
  );
});
