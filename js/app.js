/* Shared core: story manifest, storage, SRS scheduler, TTS, Arabic text utils, phonetic input */

const STORY_LIST = [
  { id: "story-01", level: 1, n: 1, titleAr: "يَوْمِي", titleEn: "My Day", desc: "A simple daily routine, morning to night.", words: 35 },
  { id: "story-02", level: 1, n: 2, titleAr: "عَائِلَتِي وَبَيْتُنَا", titleEn: "My Family and Our Home", desc: "Ahmad introduces his family and house.", words: 35 },
  { id: "story-03", level: 1, n: 3, titleAr: "فِي السُّوقِ", titleEn: "At the Market", desc: "Saturday shopping with mother.", words: 39 },
  { id: "story-04", level: 1, n: 4, titleAr: "يَوْمُ الجُمُعَةِ", titleEn: "Friday", desc: "Ghusl, the walk to the masjid, the khutbah, the prayer.", words: 38 },
  { id: "story-05", level: 1, n: 5, titleAr: "فِي المَطْعَمِ", titleEn: "At the Restaurant", desc: "Your first full dialogue — ordering dinner, start to bill.", words: 32 },
  { id: "story-06", level: 1, n: 6, titleAr: "حِصَّةٌ مَعَ المُعَلِّمَةِ", titleEn: "The Teacher Session", desc: "A day built around your Arabic lesson — weaving in your Bayna Yadayk Unit 1 words.", words: 27 },
];

/* Root-family manifest (full data in data/families.json) */
const FAMILY_LIST = [
  { id: "qwl", root: "ق و ل", hint: "to say — the Quran's most frequent verb" },
  { id: "qra", root: "ق ر أ", hint: "to read/recite — root of القرآن" },
  { id: "ktb", root: "ك ت ب", hint: "to write/decree — الكتاب" },
  { id: "3lm", root: "ع ل م", hint: "to know — عليم، علّم" },
  { id: "3ml", root: "ع م ل", hint: "to do — deeds" },
  { id: "akl", root: "أ ك ل", hint: "to eat" },
  { id: "shrb", root: "ش ر ب", hint: "to drink" },
  { id: "dhhb", root: "ذ هـ ب", hint: "to go" },
  { id: "slw", root: "ص ل و", hint: "prayer" },
  { id: "hbb", root: "ح ب ب", hint: "to love" },
  { id: "sal", root: "س أ ل", hint: "to ask" },
  { id: "ywm", root: "ي و م", hint: "day — يوم الدين" },
  { id: "hyy", root: "ح ي ي", hint: "life — الحيّ" },
  { id: "klm", root: "ك ل م", hint: "to speak — كلمة" },
  { id: "byt", root: "ب ي ت", hint: "house — البيت" },
];

/* Everyday-Arabic clusters (full data in data/everyday.json) */
const EVERYDAY_LIST = [
  { id: "family", title: "الأُسْرَة", hint: "family — from your teacher (Bayna Yadayk U1)" },
  { id: "home", title: "البَيْت وَالأَشْياء", hint: "home & everyday objects (Bayna Yadayk U1)" },
  { id: "worship", title: "العِبادَة اليَوْمِيَّة", hint: "daily worship words (Bayna Yadayk U1)" },
  { id: "greetings", title: "التَّحِيَّات", hint: "greetings & politeness" },
  { id: "questions", title: "أَدَوَات الاِسْتِفْهَام", hint: "question words" },
  { id: "numbers", title: "الأَرْقَام", hint: "numbers 1–10" },
  { id: "time", title: "كَلِمَات الوَقْت", hint: "now, today, tomorrow" },
  { id: "want-need", title: "أُرِيد وَأَحْتَاج", hint: "want, need, can" },
  { id: "people", title: "النَّاس وَالضَّمَائِر", hint: "people & pronouns" },
  { id: "opposites", title: "الأَضْدَاد", hint: "adjective opposites in pairs" },
  { id: "glue", title: "كَلِمَات الرَّبْط", hint: "yes, no, but, because" },
  { id: "commands", title: "أَوَامِر يَوْمِيَّة", hint: "give me, take, come" },
  { id: "food", title: "الطَّعَام وَالشَّرَاب", hint: "food & drink" },
  { id: "directions", title: "الاِتِّجَاهَات", hint: "Umrah: directions & navigating" },
  { id: "haram", title: "فِي الحَرَم", hint: "Umrah: the rites & places" },
  { id: "shopping", title: "التَّسَوُّق", hint: "Umrah: shopping & bargaining" },
  { id: "medical", title: "الصِّحَّة وَالصَّيْدَلِيَّة", hint: "Umrah: medical & pharmacy" },
  { id: "hotel-taxi", title: "الفُنْدُق وَالمُوَاصَلَات", hint: "Umrah: hotel, taxi, transport" },
  { id: "help", title: "المُسَاعَدَة", hint: "Umrah: asking for help" },
  { id: "masjid", title: "فِي المَسْجِد", hint: "what the imam says — lines, iqama, janazah" },
  { id: "khutba", title: "خُطْبَة الجُمُعَة", hint: "Friday khutbah stock phrases" },
];
const UMRAH_GROUPS = ["directions", "haram", "shopping", "medical", "hotel-taxi", "help"];
const MASJID_GROUPS = ["masjid", "khutba"];

/* Contextual listening: recommended only when your learning has unlocked it —
   e.g. you passed a surah's test, so now hear it recited for real. */
