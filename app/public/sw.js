/**
 * Day84 — Service Worker (WEB / PWA BUILD ONLY)
 * ------------------------------------------------------------------
 * IMPORTANT: this file is registered by App.svelte ONLY when running
 * outside a Capacitor native shell (see the isNativeBuild check in
 * onMount). Do not register this inside the iOS/Android app — those
 * builds already bundle all assets locally, and an active SW there
 * risks serving a stale cached bundle and blocking future app
 * updates pushed through the App Store / Play Store.
 *
 * Caching strategy: app-shell precache + cache-first for static
 * assets, network-first fallback for anything not precached. This
 * app has no API calls that need offline queuing except the
 * partner-sync feature, which already fails gracefully (see
 * lib/api.js) when there's no connection.
 */

const CACHE_NAME = "day84-shell-v1";

// Vite fingerprints build output (e.g. /assets/index-AbCd123.js), so
// the exact filenames aren't known ahead of time. We precache the
// app shell entry points; everything else is cached lazily on first
// fetch by the fetch handler below. Bump CACHE_NAME on every deploy
// to invalidate old entries.
const PRECACHE_URLS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
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
  if (event.request.method !== "GET") return;

  // Never cache calls to the backend API — sync/invite data must
  // always be fresh, and caching it would be a privacy footgun
  // (stale partner data displayed as current).
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/invite") || url.pathname.startsWith("/sync") || url.pathname.startsWith("/link") || url.pathname.startsWith("/account")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/")); // offline fallback to app shell
    })
  );
});
