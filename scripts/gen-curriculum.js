/* Builds data/curriculum.json — the MILESTONE LADDER.

   Contract: CURRICULUM.md. The site is milestone-based: a milestone is a
   capability written as a can-do sentence ("you can order food and ask what it
   costs"), made of LESSONS (one thing to master each), made of CHUNKS (~5 min).
   Weeks are only a pacing annotation; the milestone is the unit that matters.

   The spec below is hand-authored (the can-do sentences and the ordering are
   editorial judgments). The KEYS are resolved from the real content files, so
   renaming or extending a phrase set can never leave a milestone pointing at
   keys that don't exist.

   Run: node scripts/gen-curriculum.js      (then commit data/curriculum.json)
*/
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const phrases = D("phrases.json"), everyday = D("everyday.json"), verses = D("verses.json"), core = D("quran-core.json");

/* ---------- key resolvers ---------- */
const phKeys = (gid, from, to) => {
  const g = phrases.groups.find(x => x.id === gid);
  if (!g) throw new Error("no phrase group " + gid);
  return g.members.map((m, i) => `ph-${gid}:${i}`).slice(from || 0, to === undefined ? undefined : to);
};
const evKeys = (gid, from, to) => {
  const g = everyday.groups.find(x => x.id === gid);
  if (!g) throw new Error("no everyday group " + gid);
  return g.members.map((m, i) => `ev-${gid}:${i}`).slice(from || 0, to === undefined ? undefined : to);
};
const surahKeys = (sid, vFrom, vTo) => {
  const s = verses.surahs.find(x => x.id === sid);
  if (!s) throw new Error("no surah " + sid);
  return s.verses.flatMap((v, vi) => (vi >= (vFrom || 0) && (vTo === undefined || vi < vTo))
    ? v.words.map((w, wi) => `qw:${sid}:${vi}:${wi}`) : []);
};
const qcKeys = (from, to) => core.words.map((w, i) => `qc:${i}`).slice(from, to);
const storyKeys = (sid, from, to) => D(sid + ".json").vocab.map((w, i) => `${sid}:${i}`).slice(from || 0, to === undefined ? undefined : to);

const resolve = src => {
  if (src.ph) return phKeys(src.ph, src.from, src.to);
  if (src.ev) return evKeys(src.ev, src.from, src.to);
  if (src.surah) return surahKeys(src.surah, src.vFrom, src.vTo);
  if (src.qc) return qcKeys(src.qc[0], src.qc[1]);
  if (src.story) return storyKeys(src.story, src.from, src.to);
  throw new Error("unknown source " + JSON.stringify(src));
};

/* ---------- the ladder ----------
   Ordered so the two tracks advance in step: his ranked-first goal (Qur'an by
   ear) leads, conversation follows, and the repair kit comes early because
   without it one unknown word ends the conversation. */
