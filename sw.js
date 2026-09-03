const CACHE_PREFIX="mybishbash-photobooth-";
const CACHE="mybishbash-photobooth-v12";
const ASSETS=["./","./index.html","./styles.css","./fonts.js","./covers.js","./polaroid.js","./mp4.js","./product.js","./event.js","./kits.js","./clients.js","./strip.js","./motion.js","./app.js","./marketing.js","./landing.js","./assets/demo-photos.jpg","./assets/clients/david-lloyd-logo-dark.png","./assets/clients/david-lloyd-logo-light.png","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
const CACHEABLE_ASSET_URLS=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).href));

/* v7 was the bridge away from the old cache-first workers. Those workers can
   load an old app.js and then activate this worker behind it; only the worker
   itself can refresh that already-open legacy page. v8 and later upgrades
   wait for a safe between-guests refresh in app.js. Keep this list finite. */
const LEGACY_CACHES=new Set([
  "rae-photo-booth-production-1",
  "rae-photo-booth-v2",
  "rae-photo-booth-v3",
  "rae-photo-booth-live-v1",
  "rae-photo-booth-live-v2",
  "rae-photo-booth-live-v3",
  "rae-photo-booth-live-v4",
  "rae-photo-booth-live-v5",
  "rae-photo-booth-live-v6",
  "rae-photo-booth-live-v7"
]);

self.addEventListener("install",event=>{
  const requests=ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:"reload"}));
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(requests)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    const isLegacyUpgrade=keys.some(key=>LEGACY_CACHES.has(key));
    await Promise.all(
      keys
        .filter(key=>(key.startsWith(CACHE_PREFIX)||key.startsWith("rae-photo-booth-"))&&key!==CACHE)
        .map(key=>caches.delete(key))
    );
    await self.clients.claim();

    /* Existing legacy pages do not contain the controllerchange handler below,
       so perform their one unavoidable migration reload from the worker. */
    if(isLegacyUpgrade){
      const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
      /* Start the reloads, but do not hold activation open on their promises:
         the navigations need this worker to finish becoming active. */
      clients.forEach(client=>{
        if(client.url.startsWith(self.registration.scope))client.navigate(client.url).catch(()=>{});
      });
    }
  })());
});

/* Network first, with both Cache Storage and the browser HTTP cache bypassed.
   The current response is written before this fetch event is allowed to end,
   so Safari cannot suspend the worker with an old offline copy still stored. */
self.addEventListener("fetch",event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||!/^https?:$/.test(url.protocol))return;

  event.respondWith((async()=>{
    const cacheKey=new URL(url.href);cacheKey.search="";cacheKey.hash="";
    /* Cache only the finite public application shell. The product API can
       return entitlement, Business event and attendee data and must never be
       copied into or read from the browser's shared Cache Storage. */
    const cacheable=CACHEABLE_ASSET_URLS.has(cacheKey.href)&&!request.headers.has("authorization");
    try{
      const response=await fetch(request,{cache:"no-store"});
      if(cacheable&&response.status===200&&response.type==="basic"){
        const copy=response.clone();
        await caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
      }
      return response;
    }catch(error){
      const cache=await caches.open(CACHE);
      if(cacheable){
        const exact=await cache.match(request);
        if(exact)return exact;
      }
      if(request.mode==="navigate"){
        const shell=await cache.match(new URL("./index.html",self.registration.scope).href);
        if(shell)return shell;
      }
      throw error;
    }
  })());
});
