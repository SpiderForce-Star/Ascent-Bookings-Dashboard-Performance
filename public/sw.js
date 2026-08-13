/**
 * Ascent Buildings · Revenue Dashboard — strengthened PWA service worker
 *
 * Strategy:
 *  - SHELL cache: app shell + icons + manifest (precached on install)
 *  - RUNTIME cache: JS/CSS/fonts/images discovered while browsing
 *  - Navigations: network-first → cached shell fallback (works offline after first visit)
 *  - Static assets: cache-first → network (fast repeat loads)
 *  - /api/*: never cached (live FRED/BLS/Dodge data stays fresh)
 *
 * Bump CACHE_VERSION when you change precache list or strategy so clients refresh.
 */
const CACHE_VERSION = "v9";
const SHELL_CACHE = `ascent-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ascent-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/favicon-16.png",
  "/icons/favicon-32.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/ascent-money-icon.png",
  "/logo.jpg",
];

const STATIC_EXT =
  /\.(?:js|mjs|css|png|jpg|jpeg|gif|svg|webp|ico|webmanifest|woff2?|ttf|otf|eot)(?:\?.*)?$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll fails entirely if one URL 404s — use individual puts for resilience
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            // skip missing optional assets
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  // Live data APIs — never cache
  if (url.pathname.startsWith("/api/")) return;

  // HTML navigations: network-first, offline shell fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Static assets: cache-first
  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  // Everything else same-origin: network-first with cache fallback
  event.respondWith(networkFirstGeneric(request));
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
      // Also keep a stable "/" entry for offline reopen
      cache.put("/", response.clone());
    }
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match("/")) ||
      (await caches.match("/index.html"));
    if (cached) return cached;
    return offlineFallbackPage();
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Last resort: any matching shell entry
    return (await caches.match(request)) || offlineFallbackPage();
  }
}

async function networkFirstGeneric(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || offlineFallbackPage();
  }
}

function offlineFallbackPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#c8102e" />
  <title>Offline · Ascent Dashboard</title>
  <style>
    body {
      margin: 0; min-height: 100dvh; display: grid; place-items: center;
      font-family: "DM Sans", system-ui, sans-serif;
      background: #f4f2ef; color: #141210; text-align: center; padding: 24px;
    }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    p { color: #5c574f; margin: 0 0 20px; max-width: 28rem; }
    button {
      background: #c8102e; color: #fff; border: 0; border-radius: 999px;
      padding: 10px 20px; font-weight: 600; cursor: pointer;
    }
  </style>
</head>
<body>
  <div>
    <h1>You&rsquo;re offline</h1>
    <p>Ascent Dashboard needs a connection for live feeds. Reconnect and tap retry &mdash; your last shell will load as soon as you&rsquo;re back online.</p>
    <button type="button" onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 503,
    statusText: "Offline",
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
