const CACHE_NAME = "voynu-admin-static-v7";
const STATIC_URLS = ["/icon.svg", "/manifest.webmanifest", "/notification-badge.svg"];

function notificationCopy(data) {
  const type = data?.data?.type || String(data?.tag || "").replace(/^voynu-/, "").split("-")[0];
  const reference = typeof data?.data?.reference === "string" ? data.data.reference : "booking";

  switch (type) {
    case "admin_booking_created":
      return { title: "New Booking Received", body: `Booking ${reference} has been created and is ready for review.` };
    default:
      return { title: data.title || "VOYNU Admin", body: data.body || "You have a new VOYNU update." };
  }
}

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
  const copy = notificationCopy(data);
  event.waitUntil(self.registration.showNotification(copy.title, {
    body: copy.body,
    // Android/Samsung uses `icon` as the small notification mark on the left.
    // This is a dedicated monochrome VOYNU V. Do not set `badge`: Samsung renders it separately on the right.
    icon: "/notification-badge.svg",
    tag: data.tag || "voynu-admin-notification",
    renotify: true,
    data: { ...(data.data || {}), url: data.data?.url || "/admin" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
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
