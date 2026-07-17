/* Offline support (PWA). Strategy: NETWORK-FIRST for everything, cache as
   fallback — so the site can never serve stale code when online (the ?v=
   cache-busting discipline stays the source of truth), but keeps working
   offline (phone in the Haram, on a plane) from the last good copy.
   The CACHE version is stamped by scripts/bump-version.js on every deploy. */
const CACHE = "ats-mrosy79e";
const CORE = [
  "index.html", "vocab.html", "quran.html", "grammar.html", "speaking.html",
  "review.html", "story.html", "test.html", "keyboard.html", "sentences.html", "converse.html", "audio.html",
  "css/style.css", "js/app.js", "js/tracker.js", "manifest.webmanifest",
  "data/quran-core.json", "data/everyday.json", "data/families.json",
  "data/grammar.json", "data/prompts.json", "data/verses.json",
  "data/story-01.json", "data/story-02.json", "data/story-03.json",
  "data/story-04.json", "data/story-05.json", "data/story-06.json",
  "data/sentences.json", "data/conversations.json", "data/mnemonics.json",
  "data/lexicon.json", "data/audio-manifest.json",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // audio/fonts/API pass through
  // HTML navigations are NOT ?v=-versioned, so the browser's own HTTP cache can serve a
  // STALE page — which then loads stale ?v= assets. Force navigations fresh from the
  // network (bypass HTTP cache); versioned js/css/json still cache normally.
  const req = e.request.mode === "navigate" ? new Request(e.request.url, { cache: "reload" }) : e.request;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(async () => {
        // offline: exact match first, then ignore the ?v= stamp, then the shell
        const exact = await caches.match(e.request);
        if (exact) return exact;
        const loose = await caches.match(e.request, { ignoreSearch: true });
        if (loose) return loose;
        if (e.request.mode === "navigate") return caches.match("index.html");
        return Response.error();
      })
  );
});