function listenSuggestion() {
  const srs = getSrs();
  const learntCount = prefix => Object.keys(srs).filter(k => k.startsWith(prefix) && isLearnt(k)).length;
  const yt = q => "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
  // 1. Most recent surah you've tested: hear it recited — you'll understand it now
  const passed = QURAN_SURAHS.filter(s => stepsDone("q-" + s.id).test);
  if (passed.length) {
    const s = passed[passed.length - 1];
    return { title: `Hear Surah ${s.name} recited — you understand it now`, desc: "Follow a real reciter; catch every word you just learnt", url: yt(`سورة ${s.ar} تلاوة`) };
  }
  // 2. Khutbah phrases learnt → listen to a real khutbah
  if (learntCount("ev-khutba:") >= 5) {
    return { title: "Listen to a Haram khutbah (subtitled)", desc: "You know the stock phrases — catch them live", url: yt("خطبة الجمعة من الحرم المكي مترجمة") };
  }
  // 3. Umrah kit half-learnt → Umrah vlog in Arabic
  const umrahLearnt = UMRAH_GROUPS.reduce((a, g) => a + learntCount(`ev-${g}:`), 0);
  if (umrahLearnt >= 25) {
    return { title: "Watch an Umrah vlog in Arabic", desc: "Your Umrah vocabulary in its real setting", url: yt("العمرة خطوة بخطوة بالعربية") };
  }
  // 4. Opener kit mostly learnt → slow conversation
  const openerLearnt = ["greetings", "questions", "glue"].reduce((a, g) => a + learntCount(`ev-${g}:`), 0);
  if (openerLearnt >= 15) {
    return { title: "Listen: slow MSA conversations", desc: "Your opener kit, spoken at real (slow) speed", url: yt("slow arabic conversation practice MSA") };
  }
  return null; // nothing unlocked yet — no listening homework
}

const STEPS = [
  { key: "listen", ar: "اِسْتَمِعْ", en: "Listen" },
  { key: "read", ar: "اِقْرَأْ", en: "Read" },
  { key: "memorize", ar: "اِحْفَظْ", en: "Memorize" },
  { key: "quiz", ar: "أَجِبْ", en: "Quiz" },
  { key: "speak", ar: "تَكَلَّمْ", en: "Speak" },
  { key: "write", ar: "اُكْتُبْ", en: "Write" },
];

/* ---------- storage ---------- */
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

function getProgress() { return store.get("ats-progress", {}); }
function setStepDone(storyId, step) {
  const p = getProgress();
  p[storyId] = p[storyId] || { steps: {} };
  p[storyId].steps[step] = true;
  store.set("ats-progress", p);
}
function stepsDone(storyId) {
  const p = getProgress();
  return (p[storyId] && p[storyId].steps) || {};
}

/* ---------- SRS (Leitner boxes) ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 24 * 60 * 60 * 1000;

function getSrs() { return store.get("ats-srs", {}); }
function gradeCard(key, grade) {
  const srs = getSrs();
  const c = srs[key] || { box: 0, due: 0 };
  if (c.b === "never") return; // "don't repeat" is explicit — a batch check must not resurrect the card
  delete c.b; // an actual test result replaces any explicit bucket mark
  if (grade === "again") { c.box = 0; c.due = Date.now() + 10 * 60 * 1000; }
  else if (grade === "good") { c.box = Math.min(c.box + 1, 5); c.due = Date.now() + BOX_DAYS[c.box] * DAY; }
  else { c.box = Math.min(c.box + 2, 5); c.due = Date.now() + BOX_DAYS[c.box] * DAY; }
  srs[key] = c;
  store.set("ats-srs", srs);
}
function dueCards() {
  const srs = getSrs();
  const now = Date.now();
  return Object.keys(srs).filter(k => srs[k].due <= now);
}
function totalCards() { return Object.keys(getSrs()).length; }

/* ---------- explicit buckets: know / repeat / later / never ---------- */
const NEVER_DUE = 4102444800000; // year 2100 — "don't repeat"
const BUCKETS = [
  { id: "know", label: "✓", name: "know — learnt (30d check)", days: 30, box: 5 },
  { id: "repeat", label: "↻", name: "repeat — see it again soon", days: 0, box: 0 },
  { id: "later", label: "⏳", name: "repeat much later (7d)", days: 7, box: 3 },
  { id: "never", label: "✗", name: "don't repeat", days: null, box: 5 },
];
function setBucket(key, b) {
  const srs = getSrs();
  const def = BUCKETS.find(x => x.id === b);
  if (!def) return;
  const due = b === "never" ? NEVER_DUE : (b === "repeat" ? Date.now() + 10 * 60 * 1000 : Date.now() + def.days * DAY);
  srs[key] = { box: def.box, due, b };
  store.set("ats-srs", srs);
}
/* categories (not mutually exclusive): every word is Quran and/or MSA */
function catsOf(key) {
  const sid = key.split(":")[0];
  if (sid === "qc" || sid === "qw" || sid === "gt") return ["quran"];
  if (sid.startsWith("fam-")) return ["quran", "msa"]; // Quranic roots used in MSA too
  return ["msa"]; // everyday clusters and story vocabulary
}

function bucketOf(key) {
  const e = getSrs()[key];
  if (!e) return "unmarked";
  if (e.b) return e.b;
  if (e.box >= 4) return "know";
  if (e.box >= 2) return "later";
  return "repeat";
}
/* Arabic answer match that also accepts either half of a "X / Y" pair */
function arMatch(typed, target) {
  const t = normalizeAr(typed);
  if (!t) return false;
  if (t === normalizeAr(target)) return true;
  return target.split("/").some(p => normalizeAr(p) === t);
}
/* accept a spoken transcript if it contains the target (or either half of a pair) */
function speakMatch(heard, target) {
  const h = normalizeAr(heard);
  if (!h) return false;
  if (arMatch(heard, target)) return true;
  const hw = new Set(h.split(" "));
  return target.split("/").some(p => {
    const tw = normalizeAr(p).split(" ").filter(Boolean);
    return tw.length && tw.every(w => hw.has(w));
  });
}

function seedCards(keys) {
  // add new words to the deck at box 1 (due tomorrow) without per-card grading
  const srs = getSrs();
  let added = 0;
  keys.forEach(k => {
    if (!srs[k]) { srs[k] = { box: 1, due: Date.now() + DAY }; added++; }
  });
  store.set("ats-srs", srs);
  return added;
}

/* ---------- milestones ----------
   A word is "learnt" when you marked it know / don't-repeat, or it has
   climbed to box 2+ by being answered correctly over time. */
function isLearnt(key) {
  const e = getSrs()[key];
  return !!e && (e.b === "know" || e.b === "never" || e.box >= 2);
}

const QURAN_TOKENS = 77430; // total words in the Quran

