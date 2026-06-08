const CACHE_VERSION = "v2.9";
const PRECACHE_CACHE = `ai-rpg-precache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ai-rpg-runtime-${CACHE_VERSION}`;
const ACTIVE_CACHES = new Set([PRECACHE_CACHE, RUNTIME_CACHE]);

const PRECACHE_URLS = [
  "/index.html",
  "/login.html",
  "/chat.html",
  "/home.js",
  "/login.js",
  "/chat.js",
  "/pwa.js",
  "/manifest.json",
  "/characters/fitzgerald.json",
  "/characters/wilde.json",
  "/characters/burgess.json",
  "/characters/john.json",
  "/quests/maze.json",
  "/quests/ninjaOffice.json",
  "/quests/timelostCastle.json",
  "/quests/freePlay.json",
  "/imgs/favicon.png",
  "/imgs/icons/icon-192.png",
  "/imgs/icons/icon-maskable-512.png",
  "/imgs/screenshots/Screenshot1.png",
  "/imgs/screenshots/Screenshot2.png",
];

const PRECACHE_REQUESTS = [
  new Request("/style.css", {
    headers: {
      Accept: "text/css",
    },
  }),
];

const NAVIGATION_FALLBACKS = new Map([
  ["/", "/index.html"],
  ["/login", "/login.html"],
  ["/login.html", "/login.html"],
  ["/chat", "/chat.html"],
  ["/chat.html", "/chat.html"],
]);

const SAFE_RUNTIME_API_PATHS = new Set([
  "/api/background-images",
  "/api/profile-images",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_CACHE)
      .then((cache) =>
        Promise.all([
          cache.addAll(PRECACHE_URLS),
          cache.addAll(PRECACHE_REQUESTS),
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !ACTIVE_CACHES.has(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (isRuntimeCacheable(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isRuntimeCacheable(url) {
  if (url.pathname.startsWith("/api/")) {
    return SAFE_RUNTIME_API_PATHS.has(url.pathname);
  }

  if (url.pathname.startsWith("/socket.io/")) {
    return url.pathname === "/socket.io/socket.io.js";
  }

  return /\.(?:css|js|json|png|jpe?g|webp|ico)$/i.test(url.pathname);
}

async function networkFirstNavigation(request, url) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const fallbackUrl = NAVIGATION_FALLBACKS.get(url.pathname) || "/index.html";
    return (
      (await caches.match(request)) ||
      (await caches.match(fallbackUrl)) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}
