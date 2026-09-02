const CACHE_NAME = "voynu-saarthi-static-v6";
const STATIC_URLS = ["/icon.svg", "/manifest.webmanifest", "/notification-badge.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || "VOYNU Saarthi", {
    body: data.body || "You have a new trip update.",
    // Android/Samsung uses the notification `icon` as the small app mark on the left.
    // Use the dedicated monochrome VOYNU V; do not use `badge` here because Samsung renders
    // the Web Notification badge separately on the right side of the notification.
    icon: "/notification-badge.svg",
    tag: data.tag || "voynu-saarthi-notification",
    renotify: true,
    data: { ...(data.data || {}), url: data.data?.url || "/driver" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/driver";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    if (existing) return existing.navigate(url).then(() => existing.focus());
    return clients.openWindow(url);
  }));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.destination === "document" || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {}); return response; }).catch(() => caches.match(event.request)));
});