async function computeMilestones() {
  const [core, everyday, prompts] = await Promise.all([
    fetch("data/quran-core.json").then(r => r.json()).then(d => d.words),
    fetch("data/everyday.json").then(r => r.json()).then(d => d.groups),
    fetch("data/prompts.json").then(r => r.json()).then(d => d.prompts),
  ]);

  const coreLearnt = core.map((w, i) => isLearnt(`qc:${i}`));
  const coreLearntN = coreLearnt.filter(Boolean).length;
  const coverage = Math.round(core.reduce((a, w, i) => a + (coreLearnt[i] ? w.n : 0), 0) / QURAN_TOKENS * 100);
  const covTop = n => Math.round(core.slice(0, n).reduce((a, w) => a + w.n, 0) / QURAN_TOKENS * 100);
  const famFilled = FAMILY_LIST.filter(f => stepsDone("fam-" + f.id).fill).length;
  const surahTested = id => stepsDone("q-" + id).test ? 1 : 0;
  const protTested = surahTested("ikhlas") + surahTested("falaq") + surahTested("nas");
  const allSurahsTested = QURAN_SURAHS.filter(s => stepsDone("q-" + s.id).test).length;
  const coldListened = QURAN_SURAHS.filter(s => stepsDone("q-" + s.id).listen).length;

  const quran = [
    { title: "Al-Fatiha, word by word", why: "You understand every word of every rak'ah you pray — 17+ times a day.",
      have: surahTested("fatiha"), need: 1, unit: "test", link: "quran.html?s=fatiha" },
    { title: "Top 20 Quran words learnt", why: `You'll recognize ≈${covTop(20)}% of all Quranic words — familiar faces everywhere (recognition first; the surah tests measure real understanding).`,
      have: Math.min(coreLearntN, 20), need: 20, unit: "words", link: "vocab.html?sheet=1", test: "top20" },
    { title: "The protection surahs", why: "Al-Ikhlas, Al-Falaq, An-Nas — understood as recited, morning and evening.",
      have: protTested, need: 3, unit: "tests", link: "quran.html" },
    { title: "Top 40 Quran words learnt", why: `≈${covTop(40)}% of all Quranic text recognizable on hearing.`,
      have: Math.min(coreLearntN, 40), need: 40, unit: "words", link: "vocab.html?sheet=1", test: "top40" },
    { title: "3 surahs certified by ear", why: "The cold-listen test: real recitation, no text, you pick each verse's meaning — the goal itself, measured honestly.",
      have: Math.min(coldListened, 3), need: 3, unit: "tests", link: "quran.html" },
    { title: `All ${QURAN_SURAHS.length} surahs tested`, why: "Everything you commonly hear recited — understood word by word.",
      have: allSurahsTested, need: QURAN_SURAHS.length, unit: "tests", link: "quran.html" },
    { title: "Full core + all root families", why: `All 60 core words (≈${covTop(60)}% of the Quran) plus 15 roots and their derived forms.`,
      have: coreLearntN + famFilled, need: 60 + FAMILY_LIST.length, unit: "words", link: "vocab.html", test: "core60" },
  ];

  const evLearnt = g => everyday.find(x => x.id === g).members.filter((m, i) => isLearnt(`ev-${g}:${i}`)).length;
  const evTotalLearnt = everyday.reduce((a, g) => a + g.members.filter((m, i) => isLearnt(`ev-${g.id}:${i}`)).length, 0);
  const evTotal = everyday.reduce((a, g) => a + g.members.length, 0);
  const openerHave = evLearnt("greetings") + evLearnt("questions") + evLearnt("glue");
  const umrahHave = UMRAH_GROUPS.reduce((a, g) => a + evLearnt(g), 0);
  const umrahTotal = UMRAH_GROUPS.reduce((a, g) => a + everyday.find(x => x.id === g).members.length, 0);
  const s1Steps = STEPS.filter(st => stepsDone("story-01")[st.key]).length;
  const s1Words = Array.from({ length: 35 }, (x, i) => isLearnt(`story-01:${i}`)).filter(Boolean).length;
  const storiesComplete = STORY_LIST.filter(s => !s.locked && STEPS.every(st => stepsDone(s.id)[st.key])).length;
  const storyLearnt = STORY_LIST.filter(s => !s.locked).reduce((a, s) =>
    a + Object.keys(getSrs()).filter(k => k.startsWith(s.id + ":") && isLearnt(k)).length, 0);
  const msaLearnt = evTotalLearnt + storyLearnt;
  const storyTotal = STORY_LIST.filter(s => !s.locked).reduce((a, s) => a + (s.words || 0), 0);
  // conversational coverage: share of the site's conversation core (everyday + story vocab) learnt
  const convPct = Math.round(msaLearnt / (evTotal + storyTotal) * 100);
  const promptsReady = prompts.filter(p => p.keys.every(k => isLearnt(k))).length;

  const msa = [
    { title: "Conversation opener kit", why: "Greetings, question words and glue words — you can start, ask, and connect.",
      have: openerHave, need: 27, unit: "words", link: "vocab.html?ev=greetings", test: "opener" },
    { title: "Umrah-ready kit", why: `Directions, the Haram, shopping, medical, taxi, asking for help — ${umrahTotal} words to live your whole trip in Arabic.`,
      have: umrahHave, need: umrahTotal, unit: "words", link: "vocab.html?view=everyday", test: "umrah" },
    { title: "Masjid ears", why: "The imam's instructions and khutbah stock phrases — understand what's said around you in the masjid every week.",
      have: MASJID_GROUPS.reduce((a, g) => a + evLearnt(g), 0), need: MASJID_GROUPS.reduce((a, g) => a + everyday.find(x => x.id === g).members.length, 0),
      unit: "words", link: "vocab.html?ev=masjid", test: "masjid" },
    { title: "First story mastered", why: "My Day: all six skills done and its vocabulary learnt — you can retell a full narrative.",
      have: s1Steps + s1Words, need: 6 + 35, unit: "steps+words", link: "story.html?id=story-01" },
    { title: "20 speaking prompts ready", why: "Twenty real sentences — including the Umrah scenarios — you can produce on demand.",
      have: promptsReady, need: 20, unit: "prompts", link: "speaking.html" },
    { title: "Survival vocabulary complete", why: `All ${evTotal} everyday words across the ${everyday.length} clusters — shops, food, time, people, the whole journey.`,
      have: evTotalLearnt, need: evTotal, unit: "words", link: "vocab.html", test: "survival" },
    { title: `All ${STORY_LIST.filter(s => !s.locked).length} stories + 150 MSA words`, why: "Comfortable with connected everyday narrative and dialogue — ready for level 2.",
      have: storiesComplete + Math.min(msaLearnt, 150), need: STORY_LIST.filter(s => !s.locked).length + 150, unit: "stories+words", link: "index.html" },
  ];

  const totalLearnt = Object.keys(getSrs()).filter(isLearnt).length;

  /* ---- the long view: HONEST staged goals ----
     Recognizing X% of words is a leading indicator, not comprehension; surah
     tests measure real understanding. 300 words = transactional exchanges,
     NOT free conversation (that's ~2,000+ words plus real listening/speaking
     hours — Arabic is one of the hardest languages for English speakers, and
     these stages say so instead of pretending otherwise). */
  const famLearnt = Object.keys(getSrs()).filter(k => k.startsWith("fam-") && isLearnt(k)).length;
  const quranLemmas = coreLearntN + famLearnt;
  const grammarDone = ["inna", "alladhina", "idafa", "pronouns", "tenses", "negation", "connectors", "prep-pron", "verbears"]
    .filter(g => stepsDone("gr-" + g).test).length;
  const log = store.get("ats-log", []);
  const spokenAttempts = log.filter(x => ["speak", "qspeak", "vspeak", "vspeak-self", "prompt"].includes(x.e)).length;
  const listenClicks = log.filter(x => x.e === "listen-click").length;

  const goalStages = {
    quran: [
      { title: "Your salah, fully understood", detail: "the 7 salah surahs tested + top 60 core words — every word you recite daily (a fixed bar: new lessons never move it)",
        have: SALAH_SURAH_IDS.filter(id => stepsDone("q-" + id).test).length * 10 + coreLearntN, need: SALAH_SURAH_IDS.length * 10 + 60 },
      { title: "Follow familiar passages", detail: "≈300 lemmas ≈ 7 of every 10 words in a typical surah recognized — you can follow recitation of passages you've studied",
        have: quranLemmas, need: 300 },
      { title: "Follow most recitation", detail: "≈800 lemmas + the grammar patterns ≈ 9 of 10 words — unfamiliar surahs become followable (plus regular recitation listening)",
        have: quranLemmas + grammarDone * 5, need: 800 + 40 },
    ],
    conv: [
      { title: "Umrah-transactional Arabic", detail: "the full everyday core (incl. Umrah & masjid clusters) + 20 spoken prompts — you handle set scenarios: taxi, shop, pharmacy, asking help",
        have: evTotalLearnt + promptsReady, need: evTotal + 20 },
      { title: "Basic conversation (≈A2)", detail: "≈1,000 words + steady speaking practice — simple exchanges on familiar topics beyond scripts",
        have: msaLearnt, need: 1000 },
      { title: "Free conversation (B1+)", detail: "≈2,500 words + ~150 hours of real listening & speaking — understanding conversation happening around you; the honest long game",
        have: msaLearnt, need: 2500 },
    ],
    spokenAttempts, listenClicks,
  };

  /* ---- verified achievements: history of what the tests have PROVEN ---- */
  const TEST_TITLES = {
    top20: "Top 20 Quran words", top40: "Top 40 Quran words", core60: "Full Quran core (60)",
    opener: "Conversation opener kit", umrah: "Umrah-ready kit", masjid: "Masjid ears", survival: "Survival vocabulary",
  };
  const groupName = id => {
    const clean = (id || "").replace(/^(fam-|ev-)/, "");
    return (FAMILY_LIST.find(f => f.id === clean) || EVERYDAY_LIST.find(g => g.id === clean) || { root: clean, title: clean }).root
      || (EVERYDAY_LIST.find(g => g.id === clean) || {}).title || clean;
  };
  const surahName = id => (QURAN_SURAHS.find(s => s.id === id) || { name: id }).name;
  const history = [];
  log.forEach(x => {
    if (x.e === "mstest" && x.pass) history.push({ t: x.t, label: `${x.mode === "official" ? "🏅 Certified" : "📝 Mock passed"}: ${TEST_TITLES[x.ms] || x.ms} — ${x.score}/${x.total}` });
    if (x.e === "qtest-done") history.push({ t: x.t, label: `📖 Surah ${surahName(x.surah)} word-meanings test — ${x.score}/${x.total}` });
    if (x.e === "qlisten-test") history.push({ t: x.t, label: `${x.pass ? "🎧 Certified by ear" : "🎧 Cold listen attempt"}: Surah ${surahName(x.surah)} — ${x.score}/${x.total}` });
    if (x.e === "drill-done") history.push({ t: x.t, label: `⚡ Drilled ${groupName(x.fam)} — ${x.score}/${x.total} in ${x.secs}s` });
    if (x.e === "gtest-done" && x.score === x.total) history.push({ t: x.t, label: `🧩 Grammar pattern "${x.g}" — ${x.score}/${x.total}` });
  });
  history.sort((a, b) => b.t - a.t);

  /* sentences PROVEN, not self-reported: mic scored it or a check marked it right */
  const provenPromptEns = new Map();
  log.forEach(x => {
    if (x.e === "prompt" && x.score >= 0.5 && !provenPromptEns.has(x.en)) provenPromptEns.set(x.en, x.t);
  });
  const provenPrompts = [...provenPromptEns.entries()].map(([en, t]) => {
    const p = prompts.find(p => p.en === en);
    return { en, ar: p ? p.ar : "", t };
  }).sort((a, b) => b.t - a.t);
  const provenSpoken = new Set(log.filter(x => (x.e === "speak" || x.e === "qspeak") && x.score >= 0.6).map(x => (x.story || x.surah) + ":" + x.s)).size;
  const provenTrans = new Set(log.filter(x => x.e === "trans" && x.ok).map(x => x.story + ":" + x.i)).size;
  const provenDict = new Set(log.filter(x => x.e === "dict" && x.ok).map(x => x.story + ":" + x.i)).size;

  const learntKeys = Object.keys(getSrs()).filter(isLearnt);
  const learntSplit = {
    quran: learntKeys.filter(k => catsOf(k).includes("quran")).length,
    msa: learntKeys.filter(k => catsOf(k).includes("msa")).length,
  };

  return {
    quran, msa, coverage, convPct, totalLearnt, goalStages,
    history, provenPrompts, provenSpoken, provenTrans, provenDict, learntSplit,
  };
}