const SPEC = [
  { id: "ms-fatiha", track: "quran", level: "quran-a1",
    name: "Al-Fatiha by ear",
    can: "catch every word of Al-Fatiha while it is being recited",
    why: "You recite it seventeen times a day. Mapping meaning onto sound you already know is the fastest listening you will ever buy.",
    lessons: [
      { title: "Al-Fatiha, verses 1–2", src: { surah: "fatiha", vFrom: 0, vTo: 2 } },
      { title: "Al-Fatiha, verses 3–5", src: { surah: "fatiha", vFrom: 2, vTo: 5 } },
      { title: "Al-Fatiha, verses 6–7", src: { surah: "fatiha", vFrom: 5, vTo: 7 } },
    ] },

  { id: "ms-hello", track: "conv", level: "conv-a1",
    name: "Greeting and introducing yourself",
    can: "greet someone, introduce yourself and say where you are from",
    why: "The opening thirty seconds of every conversation you will ever have in Arabic.",
    lessons: [
      { title: "Hello and goodbye", src: { ph: "greet", from: 0, to: 6 } },
      { title: "Please, thank you, sorry", src: { ph: "greet", from: 6 } },
      { title: "Who I am", src: { ph: "intro" } },
    ] },

  { id: "ms-repair", track: "conv", level: "conv-a1",
    name: "Keeping a conversation alive",
    can: "keep a conversation going when you have not understood a word",
    why: "This is the difference between a conversation that survives an unknown word and one that dies on it. It comes early on purpose.",
    lessons: [
      { title: "Say it again, slowly", src: { ph: "help", from: 0, to: 5 } },
      { title: "I don't understand — help me", src: { ph: "help", from: 5 } },
      { title: "Yes, no, and reacting", src: { ph: "talk", from: 0, to: 6 } },
      { title: "Keeping your turn", src: { ph: "talk", from: 6 } },
    ] },

  { id: "ms-short-surahs", track: "quran", level: "quran-a2",
    name: "The short surahs you pray",
    can: "catch Al-Ikhlas, Al-Falaq and An-Nas by ear",
    why: "Three surahs you already know by heart. Once the meaning is attached, you understand them every time you pray them.",
    lessons: [
      { title: "Al-Ikhlas", src: { surah: "ikhlas" } },
      { title: "Al-Falaq", src: { surah: "falaq" } },
      { title: "An-Nas", src: { surah: "nas" } },
    ] },

  { id: "ms-food", track: "conv", level: "conv-a1",
    name: "Ordering food and drink",
    can: "order a meal, ask for what you want and say you have had enough",
    why: "Three or four times a day on any trip, and the words repeat endlessly.",
    lessons: [
      { title: "Ordering", src: { ph: "food" } },
      { title: "Food and drink words", src: { ev: "food" } },
    ] },

  { id: "ms-core-50", track: "quran", level: "quran-a2",
    name: "The Qur'an's 50 commonest words",
    can: "recognise the fifty words that make up the largest share of the Qur'an",
    why: "These fifty words are roughly a third of every page. Nothing else you learn pays back this fast.",
    lessons: [
      { title: "The first ten", src: { qc: [0, 10] } },
      { title: "Words 11–20", src: { qc: [10, 20] } },
      { title: "Words 21–30", src: { qc: [20, 30] } },
      { title: "Words 31–40", src: { qc: [30, 40] } },
      { title: "Words 41–50", src: { qc: [40, 50] } },
    ] },

  { id: "ms-ask", track: "conv", level: "conv-a1",
    name: "Asking and needing",
    can: "ask a simple question and say what you want or need",
    why: "Questions are how you get anything done in a language you only half speak.",
    lessons: [
      { title: "Question frames", src: { ph: "ask", from: 0, to: 6 } },
      { title: "More questions", src: { ph: "ask", from: 6 } },
      { title: "I want, I need", src: { ph: "need" } },
      { title: "Question words", src: { ev: "questions" } },
    ] },

  { id: "ms-asr-kawthar", track: "quran", level: "quran-a2",
    name: "Al-Asr and Al-Kawthar",
    can: "catch Al-Asr and Al-Kawthar by ear",
    why: "Two more of your memorised surahs — short, and Al-Asr is a complete argument in three verses.",
    lessons: [
      { title: "Al-Asr", src: { surah: "asr" } },
      { title: "Al-Kawthar", src: { surah: "kawthar" } },
    ] },

  { id: "ms-shop", track: "conv", level: "conv-a2",
    name: "Buying and bargaining",
    can: "buy something, ask what it costs and understand the answer",
    why: "Numbers are the half of shopping people forget to learn, so they are in here too.",
    lessons: [
      { title: "Buying things", src: { ph: "shop" } },
      { title: "Numbers 1–10", src: { ev: "numbers" } },
      { title: "In the market", src: { ev: "shopping" } },
    ] },

  { id: "ms-family", track: "conv", level: "conv-a1",
    name: "Your family and your home",
    can: "talk about your family and describe where you live",
    why: "The first thing anyone asks you, and the material your teacher started with.",
    lessons: [
      { title: "Your family", src: { ev: "family" } },
      { title: "Around the house", src: { ev: "home" } },
      { title: "My family and our home — the story", src: { story: "story-02", from: 0, to: 12 } },
      { title: "…and the rest of the story", src: { story: "story-02", from: 12, to: 24 } },
    ] },

  { id: "ms-directions", track: "conv", level: "conv-a2",
    name: "Finding your way",
    can: "ask for directions and understand where you are being sent",
    why: "Understanding the answer is the hard half, so the direction words come with the questions.",
    lessons: [
      { title: "Asking the way", src: { ph: "dir" } },
      { title: "Directions and landmarks", src: { ev: "directions" } },
    ] },

  { id: "ms-core-100", track: "quran", level: "quran-b1",
    name: "The Qur'an's next 50 words",
    can: "recognise the hundred commonest words of the Qur'an",
    why: "The second fifty take you from catching fragments to following the shape of a verse.",
    lessons: [
      { title: "Words 51–60", src: { qc: [50, 60] } },
      { title: "Words 61–70", src: { qc: [60, 70] } },
      { title: "Words 71–80", src: { qc: [70, 80] } },
      { title: "Words 81–90", src: { qc: [80, 90] } },
      { title: "Words 91–100", src: { qc: [90, 100] } },
    ] },

  { id: "ms-time", track: "conv", level: "conv-a2",
    name: "Time and plans",
    can: "say when something happens and make a simple plan",
    why: "Arranging anything — a lesson, a meal, a taxi — runs on these.",
    lessons: [
      { title: "Time and plans", src: { ph: "time" } },
      { title: "Time words", src: { ev: "time" } },
    ] },

  { id: "ms-state", track: "conv", level: "conv-a2",
    name: "Saying how you are",
    can: "say how you feel and describe things simply",
    why: "Opposites double your descriptive range for almost no effort.",
    lessons: [
      { title: "How I am", src: { ph: "state" } },
      { title: "Opposites", src: { ev: "opposites" } },
    ] },

  { id: "ms-travel", track: "conv", level: "conv-a2",
    name: "Hotels, taxis and getting help",
    can: "handle a hotel, a taxi, and ask for help when something goes wrong",
    why: "The Umrah logistics that happen whether or not you have the words.",
    lessons: [
      { title: "Hotel and taxi", src: { ev: "hotel-taxi" } },
      { title: "Asking for help", src: { ev: "help" } },
    ] },

  { id: "ms-masjid", track: "conv", level: "conv-b1",
    name: "In the masjid and the Haram",
    can: "understand what is said around you in the masjid and the Haram",
    why: "Where you will actually be, hearing Arabic spoken for real.",
    lessons: [
      { title: "Mosque and worship", src: { ph: "deen" } },
      { title: "Inside the Haram", src: { ev: "haram" } },
      { title: "What the imam says", src: { ev: "masjid" } },
    ] },

  { id: "ms-health", track: "conv", level: "conv-b1",
    name: "If you are unwell",
    can: "explain a problem at a pharmacy or to a doctor",
    why: "Rarely needed, badly missed when it is.",
    lessons: [
      { title: "Medical and the pharmacy", src: { ev: "medical" } },
    ] },

  { id: "ms-qadr", track: "quran", level: "quran-b1",
    name: "Al-Qadr, Quraysh and Al-Fil",
    can: "catch Al-Qadr, Quraysh and Al-Fil by ear",
    why: "Three more short surahs, moving you past the ones you recite daily.",
    lessons: [
      { title: "Al-Qadr", src: { surah: "qadr" } },
      { title: "Quraysh", src: { surah: "quraysh" } },
      { title: "Al-Fil", src: { surah: "fil" } },
    ] },

  { id: "ms-core-150", track: "quran", level: "quran-b1",
    name: "The Qur'an's next 50 words",
    can: "recognise the hundred and fifty commonest words of the Qur'an",
    why: "Past this point most verses have only one or two words you have never met.",
    lessons: [
      { title: "Words 101–110", src: { qc: [100, 110] } },
      { title: "Words 111–120", src: { qc: [110, 120] } },
      { title: "Words 121–130", src: { qc: [120, 130] } },
      { title: "Words 131–140", src: { qc: [130, 140] } },
      { title: "Words 141–150", src: { qc: [140, 150] } },
    ] },

  { id: "ms-kursi", track: "quran", level: "quran-b2",
    name: "Ayat al-Kursi",
    can: "catch Ayat al-Kursi by ear",
    why: "The single most recited verse outside the short surahs, and long enough to be a real test of connected listening.",
    lessons: [
      { title: "Ayat al-Kursi, part 1", src: { surah: "kursi" } },
    ] },
];

