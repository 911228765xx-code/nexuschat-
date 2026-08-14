/**
 * BitChat Service Worker v8 - Push Notifications Support
 *
 * 策略：不缓存任何资源（依赖 HTTP 缓存头），仅处理 Web Push 通知。
 * 这样既解决了旧版本 SW 缓存导致的黑屏问题，又支持推送通知。
 */

// 安装：立即跳过等待，强制激活
self.addEventListener("install", () => {
  self.skipWaiting();
});

// 激活：清空所有缓存，接管所有客户端，然后注销自身
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => {
        // 通知所有已打开的页面刷新以加载最新版本
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
        });
      })
  );
});

// Fetch：直接透传，不缓存任何资源
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// ---- Web Push: receive push notification ----
self.addEventListener("push", (event) => {
  let data = { title: "BitChat", body: "你有一条新消息", url: "/app/chat", icon: "/icons/icon-192x192.png", badge: "/icons/icon-72x72.png" };

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
    tag: "bitchat-notification",
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
            if ("navigate" in client) client.navigate(targetUrl);
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
