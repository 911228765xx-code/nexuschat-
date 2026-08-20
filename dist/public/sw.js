/**
 * Bitchat Service Worker v9 - Push Notifications Support
 *
 * 策略：不缓存任何资源（依赖 HTTP 缓存头），仅处理 Web Push 通知。
 * 这样既解决了旧版本 SW 缓存导致的黑屏问题，又支持推送通知。
 */

// 安装：立即跳过等待，强制激活
self.addEventListener("install", () => {
  self.skipWaiting();
});

// 激活：清空旧应用缓存并接管所有客户端。
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// 不注册 fetch 处理器：让导航和带哈希的 JS chunk 直接由浏览器请求，
// 避免旧页面壳或短暂网络错误导致首屏空白。

// ---- Web Push: receive push notification ----
self.addEventListener("push", (event) => {
  let data = { title: "Bitchat", body: "你有一条新消息", url: "/app/chat", icon: "/icons/icon-192x192.png", badge: "/icons/icon-72x72.png" };

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
    tag: "nexuschat-notification",
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