/* study rhythm measured from the log: words/min and min/day */
function studyRhythm() {
  const log = store.get("ats-log", []);
  const days = new Set(log.filter(x => x.e !== "time").map(x => new Date(x.t).toDateString())).size;
  const mins = typeof activeMinutes === "function" ? activeMinutes() : 0;
  const learnt = Object.keys(getSrs()).filter(isLearnt).length;
  const early = mins < 15 || learnt < 10 || days < 2;
  return {
    wordsPerMin: early ? 1.0 : Math.max(0.2, learnt / mins),
    minPerDay: days ? Math.max(5, Math.round(mins / days)) : 10,
    early,
  };
}
function weeksTo(remainingWords) {
  const r = studyRhythm();
  const days = remainingWords / (r.wordsPerMin * r.minPerDay);
  return { weeks: Math.max(1, Math.round(days / 7)), rhythm: r };
}

/* pace: words learnt per active minute, from real data */
function paceEta(remaining, unit) {
  const mins = typeof activeMinutes === "function" ? activeMinutes() : 0;
  const learnt = Object.keys(getSrs()).filter(isLearnt).length;
  const early = mins < 8 || learnt < 5;
  const wordsPerMin = early ? 1.0 : Math.max(0.2, learnt / mins);
  const perUnitMin = unit === "test" || unit === "tests" ? 8 : (1 / wordsPerMin);
  return { min: Math.max(1, Math.ceil(remaining * perUnitMin)), early };
}

