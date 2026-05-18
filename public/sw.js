/// <reference lib="webworker" />
/** PWA shell only — do not intercept Next.js page/RSC requests (breaks client routing). */

const CACHE = "upuan-mesa-static-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

function isAppNavigation(request) {
  if (request.mode === "navigate") return true;
  if (request.headers.get("Rsc") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("text/x-component")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API + all HTML/RSC navigations — browser / Next.js only.
  if (url.pathname.startsWith("/api/") || isAppNavigation(request)) return;

  if (!url.pathname.startsWith("/_next/static")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
