const CACHE_NAME = "voynu-customer-static-v7";
const STATIC_URLS = ["/icon.svg", "/manifest.webmanifest", "/notification-badge.svg"];

function notificationCopy(data) {
  const type = data?.data?.type || String(data?.tag || "").replace(/^voynu-/, "").split("-")[0];
  const reference = typeof data?.data?.reference === "string" ? data.data.reference : "booking";

  switch (type) {
    case "booking_created":
      return (data.title === "Booking received" || data.title === "Booking Received")
        ? { title: "Booking Received", body: `Your booking ${reference} has been saved. UPI payment is awaiting verification.` }
        : { title: "Booking Confirmed", body: `Your booking ${reference} is confirmed. We will contact you before your journey.` };
    case "booking_confirmed":
      return { title: "Booking Confirmed", body: `Payment has been verified and booking ${reference} is confirmed.` };
    case "driver_assigned":
      return { title: "Driver Assigned", body: `A driver has been assigned to booking ${reference}.` };
    case "driver_on_the_way":
      return { title: "Driver Is On The Way", body: `Your driver is on the way for booking ${reference}.` };
    case "driver_arrived":
      return { title: "Driver Has Arrived", body: `Your driver has arrived for booking ${reference}.` };
    case "trip_started":
      return { title: "Trip Started", body: `Your journey for booking ${reference} has started.` };
    case "trip_completed":
      return { title: "Trip Completed", body: `Your journey for booking ${reference} has been completed. Thank you for riding with VOYNU.` };
    case "booking_cancelled":
      return { title: "Booking Cancelled", body: `Booking ${reference} has been cancelled.` };
    default:
      return { title: data.title || "VOYNU", body: data.body || "You have a new VOYNU update." };
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