/* ---------- "What now?" suggestions ---------- */
/* Ordered memorized-first: mapping meaning onto surahs already known by heart
   is the cheapest acquisition there is. Keep in sync with data/verses.json. */
const QURAN_SURAHS = [
  { id: "fatiha", name: "Al-Fatiha", ar: "الفاتحة", n: 1 },
  { id: "ikhlas", name: "Al-Ikhlas", ar: "الإخلاص", n: 112 },
  { id: "falaq", name: "Al-Falaq", ar: "الفلق", n: 113 },
  { id: "nas", name: "An-Nas", ar: "الناس", n: 114 },
  { id: "kawthar", name: "Al-Kawthar", ar: "الكوثر", n: 108 },
  { id: "asr", name: "Al-Asr", ar: "العصر", n: 103 },
  { id: "nasr", name: "An-Nasr", ar: "النصر", n: 110 },
  { id: "qadr", name: "Al-Qadr", ar: "القدر", n: 97 },
  { id: "kafirun", name: "Al-Kafirun", ar: "الكافرون", n: 109 },
  { id: "masad", name: "Al-Masad", ar: "المسد", n: 111 },
  { id: "quraysh", name: "Quraysh", ar: "قريش", n: 106 },
  { id: "fil", name: "Al-Fil", ar: "الفيل", n: 105 },
  { id: "kursi", name: "Ayat al-Kursi", ar: "آية الكرسي", n: 2 },
];
/* The salah bar is FIXED — adding new lessons must never move this goalpost. */
const SALAH_SURAH_IDS = ["fatiha", "ikhlas", "falaq", "nas", "kawthar", "asr", "qadr"];

