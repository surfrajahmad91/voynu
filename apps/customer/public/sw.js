const CACHE_NAME = "voynu-customer-static-v5";
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
  const title = data.title || "VOYNU";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "You have a new VOYNU update.",
    // `icon` is intentionally omitted so Android does not render a large icon on the right.
    // `badge` is a dedicated monochrome mark for Android's compact left-side notification icon.
    badge: "/notification-badge.svg",
    tag: data.tag || "voynu-notification",
    renotify: true,
    data: { ...(data.data || {}), url: data.data?.url || "/account" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/account";
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
