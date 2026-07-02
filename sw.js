/* SkewT Sounding — service worker (network-first shell)
   Strategy: try the live network first for the app shell, so a refresh always
   gets the newest deploy; fall back to cache only when offline. This ends the
   "I pushed to GitHub but still see the old version" problem while keeping the
   app fully usable with no connection.
   Bumping CACHE_VERSION is still good hygiene (it purges old caches on activate),
   but is no longer required for users to receive updates. */
const CACHE_VERSION = "skewt-v40-desktopfs";

self.addEventListener("install", e => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = e.request.url;

  // never intercept live data — always straight to network
  if (u.includes("open-meteo") || u.includes("workers.dev") || u.includes("uwyo.edu")) return;

  // NETWORK-FIRST for the app shell:
  // fetch the live file, update the cache, and only fall back to cache when offline.
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
        }
        return resp;
      })
      .catch(() =>
        caches.open(CACHE_VERSION).then(c =>
          c.match(e.request).then(r => r || Response.error())
        )
      )
  );
});
