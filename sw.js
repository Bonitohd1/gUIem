const CACHE='gulem-v5';
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{ e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
); });
// Thông báo đẩy nền (nếu có máy chủ đẩy gửi tới): hiện notification + mở admin khi chạm
self.addEventListener('push', e=>{
  let d={title:'gUlEm — Đơn mới',body:'Có đơn mới'};
  try{ if(e.data){ var t=e.data.text(); try{ d=Object.assign(d,JSON.parse(t)); }catch(_){ d.body=t; } } }catch(_){}
  e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:'/logo.png?v=1',badge:'/logo.png?v=1',vibrate:[60,40,60],tag:'gulem-order',renotify:true,data:{url:'/?admin=1'}}));
});
self.addEventListener('notificationclick', e=>{
  e.notification.close();
  var url=(e.notification.data&&e.notification.data.url)||'/?admin=1';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(ws){ for(var i=0;i<ws.length;i++){ if('focus'in ws[i]){ ws[i].navigate&&ws[i].navigate(url); return ws[i].focus(); } } if(clients.openWindow)return clients.openWindow(url); }));
});
self.addEventListener('fetch', e=>{
  const u=e.request.url;
  // không bao giờ cache các endpoint động / HTML trang chính -> luôn lấy bản mới
  if(/ntfy\.sh|trycloudflare|cfg\.json|\/webhook\/|\/api\/ntfy/.test(u)) return;
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