function suggestNext() {
  const out = [];
  const due = dueCards().length;
  // 0. The one-button day: zero decisions, just start
  out.push({
    icon: "▶", title: "Start my 5 minutes" + (due ? ` (${due} due)` : ""),
    desc: "One tap: due reviews → a few new words → an ears round. It stops by itself.",
    href: "vocab.html?today=1",
  });
  // 1. Vocab Learn — pick your own lane when you want more control
  out.push({
    icon: "📝", title: "Vocab Learn",
    desc: "Auto-picked, frequency-first — fill a column, check, continue or stop",
    href: "vocab.html?sheet=1",
  });
  // 2. Next surah not yet tested
  const nextSurah = QURAN_SURAHS.find(s => !stepsDone("q-" + s.id).test);
  if (nextSurah) out.push({
    icon: "📖", title: `Surah ${nextSurah.name}`,
    desc: "Word-by-word — understand it as it's recited",
    href: `quran.html?s=${nextSurah.id}`,
  });
  // 3. Contextual listening — only when your learning has unlocked something worth hearing
  const lp = listenSuggestion();
  if (lp) out.push({ icon: "🎧", title: lp.title, desc: lp.desc, href: lp.url });
  // 3b. Listen queue — real recitation of studied surahs; costs zero study minutes
  const studiedSurahs = QURAN_SURAHS.filter(s => { const d = stepsDone("q-" + s.id); return d.study || d.test; });
  if (studiedSurahs.length) out.push({
    icon: "🔁", title: `Listen queue — ${studiedSurahs.length} surah${studiedSurahs.length > 1 ? "s" : ""} you've studied`,
    desc: "Real recitation of text you already understand — perfect while walking or commuting",
    href: "quran.html?listen=1",
  });
  // next incomplete story/step
  for (const s of STORY_LIST) {
    if (s.locked) continue;
    const done = stepsDone(s.id);
    const next = STEPS.find(st => !done[st.key]);
    if (next) {
      const started = STEPS.some(st => done[st.key]);
      out.push({
        icon: started ? "▶" : "✨",
        title: `${started ? "Continue" : "Start"} “${s.titleEn}” — ${next.en}`,
        desc: `Story ${s.n}: ${next.ar} ${next.en.toLowerCase()} step`,
        href: `story.html?id=${s.id}&step=${next.key}`,
      });
      break;
    }
  }
  // next grammar pattern not yet tested
  const GRAMMAR_LIST = [
    ["inna", "إِنَّ — the certainty opener"],
    ["alladhina", "الَّذِينَ — 'those who'"],
    ["idafa", "الإضافة — possession by pairing"],
    ["pronouns", "attached pronouns — my/your/his"],
    ["tenses", "past vs present verb shapes"],
    ["negation", "لا / ما / لم / لن — saying 'not'"],
    ["connectors", "وَ / فَـ / ثُمَّ — and, so, then"],
    ["prep-pron", "لَهُ / فِيهِ — fused prepositions"],
    ["verbears", "🎧 who's acting? — verb endings by ear"],
  ];
  const nextG = GRAMMAR_LIST.find(([g]) => !stepsDone("gr-" + g).test);
  if (nextG) out.push({
    icon: "🧩", title: "Grammar: " + nextG[1],
    desc: "One practical pattern, three verses, 1-minute test",
    href: `grammar.html?g=${nextG[0]}`,
  });
  // next unfinished root family (Quranic vocab in connected sets)
  const nextFam = FAMILY_LIST.find(f => !stepsDone("fam-" + f.id).fill);
  if (nextFam) out.push({
    icon: "🌿", title: `Word family: ${nextFam.root}`,
    desc: `${nextFam.hint} — study the family, then fill the sheet`,
    href: `vocab.html?fam=${nextFam.id}`,
  });
  // next everyday cluster (speaking side)
  const nextEv = EVERYDAY_LIST.find(g => !stepsDone("ev-" + g.id).fill);
  if (nextEv) out.push({
    icon: "🗣", title: `Everyday: ${nextEv.title}`,
    desc: `${nextEv.hint} — linked words for real conversation`,
    href: `vocab.html?ev=${nextEv.id}`,
  });
  // reinforce: story with most trouble signals in the log; else re-shadow last completed
  const log = store.get("ats-log", []);
  const trouble = {};
  log.forEach(x => {
    const sid = x.story || (x.card && x.card.split(":")[0]);
    if (!sid) return;
    if (x.e === "replay" || (x.e === "review" && x.g === "again") || (x.e === "speak" && x.score < 0.6) ||
        ((x.e === "dict" || x.e === "trans" || x.e === "quiz") && x.ok === false)) {
      trouble[sid] = (trouble[sid] || 0) + 1;
    }
  });
  const worst = Object.entries(trouble).sort((a, b) => b[1] - a[1])[0];
  const completedStories = STORY_LIST.filter(s => !s.locked && STEPS.every(st => stepsDone(s.id)[st.key]));
  if (worst && STORY_LIST.some(s => s.id === worst[0])) {
    const s = STORY_LIST.find(s => s.id === worst[0]);
    out.push({
      icon: "🎤", title: `Strengthen “${s.titleEn}”`,
      desc: "Shadow it out loud — this story has your most trouble spots",
      href: `story.html?id=${s.id}&step=speak`,
    });
  } else if (completedStories.length) {
    const s = completedStories[completedStories.length - 1];
    out.push({
      icon: "👁", title: `Re-read “${s.titleEn}” without vowels`,
      desc: "Reading bare text is the real-world skill",
      href: `story.html?id=${s.id}&step=read`,
    });
  }
  return out.slice(0, 5);
}

