/**
 * NexusChat Service Worker
 * Strategy: Cache-first for static assets, network-first for API calls.
 * Version bump triggers cache refresh on deploy.
 */
const CACHE_VERSION = "nexuschat-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

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

  // API calls: network-first, no cache
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (JS/CSS/images/fonts): cache-first
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2")
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

  // Navigation (HTML): network-first, fallback to cached "/"
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((r) => r || fetch("/"))
      )
    );
    return;
  }
});
