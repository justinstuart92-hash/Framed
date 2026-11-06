/* Home board service worker: keeps the board opening when the tablet is offline. */
const CACHE = "home-board-v4";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./cassette-plate.webp", "./cassette-reel.webp", "./deck-bg.webp", "./deck-bay.webp", "./vu-face-low.webp", "./vu-face-high.webp", "./deck-keys.webp"];

self.addEventListener("install", e => {
  // add each file on its own so one missing file never blocks the install
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  // Only remove old copies of this app's own cache. The saved photos live in a separate cache and must stay.
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("home-board-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // never touch Google, Spotify or Apps Script requests
  if (url.search.includes("code=")) return;            // sign-in redirects pass straight through
  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
