const CACHE='gulem-v1';
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(clients.claim()); });
self.addEventListener('fetch', e=>{
  const u=e.request.url;
  // never cache dynamic endpoints
  if(/ntfy\.sh|trycloudflare|cfg\.json|\/webhook\//.test(u)) return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(e.request.method==='GET' && r.ok && u.startsWith(self.location.origin)){
        const c=r.clone(); caches.open(CACHE).then(ca=>ca.put(e.request,c));
      }
      return r;
    }).catch(()=>caches.match(e.request))
  );
});
