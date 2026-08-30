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
const CACHE = "ats-mtg0msja";
const AUDIO_CACHE = "ats-audio-v1";
const CORE = [
  "index.html", "stories.html", "vocab.html", "quran.html", "grammar.html", "speaking.html",
  "review.html", "story.html", "test.html", "keyboard.html", "sentences.html", "converse.html", "audio.html", "placement.html",
  "week.html", "more.html", "learn.html", "map.html",
  "css/style.css", "css/fonts.css", "js/app.js", "js/tracker.js", "manifest.webmanifest",
  "fonts/font-1.woff2", "fonts/font-2.woff2", "fonts/font-3.woff2", "fonts/font-4.woff2", "fonts/font-5.woff2",
  "fonts/font-6.woff2", "fonts/font-7.woff2", "fonts/font-8.woff2", "fonts/font-9.woff2",
  "data/quran-core.json", "data/everyday.json", "data/families.json",
  "data/grammar.json", "data/prompts.json", "data/verses.json",
  "data/story-01.json", "data/story-02.json", "data/story-03.json",
  "data/story-04.json", "data/story-05.json", "data/story-06.json" "data/story-07.json",
  "data/sentences.json", "data/conversations.json", "data/mnemonics.json", "data/conjugations.json",
  "data/lexicon.json", "data/audio-manifest.json", "data/phrases.json", "data/quran-word-audio.json",
  "js/progress-model.js", "js/plan.js", "data/progress-series.json",
  "js/curriculum.js", "data/curriculum.json", "js/account.js", "js/longview.js",
  "data/sentence-bank.json",          // what every lesson is built from — must work on the commute
  "data/quran-sentences.json",        // the short surahs: Al-Fatiha + juz' 'Amma
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

  // navigations + un-stamped data: STALE-WHILE-REVALIDATE (2026-08-09, "the
  // website is slow to load"). The cached copy answers INSTANTLY and the
  // network refresh lands in cache for the next visit — at most one visit
  // stale. A one-visit-old page still works: its ?v= assets are served by the
  // ignoreSearch fallback and GitHub keeps serving old files, and every deploy
  // reinstalls fresh CORE pages anyway (new cache name → clean slate).
  const isNav = e.request.mode === "navigate";
  const req = isNav ? new Request(e.request.url, { cache: "no-cache" }) : e.request;
  e.respondWith((async () => {
    const cached = (await caches.match(e.request)) || (await caches.match(e.request, { ignoreSearch: true }));
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => null);
    if (cached) { try { e.waitUntil(net); } catch (err) {} return cached; }
    const fresh = await net;
    if (fresh) return fresh;
    if (isNav) {
      const shell = await caches.match("index.html");
      if (shell) return shell;
    }
    return Response.error();
  })());
});
