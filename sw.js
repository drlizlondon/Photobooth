const CACHE="rae-photo-booth-live-v6";
const ASSETS=["./","./index.html","./styles.css","./fonts.js","./covers.js","./polaroid.js","./mp4.js","./app.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

/* Network first, cache as the offline fallback. Cache-first meant a booth
   iPad kept serving an old build forever; this way it picks up a new one
   whenever it has signal, and still works with none. */
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET"||new URL(req.url).origin!==location.origin)return;
  e.respondWith(
    fetch(req)
      .then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        return res;
      })
      .catch(()=>caches.match(req).then(hit=>hit||caches.match("./index.html")))
  );
});
