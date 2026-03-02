/**
 * NexusChat Service Worker v4
 * Strategy:
 *   - Static assets (JS/CSS/fonts): Cache-first (long-lived, hashed filenames)
 *   - Navigation (HTML): Network-first with cache fallback (always fresh HTML)
 *   - API calls: Network-only (always fresh)
 * v4: Changed navigation to network-first to fix PWA black screen on launch.
 *     Version bump clears all v3 caches.
 */
const CACHE_VERSION = "nexuschat-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Only precache the HTML shell — icons are on CDN, no local files to precache
const PRECACHE_URLS = ["/"];

// ---- Install: pre-cache app shell ----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: clean up old caches ----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: routing strategy ----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API calls: network-only, no cache
  if (url.pathname.startsWith("/api/")) return;

  // Static assets with content-hashed filenames: cache-first (permanent cache)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // favicon and manifest: cache-first
  if (
    url.pathname === "/favicon.ico" ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/robots.txt"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation (HTML pages): network-first with cache fallback
  // Always try to get fresh HTML first so blocking theme script is always current.
  // Falls back to cache only when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            // Update cache with fresh HTML
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put("/", clone));
          }
          return response;
        })
        .catch(() =>
          // Offline fallback: serve cached shell
          caches.match("/").then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }
});
