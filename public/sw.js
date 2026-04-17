// Service worker — network-first for pages, cache-first for static assets only
const CACHE_NAME = "finance-dashboard-v4";
// Only cache truly static assets (icons, manifest) — never HTML pages
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always pass through: API calls, auth, cross-origin
  if (url.pathname.startsWith("/api/") || url.origin !== self.location.origin) return;

  // Static assets (icons, manifest): cache-first
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request))
    );
    return;
  }

  // Everything else (HTML pages, JS bundles): network-first, no caching
  // This ensures deploys are always picked up immediately
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ─── Push Notifications ────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let data = { title: "Finance Reminder", body: "Time to check your payments!", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/icon-192x192.svg",
      tag: "finance-reminder",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(url) && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
