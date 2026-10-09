const EXPECTED_BUILD=30042;
importScripts('./asset-manifest.js?build='+EXPECTED_BUILD);
if(self.DOMUS3_BUILD!==EXPECTED_BUILD)throw new Error('Manifest de otro build; se conserva la versión anterior.');
const BASE=new URL('./',self.location.href),PREFIX='domus3:'+BASE.pathname+':',CACHE=PREFIX+EXPECTED_BUILD;
const ASSETS=self.DOMUS3_ASSETS.map(file=>new URL(file,BASE).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 if(!BASE.pathname.endsWith('/domus-3/'))throw new Error('DOMUS 3 requiere su directorio independiente /domus-3/');
 const verified=await Promise.all(self.DOMUS3_ASSETS.map(async file=>{
  const url=new URL(file,BASE);url.searchParams.set('build',String(EXPECTED_BUILD));
  const response=await fetch(new Request(url,{cache:'no-store'}));if(!response.ok)throw new Error('No se pudo actualizar '+file);
  const bytes=await response.clone().arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes);
  const actual=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  if(actual!==self.DOMUS3_ASSET_HASHES[file])throw new Error('Archivo de otro build: '+file);
  return [new URL(file,BASE).href,response];
 }));
 const cache=await caches.open(CACHE);await Promise.all(verified.map(([url,response])=>cache.put(url,response)));await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 const asset=new URL(url.pathname===BASE.pathname?'index.html':url.pathname,BASE).href;
 if(!ASSETS.includes(asset))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),stored=await cache.match(asset);return stored||fetch(request);})());
});