/* ---------- build ---------- */
const MIN_PER_ITEM = 2.5;              // measured: active minutes to carry one item to solid
const MIN_PER_WEEK = 50;               // his planning yardstick (2026-08-29) — NOT a target he must hit

let cumulativeMin = 0;
const milestones = SPEC.map((m, order) => {
  const lessons = m.lessons.map((l, li) => {
    const keys = resolve(l.src);
    if (!keys.length) throw new Error(`lesson "${l.title}" in ${m.id} resolved to no keys`);
    return { id: `${m.id}-l${li + 1}`, title: l.title, keys };
  });
  const items = lessons.reduce((a, l) => a + l.keys.length, 0);
  const mins = Math.round(items * MIN_PER_ITEM);
  cumulativeMin += mins;
  return {
    id: m.id, order: order + 1, track: m.track, level: m.level,
    name: m.name, can: m.can, why: m.why,
    items, plannedMin: mins,
    // the pacing annotation — deliberately secondary to the capability
    plannedWeek: Math.max(1, Math.ceil(cumulativeMin / MIN_PER_WEEK)),
    lessons,
  };
});

const existing = D("curriculum.json");
const out = {
  version: 2,
  note: "The MILESTONE LADDER + the capability ladder. Generated by scripts/gen-curriculum.js — edit the SPEC there, not this file. See CURRICULUM.md.",
  planning: { minPerItem: MIN_PER_ITEM, minPerWeek: MIN_PER_WEEK, passMark: 80 },
  baskets: existing.baskets,
  tracks: existing.tracks,
  milestones,
};
fs.writeFileSync(path.join(ROOT, "data", "curriculum.json"), JSON.stringify(out, null, 1) + "\n", "utf8");

const dupKeys = new Map();
for (const m of milestones) for (const l of m.lessons) for (const k of l.keys) {
  if (dupKeys.has(k)) console.log(`  note: ${k} appears in both ${dupKeys.get(k)} and ${l.id}`);
  else dupKeys.set(k, l.id);
}
console.log(`${milestones.length} milestones, ${milestones.reduce((a, m) => a + m.lessons.length, 0)} lessons, ${dupKeys.size} distinct items`);
console.log(`planned runway: ${Math.round(cumulativeMin)} min ≈ ${Math.ceil(cumulativeMin / MIN_PER_WEEK)} weeks at ${MIN_PER_WEEK} min/week`);
for (const m of milestones.slice(0, 8)) console.log(`  wk${String(m.plannedWeek).padStart(2)} ${m.track === "quran" ? "🎧" : "🗣"} ${m.name} — ${m.lessons.length} lessons, ${m.items} items`);
