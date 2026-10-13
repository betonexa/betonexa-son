const CACHE='betonexa-2026.10.13-cem-425-r-v6';
const ASSETS=[
  './',
  './index.html',
  './betonexa-theme.css?v=20261013-orange2',
  './manifest.webmanifest',
  './manifest.webmanifest?v=20261013-orange2',
  './apple-touch-icon-green-v2-180.png',
  './betonexa-icon-green-v2-192.png',
  './betonexa-icon-green-v2-512.png',
  './favicon-green-v2-32.png',
  './icon.svg?v=20261013-green2',
  './icon-192.png',
  './icon-512.png',
  './cimento-module.js',
  './cimento-module.js?v=20261013-cem-425-r1',
  './cimento-history.js',
  './cimento-history.js?v=20261013-cem-425-r1',
  './cimento-enhancements.js',
  './cimento-mobile-fix.css',
  './contracts-module.js',
  './normalization.js',
  './contract-calculations.js',
  './menu-layout.js',
  './tracking-finalizer.js',
  './tracking-finalizer.js?v=20261013-mobile-plan2',
  './backup-manager.js',
  './cement-pallet-exports.js?v=20261013-mobile-plan2',
  './cement-pallet-export-fix.js?v=20261013-mobile-plan2',
  './professional-pdf-reports.js',
  './professional-pdf-reports.js?v=20261013-mobile-plan2',
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
