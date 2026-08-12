/**
 * Minimal offline shell cache for Ascent Revenue Dashboard PWA.
 * Caches the app shell (HTML/CSS/JS) on install; network-first for navigations
 * with cache fallback so a previously visited session can reopen offline.
 * Does not intercept API/data routes aggressively — live feeds stay network-first.
 */
const CACHE = "ascent-dashboard-shell-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // API routes: network only (no stale business data)
  if (url.pathname.startsWith("/api/")) return;

  // Navigations + static assets: network-first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        if (response.ok && (request.mode === "navigate" || url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|webmanifest|woff2?)$/i))) {
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/")),
      ),
  );
});