/* ---------- Arabic text utils ---------- */
function stripTashkeel(s) {
  return s.replace(/[ً-ٰٟـ]/g, "");
}
function normalizeAr(s) {
  return stripTashkeel(s)
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^؀-ۿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- TTS ---------- */
let _arVoice = null;
function _loadVoices() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  _arVoice = vs.find(v => v.lang && v.lang.toLowerCase().startsWith("ar")) || null;
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = _loadVoices;
  _loadVoices();
}
function hasArabicVoice() { _loadVoices(); return !!_arVoice; }
function speak(text, rate, onend) {
  if (!window.speechSynthesis) { if (onend) onend(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-SA";
  _loadVoices();
  if (_arVoice) u.voice = _arVoice;
  u.rate = rate || 0.85;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}
function stopSpeak() { if (window.speechSynthesis) speechSynthesis.cancel(); }

/* ---------- real recitation audio (everyayah.com, Alafasy) ----------
   TTS is for study words; recitation is the real thing — the goal is to
   understand the Quran AS RECITED, so listening practice uses a real qari. */
const RECITER_BASE = "https://everyayah.com/data/Alafasy_64kbps/";
function recitationUrl(surahN, ayah) {
  const p = x => String(x).padStart(3, "0");
  return RECITER_BASE + p(surahN) + p(ayah) + ".mp3";
}
let _recAudio = null;
function stopRecitation() {
  if (_recAudio) { _recAudio.onended = null; _recAudio.pause(); _recAudio = null; }
}
/* items: [{n, ayah, ...}]; onEach(item, i) fires as each ayah starts; onDone(err?) at the end */
function playRecitation(items, onEach, onDone) {
  stopRecitation(); stopSpeak();
  let i = 0;
  const next = () => {
    if (i >= items.length) { _recAudio = null; if (onDone) onDone(); return; }
    const it = items[i];
    if (onEach) onEach(it, i);
    const a = new Audio(recitationUrl(it.n, it.ayah));
    _recAudio = a;
    a.onended = () => { i++; next(); };
    a.onerror = () => { _recAudio = null; if (onDone) onDone("audio-failed"); };
    a.play().catch(() => { _recAudio = null; if (onDone) onDone("blocked"); });
  };
  next();
}

/* ---------- Phonetic Latin -> Arabic (from the rkarim25 keyboard) ---------- */
const LATIN_TO_AR = {
  A: "ا", aa: "آ", b: "ب", t: "ت", T: "ط", th: "ث",
  j: "ج", H: "ح", h: "ه", kh: "خ", d: "د", D: "ض",
  dh: "ذ", r: "ر", z: "ز", Z: "ظ", s: "س", S: "ص",
  sh: "ش", gh: "غ", f: "ف", q: "ق", k: "ك", l: "ل",
  m: "م", n: "ن", w: "و", y: "ي", Y: "ى", "3": "ع",
  "'": "ء", "t:": "ة",
  "A'": "أ", "a'": "إ", "w'": "ؤ", "y'": "ئ",
  "(la)": "لا", laa: "لآ", "la'": "لإ", "lA'": "لأ",
  a: "َ", i: "ِ", u: "ُ", "^": "ْ", "*": "ّ",
  "a~": "ً", "i~": "ٍ", "u~": "ٌ",
  ".": ".", ",": "،", ";": "؛", "?": "؟", "-": "ـ",
};
function latinToArabic(text) {
  let out = "", i = 0;
  while (i < text.length) {
    let matched = false;
    for (let len = 4; len > 0; len--) {
      const part = text.slice(i, i + len);
      if (LATIN_TO_AR[part]) { out += LATIN_TO_AR[part]; i += len; matched = true; break; }
    }
    if (!matched) { out += text[i]; i++; }
  }
  return out;
}
const KB_LAYOUT = [
  ["A", "b", "t", "T", "th", "j", "H", "h", "kh", "d"],
  ["D", "dh", "r", "z", "Z", "s", "S", "sh", "gh", "f"],
  ["q", "k", "l", "m", "n", "w", "y", "Y", "3", "'"],
  ["t:", "A'", "a'", "w'", "y'", "a", "i", "u", "^", "*"],
];

/* ---------- shared nav ---------- */
function renderNav(active) {
  const due = dueCards().length;
  const el = document.createElement("nav");
  el.innerHTML = `
    <a class="brand" href="index.html"><span class="ar">العربية بالقصص</span><span>Arabic Through Stories</span></a>
    <span class="spacer"></span>
    <a class="link ${active === "stories" ? "active" : ""}" href="index.html">Stories</a>
    <a class="link ${active === "vocab" ? "active" : ""}" href="vocab.html">Vocab</a>
    <a class="link ${active === "quran" ? "active" : ""}" href="quran.html">Quran</a>
    <a class="link ${active === "grammar" ? "active" : ""}" href="grammar.html">Grammar</a>
    <a class="link ${active === "sentences" ? "active" : ""}" href="sentences.html">Sentences</a>
    <a class="link ${active === "speaking" ? "active" : ""}" href="speaking.html">Speak</a>
    <a class="link ${active === "converse" ? "active" : ""}" href="converse.html">Converse</a>
    <a class="link ${active === "review" ? "active" : ""}" href="review.html">Review${due ? `<span class="badge">${due}</span>` : ""}</a>
    <a class="link ${active === "keyboard" ? "active" : ""}" href="keyboard.html">Keyboard</a>
  `;
  document.body.prepend(el);
}

/* ---------- mini phonetic keyboard component ----------
   Attaches under an Arabic answer input: a Latin phonetic box that live-converts,
   plus tap-buttons for direct letter insertion. */
function attachPhoneticInput(container, answerInput) {
  const wrap = document.createElement("div");
  wrap.className = "mini-kb";
  wrap.innerHTML = `
    <div class="ex-row">
      <button type="button" class="small kb-toggle">⌨ Phonetic keyboard</button>
      <span style="font-size:12px;color:var(--muted)">type Latin below (H=ح kh=خ 3=ع S=ص T=ط) or tap letters</span>
    </div>
    <input class="phonetic-box" placeholder="Type phonetic Latin here, e.g. alsuwq qaryb → السوق قريب" style="display:none">
    <div class="kb-rows"></div>
  `;
  container.appendChild(wrap);
  const toggle = wrap.querySelector(".kb-toggle");
  const phon = wrap.querySelector(".phonetic-box");
  const rows = wrap.querySelector(".kb-rows");

  KB_LAYOUT.forEach(r => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "kb-row";
    r.forEach(k => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = `<span class="k-ar">${LATIN_TO_AR[k]}</span><span class="k-lat">${k}</span>`;
      b.onclick = () => { answerInput.value += LATIN_TO_AR[k]; answerInput.dispatchEvent(new Event("input")); };
      rowDiv.appendChild(b);
    });
    rows.appendChild(rowDiv);
  });
  const space = document.createElement("div");
  space.className = "kb-row";
  const sb = document.createElement("button");
  sb.type = "button";
  sb.style.minWidth = "160px";
  sb.innerHTML = `<span class="k-lat">space</span>`;
  sb.onclick = () => { answerInput.value += " "; };
  const del = document.createElement("button");
  del.type = "button";
  del.innerHTML = `<span class="k-lat">⌫</span>`;
  del.onclick = () => { answerInput.value = answerInput.value.slice(0, -1); };
  space.appendChild(sb); space.appendChild(del);
  rows.appendChild(space);

  toggle.onclick = () => {
    wrap.classList.toggle("open");
    phon.style.display = wrap.classList.contains("open") ? "block" : "none";
  };
  phon.addEventListener("input", () => {
    answerInput.value = latinToArabic(phon.value);
    answerInput.dispatchEvent(new Event("input"));
  });
}

async function loadStory(id) {
  const res = await fetch(`data/${id}.json`);
  if (!res.ok) throw new Error("Story not found: " + id);
  return res.json();
}

/* ---------- fuzzy English answer matching ----------
   Accepts an answer if it shares a meaningful word (or synonym) with the gloss. */
