/**
 * NexusChat Service Worker v6
 * Strategy:
 *   - Static assets (JS/CSS/fonts): Cache-first (long-lived, hashed filenames)
 *   - Navigation (HTML): Network-first with cache fallback (always fresh HTML)
 *   - API calls: Network-only (always fresh)
 * v6: Force cache invalidation to fix production black screen issue.
 */
const CACHE_VERSION = "nexuschat-v6";
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
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put("/", clone));
          }
          return response;
        })
        .catch(() =>
          caches.match("/").then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }
});

// ---- Web Push: receive push notification ----
self.addEventListener("push", (event) => {
  let data = { title: "NexusChat", body: "你有一条新消息", url: "/app/chat", icon: "/icons/icon-192x192.png", badge: "/icons/icon-72x72.png" };

  if (event.data) {
    try {
      data = { ...data, ...JSON.parse(event.data.text()) };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url },
    vibrate: [200, 100, 200],
    tag: "nexuschat-message",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---- Web Push: handle notification click ----
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/app/chat";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If app is already open, focus it and navigate
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
