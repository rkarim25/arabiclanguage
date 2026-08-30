/* Offline support (PWA) + speed.
   - VERSIONED assets (?v=stamp), content-hashed /audio/ clips, and /fonts/ are
     immutable under their URL → CACHE-FIRST: instant repeat loads, network only
     the first time. A deploy changes the ?v= stamp, so freshness is safe.
   - HTML navigations → NETWORK-FIRST with a 2.5s budget (bypass HTTP cache) so
     a deploy always pairs fresh HTML with its fresh ?v= assets; cache answers
     the moment the network is slow or absent, so the commute is unaffected.
   - Un-stamped data/*.json → network-first, but with a 3.5s budget: on a slow
     connection the cached copy answers while the network write-back continues.
   - Audio lives in its own persistent cache so 26MB of clips survive deploys.
   The CACHE version is stamped by scripts/bump-version.js on every deploy. */
const CACHE = "ats-mtgbczrs";
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
  "data/story-04.json", "data/story-05.json", "data/story-06.json", "data/story-07.json",
  "data/sentences.json", "data/conversations.json", "data/mnemonics.json", "data/conjugations.json",
  "data/lexicon.json", "data/audio-manifest.json", "data/phrases.json", "data/quran-word-audio.json",
  "js/progress-model.js", "js/plan.js", "data/progress-series.json",
  "js/curriculum.js", "data/curriculum.json", "js/account.js", "js/longview.js",
  "data/sentence-bank.json",          // what every lesson is built from — must work on the commute
  "data/quran-sentences.json",        // the short surahs: Al-Fatiha + juz' 'Amma
  "data/frequency.json",              // probability of use — what the bursts are ranked by
  "data/ayah-audio.json",             // which ayat have a real recitation
  "data/classes.json",                // the class repository
  "class.html", "words.html",
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

  /* HTML NAVIGATIONS: NETWORK-FIRST, with a 2.5s budget.
     This used to be stale-while-revalidate — the cached page answered instantly
     and the fresh one landed for NEXT time, so every deploy was one visit late.
     That is a real cost, not a theoretical one: on 2026-08-30 he spent a session
     reporting bugs against a lesson UI and a test flow that had been replaced,
     because his first visit after each deploy served him the previous build.
     (The service worker also had a syntax error and had not updated at all, but
     one-visit-stale was going to keep biting after that was fixed.)

     HTML is a few KB. Ask the network first, and fall back to cache the moment
     it is slow or absent, so the commute still works and a good connection
     always shows what was actually deployed. Un-stamped data/*.json keeps the
     old behaviour — those now carry the build stamp (js/app.js DATA_V), so they
     cannot be paired with the wrong build any more. */
  const isNav = e.request.mode === "navigate";
  const req = isNav ? new Request(e.request.url, { cache: "no-cache" }) : e.request;
  e.respondWith((async () => {
    const cached = (await caches.match(e.request)) || (await caches.match(e.request, { ignoreSearch: true }));
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => null);

    if (isNav) {
      const timeout = new Promise(r => setTimeout(() => r(null), 2500));
      const fresh = await Promise.race([net, timeout]);
      if (fresh && fresh.ok) return fresh;
      if (cached) { try { e.waitUntil(net); } catch (err) {} return cached; }
      const slow = await net;
      if (slow) return slow;
      const shell = await caches.match("index.html");
      if (shell) return shell;
      return Response.error();
    }

    if (cached) { try { e.waitUntil(net); } catch (err) {} return cached; }
    const fresh = await net;
    if (fresh) return fresh;
    return Response.error();
  })());
});