const _EN_STOP = new Set(["he", "she", "it", "they", "we", "you", "i", "the", "a", "an", "of", "is", "are", "was", "were", "to", "in", "and", "for", "with", "his", "her", "their", "its", "who", "that", "this", "one", "be", "been", "do", "did", "does", "will", "shall"]);
const _SYN_GROUPS = [
  ["indeed", "truly", "certainly", "surely", "verily"],
  ["from", "of"],
  ["said", "say", "says", "saying", "tell", "speak"],
  ["upon", "on", "over"],
  ["no", "not", "none", "never", "dont", "doesnt", "didnt", "isnt"],
  ["what", "which"],
  ["every", "all", "each"],
  ["lord", "master"],
  ["people", "mankind", "humanity", "humankind", "nation", "folk", "men"],
  ["book", "scripture"],
  ["path", "way", "road"],
  ["was", "were", "been", "existed"],
  ["except", "but", "unless", "besides", "only"],
  ["to", "towards", "toward"],
  ["punishment", "torment", "penalty"],
  ["earth", "land", "ground"],
  ["sky", "heaven", "heavens"],
  ["great", "tremendous", "mighty", "greatest", "big", "grand", "immense"],
  ["merciful", "mercy"],
  ["forgiving", "forgiver", "forgiveness"],
  ["knowing", "knower", "knows", "knew", "knowledge", "aware"],
  ["wise", "wisdom"],
  ["created", "creates", "create", "creation", "creator", "made"],
  ["came", "come", "comes", "arrived"],
  ["gave", "give", "gives", "given"],
  ["believed", "believe", "believers", "believing", "faith", "faithful"],
  ["disbelieved", "disbelieve", "disbelievers", "rejected", "denied"],
  ["soul", "self", "selves", "souls"],
  ["thing", "something"],
  ["truth", "true", "right", "real"],
  ["messenger", "apostle"],
  ["signs", "sign", "verses", "verse"],
  ["fire", "hellfire", "hell"],
  ["garden", "paradise", "gardens"],
  ["guidance", "guide", "guides", "guided"],
  ["prayer", "pray", "prays", "prayers", "salah", "salat"],
  ["life", "living", "alive", "live", "lives"],
  ["death", "dying", "die", "dies", "dead"],
  ["deeds", "deed", "works", "work", "actions", "acts", "done"],
  ["good", "better", "goodness"],
  ["servants", "servant", "slaves", "slave", "worshippers"],
  ["command", "order", "matter", "affair"],
  ["between", "among", "amid"],
  ["after", "afterwards"],
  ["then", "thereafter", "afterwards"],
  ["when", "if", "whenever"],
  ["day", "days"],
  ["worldly", "world", "dunya"],
  ["hereafter", "afterlife"],
];
const _SYN = {};
_SYN_GROUPS.forEach((grp, gi) => grp.forEach(w => { _SYN[w] = gi; }));
function _canon(w) { return _SYN[w] !== undefined ? "~" + _SYN[w] : w; }

function fuzzyEn(typed, gloss) {
  if (!typed.trim()) return false;
  const raw = s => s.toLowerCase().replace(/[!.?'’]/g, "").trim();
  const norm = s => s.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(w => w && !_EN_STOP.has(w)).map(_canon);
  const t = norm(typed), g = norm(gloss);
  // exact match against any gloss part always wins ("he was" for "he was; it was")
  const parts = gloss.toLowerCase().split(/[;,\/]/).map(x => raw(x));
  if (parts.includes(raw(typed))) return true;
  if (!t.length) {
    // answer was all function-words ("was", "in"): accept if it appears inside the gloss
    const r = raw(typed);
    return r.length > 0 && gloss.toLowerCase().includes(r);
  }
  if (!g.length) return false; // handled by the exact-part check above
  return t.some(w => g.includes(w));
}

/* ---------- universal SRS card content resolver ----------
   Keys: "story-01:5", "fam-qwl:3", "qc:12", "qw:fatiha:2:1" */
async function resolveCards(keys) {
  const needStories = new Set();
  let needFams = false, needCore = false, needVerses = false, needEv = false, needGrammar = false;
  keys.forEach(k => {
    const sid = k.split(":")[0];
    if (sid === "qc") needCore = true;
    else if (sid === "qw") needVerses = true;
    else if (sid === "gt") needGrammar = true;
    else if (sid.startsWith("fam-")) needFams = true;
    else if (sid.startsWith("ev-")) needEv = true;
    else needStories.add(sid);
  });
  const stories = {};
  const [fams, core, verses, everyday, grammar] = await Promise.all([
    needFams ? fetch("data/families.json").then(r => r.json()).then(d => d.families) : null,
    needCore ? fetch("data/quran-core.json").then(r => r.json()).then(d => d.words) : null,
    needVerses ? fetch("data/verses.json").then(r => r.json()).then(d => d.surahs) : null,
    needEv ? fetch("data/everyday.json").then(r => r.json()).then(d => d.groups) : null,
    needGrammar ? fetch("data/grammar.json").then(r => r.json()).then(d => d.patterns) : null,
    Promise.all([...needStories].map(async id => {
      try { stories[id] = await loadStory(id); } catch (e) { /* removed story */ }
    })),
  ]);
  return keys.map(k => {
    const p = k.split(":");
    let v = null;
    if (p[0] === "gt") {
      // grammar chunk: see the Arabic pattern piece, recall what it does
      const pat = grammar && grammar.find(x => x.id === p[1]);
      const t = pat && pat.test[parseInt(p[2])];
      if (t) v = { ar: t.ar, en: `${t.prompt}${t.hint ? ` (${t.hint})` : ""}`, tr: "", note: "grammar — " + pat.name };
    } else if (p[0] === "qc") {
      const w = core && core[parseInt(p[1])];
      if (w) v = { ar: w.ar, en: w.en, tr: w.tr, note: `≈${w.n}× in the Quran` };
    } else if (p[0] === "qw") {
      const s = verses && verses.find(x => x.id === p[1]);
      const wd = s && s.verses[parseInt(p[2])] && s.verses[parseInt(p[2])].words[parseInt(p[3])];
      if (wd) v = { ar: wd[0], tr: wd[1], en: wd[2], note: `from ${s.nameEn.split("—")[0].trim()} ${s.verses[parseInt(p[2])].ref}` };
    } else if (p[0].startsWith("fam-")) {
      const fam = fams && fams.find(f => "fam-" + f.id === p[0]);
      const m = fam && fam.members[parseInt(p[1])];
      if (m) v = { ar: m.ar, en: m.en, tr: m.tr, note: "root " + fam.root };
    } else if (p[0].startsWith("ev-")) {
      const g = everyday && everyday.find(x => "ev-" + x.id === p[0]);
      const m = g && g.members[parseInt(p[1])];
      if (m) v = { ar: m.ar, en: m.en, tr: m.tr, note: "everyday: " + g.theme.split("—")[0].trim() };
    } else {
      const st = stories[p[0]];
      const w = st && st.vocab[parseInt(p[1])];
      if (w) v = { ar: w.ar, en: w.en, tr: w.tr, note: w.note };
    }
    return v ? { key: k, v } : null;
  }).filter(Boolean);
}

/* ---------- offline (PWA) ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* http or unsupported — site works without it */ });
}
