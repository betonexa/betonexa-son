const CACHE='betonexa-2026.08.25-shipment-status-v1';
const ASSETS=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './cimento-module.js',
  './cimento-history.js',
  './cimento-enhancements.js',
  './cimento-mobile-fix.css',
  './contracts-module.js',
  './normalization.js',
  './contract-calculations.js',
  './menu-layout.js',
  './tracking-finalizer.js',
  './backup-manager.js',
  './professional-pdf-reports.js',
  './shipment-status.js',
  './records-cement-addon.js',
  './live-sync.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const requestUrl=new URL(event.request.url);
  const isNavigation=event.request.mode==='navigate';

  event.respondWith(
    fetch(event.request).then(response=>{
      if(response.ok&&requestUrl.origin===self.location.origin){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(isNavigation)return caches.match('./index.html');
      return Response.error();
    })
  );
});
