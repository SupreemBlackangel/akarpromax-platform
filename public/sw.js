// Minimal pass-through service worker.
// No caching/interception so it never breaks dev/HMR; it exists only to make
// the site installable (PWA) and to enable the native install prompt.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first pass-through — behaves like no SW for normal requests.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => new Response("", { status: 504 })),
  );
});
