/* Offline support (PWA) + speed.
   - VERSIONED assets (?v=stamp), content-hashed /audio/ clips, and /fonts/ are
     immutable under their URL → CACHE-FIRST: instant repeat loads, network only
     the first time. A deploy changes the ?v= stamp, so freshness is safe.
   - HTML navigations → NETWORK-FIRST (bypass HTTP cache) so a deploy always
     pairs fresh HTML with its fresh ?v= assets; cache fallback offline.
   - Un-stamped data/*.json → network-first, but with a 3.5s budget: on a slow
     connection the cached copy answers while the network write-back continues.
   - Audio lives in its own persistent cache so 26MB of clips survive deploys.
   The CACHE version is stamped by scripts/bump-version.js on every deploy. */
const CACHE = "ats-mrtyokx7";
const AUDIO_CACHE = "ats-audio-v1";
const CORE = [
  "index.html", "vocab.html", "quran.html", "grammar.html", "speaking.html",
  "review.html", "story.html", "test.html", "keyboard.html", "sentences.html", "converse.html", "audio.html",
  "css/style.css", "css/fonts.css", "js/app.js", "js/tracker.js", "manifest.webmanifest",
  "fonts/font-1.woff2", "fonts/font-2.woff2", "fonts/font-3.woff2", "fonts/font-4.woff2", "fonts/font-5.woff2",
  "fonts/font-6.woff2", "fonts/font-7.woff2", "fonts/font-8.woff2", "fonts/font-9.woff2",
  "data/quran-core.json", "data/everyday.json", "data/families.json",
  "data/grammar.json", "data/prompts.json", "data/verses.json",
  "data/story-01.json", "data/story-02.json", "data/story-03.json",
  "data/story-04.json", "data/story-05.json", "data/story-06.json",
  "data/sentences.json", "data/conversations.json", "data/mnemonics.json",
  "data/lexicon.json", "data/audio-manifest.json", "data/phrases.json",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // recitation/API pass through

  // immutable under their URL → cache-first
  const isAudio = url.pathname.includes("/audio/");
  if (isAudio || url.searchParams.has("v") || url.pathname.includes("/fonts/")) {
    const cacheName = isAudio ? AUDIO_CACHE : CACHE;
    e.respondWith((async () => {
      const hit = await caches.match(e.request);
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        if (res.ok) { const copy = res.clone(); caches.open(cacheName).then(c => c.put(e.request, copy)); }
        return res;
      } catch (err) {
        // offline first-sight of a stamped asset: any older stamp beats nothing
        return (await caches.match(e.request, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  // navigations must be fresh (a stale page would load stale ?v= assets);
  // un-stamped data is network-first with a 3.5s budget before cache answers
  const isNav = e.request.mode === "navigate";
  const req = isNav ? new Request(e.request.url, { cache: "reload" }) : e.request;
  e.respondWith((async () => {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => null);
    const winner = isNav ? await net
      : await Promise.race([net, new Promise(r => setTimeout(() => r(null), 3500))]);
    if (winner) return winner;
    const exact = await caches.match(e.request);
    if (exact) return exact;
    const loose = await caches.match(e.request, { ignoreSearch: true });
    if (loose) return loose;
    if (isNav) {
      const shell = await caches.match("index.html");
      if (shell) return shell;
    }
    return (await net) || Response.error();
  })());
});
