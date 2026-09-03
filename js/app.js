/* Shared core: story manifest, storage, SRS scheduler, TTS, Arabic text utils, phonetic input */

const STORY_LIST = [
  { id: "story-01", level: 1, n: 1, titleAr: "يَوْمِي", titleEn: "My Day", desc: "A simple daily routine, morning to night.", words: 35 },
  { id: "story-02", level: 1, n: 2, titleAr: "عَائِلَتِي وَبَيْتُنَا", titleEn: "My Family and Our Home", desc: "Ahmad introduces his family and house.", words: 35 },
  { id: "story-03", level: 1, n: 3, titleAr: "فِي السُّوقِ", titleEn: "At the Market", desc: "Saturday shopping with mother.", words: 39 },
  { id: "story-04", level: 1, n: 4, titleAr: "يَوْمُ الجُمُعَةِ", titleEn: "Friday", desc: "Ghusl, the walk to the masjid, the khutbah, the prayer.", words: 38 },
  { id: "story-05", level: 1, n: 5, titleAr: "فِي المَطْعَمِ", titleEn: "At the Restaurant", desc: "Your first full dialogue — ordering dinner, start to bill.", words: 32 },
  { id: "story-06", level: 1, n: 6, titleAr: "حِصَّةٌ مَعَ المُعَلِّمَةِ", titleEn: "The Teacher Session", desc: "A day built around your Arabic lesson — weaving in your Bayna Yadayk Unit 1 words.", words: 27 },
  { id: "story-07", level: 2, n: 7, titleAr: "سَامِر يَبْحَثُ عَنْ شَقَّةٍ", titleEn: "Samer looks for a flat", desc: "Your 30 Aug class reading — the flat, the days of the week, and asking the owner.", words: 18 },
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
  { id: "rhm", root: "ر ح م", hint: "mercy — الرحمن والرحيم come from رَحِم, the womb" },
];

/* Everyday-Arabic clusters (full data in data/everyday.json) */
/* The minimum conversational phrase deck (data/phrases.json) — memorise these
   and a basic exchange holds together. Manifest only; content in the JSON. */
const PHRASE_LIST = [
  { id: "greet", title: "التَّحِيَّات", hint: "greetings & courtesy — how every exchange opens" },
  { id: "intro", title: "مَنْ أَنا", hint: "who I am — the first two minutes with anyone" },
  { id: "ask", title: "أَدَواتُ السُّؤال", hint: "question frames — swap one word, ask anything" },
  { id: "need", title: "أُرِيد وَأَحْتاج", hint: "wants, needs and polite requests" },
  { id: "dir", title: "أَيْنَ؟", hint: "places & directions" },
  { id: "shop", title: "فِي السُّوق", hint: "the market exchange, start to finish" },
  { id: "food", title: "الأَكْل وَالشُّرْب", hint: "ordering and enjoying food" },
  { id: "time", title: "الوَقْت", hint: "time & plans" },
  { id: "talk", title: "كَلِماتُ الرَّدّ", hint: "the glue between sentences" },
  { id: "help", title: "عِنْدَما لا أَفْهَم", hint: "the repair kit — stay IN the conversation" },
  { id: "state", title: "كَيْفَ أَنا", hint: "states & feelings people ask about" },
  { id: "deen", title: "فِي المَسْجِد", hint: "mosque & worship contexts" },
];

const EVERYDAY_LIST = [
  { id: "family", title: "الأُسْرَة", hint: "family — from your teacher (Bayna Yadayk U1)" },
  { id: "home", title: "البَيْت وَالأَشْياء", hint: "home & everyday objects (Bayna Yadayk U1)" },
  { id: "worship", title: "العِبادَة اليَوْمِيَّة", hint: "daily worship words (Bayna Yadayk U1)" },
  { id: "greetings", title: "التَّحِيَّات", hint: "greetings & politeness" },
  { id: "questions", title: "أَدَوَات الاِسْتِفْهَام", hint: "question words" },
  { id: "numbers", title: "الأَرْقَام", hint: "numbers 1–10" },
  { id: "time", title: "كَلِمَات الوَقْت", hint: "now, today, tomorrow" },
  { id: "lesson-home", title: "شَقَّتُك", hint: "your flat, room by room — class, 30 Aug" },
  { id: "lesson-week", title: "أَيَّام الأُسْبُوع", hint: "the days of the week — class, 30 Aug" },
  { id: "lesson-divine", title: "أَسْمَاء وَبَيْت", hint: "household words that meet the Quran — class, 30 Aug" },
  { id: "lesson-weather", title: "الجَوّ", hint: "weather — the set thalj belongs to" },
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
  // Retired ("never") cards: a correct answer leaves them retired — that's the
  // point of retiring. But an actual MISS he answered and got wrong is proof the
  // burial was a mistake (✗ once meant retire on the bucket bar), so it un-retires
  // the card. Every grade call here is a real user answer; batch checks skip
  // bucketed rows before reaching this function.
  if (c.b === "never" && grade !== "again") return;
  delete c.b; // an actual test result replaces any explicit bucket mark
  if (grade === "again") { c.box = 0; c.due = Date.now() + 10 * 60 * 1000; }
  /* "hard" — he PRODUCED it, but not cleanly.
     His pen note, 2026-08-31, written on the class-words lesson: "when i say i
     said it, i should be able to say how accurate i got it. making it binary
     might not be the best thing." He is right, and the binary was costing more
     than accuracy. A hesitant, second-attempt reading is neither "good" — which
     advances the box and takes the word out of rotation for days — nor "again",
     which throws away knowledge he demonstrably has. So a stumble HOLDS the box
     where it is and brings the card back tomorrow: the one grade here that
     changes when he next sees a word without changing what the site claims he
     knows about it. */
  else if (grade === "hard") { c.due = Date.now() + DAY; }
  else if (grade === "good") { c.box = Math.min(c.box + 1, 5); c.due = Date.now() + BOX_DAYS[c.box] * DAY; }
  else { c.box = Math.min(c.box + 2, 5); c.due = Date.now() + BOX_DAYS[c.box] * DAY; }
  c.u = Date.now(); // write time — sync merge resolves retire/un-retire by latest intent
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
  /* His words, 2026-08-30: "categories of got it, repeat, dont repeat, repeat
     much later for me to use spaced repitition." Same four buckets the store has
     always had; named the way he named them, because a tooltip that says
     something else is a tooltip he has to translate. */
  { id: "know", label: "✓", name: "got it — back in 30 days", days: 30, box: 5 },
  { id: "repeat", label: "↻", name: "repeat — back in ~10 minutes", days: 0, box: 0 },
  { id: "later", label: "⏳", name: "repeat much later — back in 7 days", days: 7, box: 3 },
  { id: "never", label: "⊘", name: "don't repeat — never show this again", days: null, box: 5 },
];
function setBucket(key, b) {
  const srs = getSrs();
  const def = BUCKETS.find(x => x.id === b);
  if (!def) return;
  const due = b === "never" ? NEVER_DUE : (b === "repeat" ? Date.now() + 10 * 60 * 1000 : Date.now() + def.days * DAY);
  srs[key] = { box: def.box, due, b, u: Date.now() };
  store.set("ats-srs", srs);
}
/* ---------- ⊘ don't repeat ----------
   His ask, 2026-08-30: "give me the option where i can click dont repeat as
   well. there are words like Allah which really i dont need to repeat."
   The retire bucket already existed for the old word-card pages; this is the
   one-tap toggle the sentence lessons and the vocabulary burst use. Retiring
   sets box 5 and a year-2100 due date, so the word still counts as HELD — it is
   him claiming he knows it, not him deleting it. Un-retiring hands it straight
   back to the scheduler as due now, so it reappears in the next lesson. */
function isRetired(key) { return (getSrs()[key] || {}).b === "never"; }
function toggleRetire(key) {
  if (isRetired(key)) {
    const srs = getSrs();
    srs[key] = { box: Math.max(1, (srs[key].box || 0) - 1), due: Date.now(), u: Date.now() };
    store.set("ats-srs", srs);
    logEvent({ e: "unretire", key });
    return false;
  }
  setBucket(key, "never");
  logEvent({ e: "retire", key });
  return true;
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
/* Levenshtein, capped: returns cap+1 (default cap 1) once the distance exceeds cap. */
function editDist(a, b, cap) {
  cap = cap || 1;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > cap) return cap + 1;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) { const tmp = dp[i]; dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; }
  }
  return Math.min(dp[m], cap + 1);
}
/* ---- how forgiving a SUGGESTION is allowed to be ----
     His report, 2026-08-30: "i typed shukka but it didnt get me the shaqqah
     option to chose, can this be improved further and have more of a autocorrect
     and easier typing feature?"

     Two separate faults, and the second one is the worse of the two:

       · شَقَّة ends in ة, which romanization writes as a bare "-a" — so even the
         CORRECT spelling "shaqqa" converted to شَقَّ and never matched شقة. Every
         ta-marbuta word in the lexicon was unreachable this way.
       · the emphatic letters have no English spelling at all. ط ص ض ظ sound like
         t s d dh to an English ear and the help text asks for capitals; ق and ك
         are both "k" to most people (which is exactly the shukka/shaqqa slip).

     So a suggestion — NOT a grade — is matched through an extra fold that treats
     those pairs as the same letter, and the probe is also tried with a ة on the
     end. This makes the chips generous on purpose: a chip is something he taps to
     accept, so a wrong one costs a glance, while a missing one costs the answer.
     writeMatchAr and friends are untouched — the marking stays strict. */
function sugFoldW(w) { return normalizeAr(String(w)).replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء"); }
function sugFoldLoose(w) { return sugFoldW(w)
    .replace(/ط/g, "ت").replace(/ص/g, "س").replace(/ض/g, "د").replace(/ظ/g, "ذ")
    .replace(/ق/g, "ك").replace(/ث/g, "س").replace(/ز/g, "ذ").replace(/غ/g, "ع")
    /* and the long vowels, which romanization doubles ("sariir", "kitaab") and
       nobody actually types that way — سَرِير reached from "sarir", كِتَاب from
       "kitab". Word-initial ones stay: they carry the alif that starts ال. */
    .replace(/(?!^)[اوي]/g, "");
}

function sugScore(wn, probe) {
    if (!probe || probe.length < 2 || wn === probe) return null;
    // A completion is what he is actually doing — he stopped mid-word — so it
    // outranks every edit-distance correction (those start at 1.1). Scoring it
    // by half its remaining length used to bury the right long word: typing
    // الص offered إِلَى before الصَّالِحَاتِ.
    if (wn.startsWith(probe)) return 0.05 * (wn.length - probe.length);
    // ...and so is a word he typed the body of but not its ة: شق → شقه
    if (wn === probe + "ه") return 0.06;
    const wf = sugFoldLoose(wn), pf = sugFoldLoose(probe);
    if (wf === pf) return 0.15;                       // right word, English letters
    if (wf === pf + "ه") return 0.16;
    if (wf.startsWith(pf) && pf.length >= 2) return 0.25 + 0.05 * (wf.length - pf.length);
    // the floor is 2, not 3: Arabic roots are three letters and a stripped
    // probe is routinely two, which is how شق never reached شقة
    if (pf.length >= 2) {
      const d = editDist(wf, pf, 2);
      if (d <= (wf.length >= 5 ? 2 : 1)) return d + 0.1;
    }
    return null;
}

/* ---------- the fold every typed answer is compared through ----------
   Arabic writes things romanized typing simply cannot reach, and the site's own
   transliteration doesn't distinguish them either:
     · a final long ā may be written ى (عَلَى, حَتَّى, مُصَلَّى) where typing "aa" can only
       ever produce ا;
     · a hamza sits on a seat (ء ؤ ئ أ إ) the typist has no way to pick;
     · ة sounds like a plain "-a" (غُرْفَة typed "ghurfa");
     · the masculine plural carries a silent alif (قَالُوا typed "qaaluu").
   Every one of those was being marked WRONG on correctly-typed answers — 18% of
   the lexicon and 31% of Sentence Practice (measured 2026-08-30). So they are
   folded away on BOTH sides before any comparison.

   normalizeAr is deliberately left alone: it builds SRS card keys, and loosening
   it would silently merge cards and orphan his review history. */
function typedFold(s) {
  return normalizeAr(String(s).replace(/ى/g, "ا"))   // final long ā: ى ≡ ا
    .replace(/[ءؤئ]/g, "ا")                          // hamza seats (normalizeAr already did أإآ)
    .replace(/ة/g, "ه")
    .replace(/وا(?= |$)/g, "و");                     // the plural's silent alif
}
/* Arabic answer match — forgiving. typedFold has already taken care of the
   spellings romanization can't reach; on top of that we forgive a written-out
   tanwin, a ة heard as "-a", and a single slip in longer words. Accepts either
   half of a "X / Y" pair. */
function arMatch(typed, target) {
  const t = normalizeAr(typed);
  if (!t) return false;
  const raws = [String(target), ...String(target).split("/")].map(r => r.trim()).filter(r => normalizeAr(r));
  if (raws.some(r => normalizeAr(r) === t)) return true;
  const tf0 = typedFold(typed), raw = String(typed).trim();
  return raws.some(r => {
    const cf = typedFold(r);
    let tf = tf0;
    // ة is the feminine marker he must produce, but romanized "-a" arrives as a
    // trailing fatha — count that as the ة it spells (the fold made ة into ه)
    if (/ة$/.test(r) && !/ه$/.test(tf) && /[َاةه]$/.test(raw)) tf += "ه";
    if (cf === tf || cf.replace(/ /g, "") === tf.replace(/ /g, "")) return true; // exact, or same but for spacing
    // tanwin target (شُكْرًا, هُدًى, غَالٍ جِدًّا): typed "shukran"/"jiddan" writes the n out
    if (/[ًٌٍ]/.test(r) && r.split(/\s+/).map(w =>
      /[ًٌٍ]/.test(w) ? typedFold(w).replace(/[اه]$/, "") + "ن" : typedFold(w)).join(" ") === tf) return true;
    return Math.max(cf.length, tf.length) >= 5 && editDist(cf, tf) <= 1; // one slip in a longer word
  });
}
/* Accept an Arabic answer that may have been typed in English letters. He often
   types romanized ("atakallam alhaqq") straight into the box; convert it and let
   the forgiving arMatch decide. Short vowels/shadda become tashkeel that normalizeAr
   strips anyway, so a doubled consonant (his shadda) collapses to one edit — inside
   arMatch's single-slip tolerance. Returns { ok, rom } so callers can flag rom-typed. */
function answerMatchAr(typed, targetAr) {
  if (!typed || !typed.trim()) return { ok: false, rom: false };
  if (arMatch(typed, targetAr)) return { ok: true, rom: false };
  let rom = false, conv = typed;
  if (/[A-Za-z]/.test(typed)) {
    const c = latinToArabic(typed);
    if (c && c !== typed) { conv = c; rom = true; if (arMatch(conv, targetAr)) return { ok: true, rom: true }; }
  }
  /* Everything here arrives through romanization — the answer boxes convert
     English letters as he types — and casual Latin simply has no ص/س, ط/ت, ظ/ذ,
     ح/ه or ع distinction. The site's own transliterations don't either ("khatib"
     for خَطِيب, "nazif" for نَظِيف). So fall through to the same sound-alike tier the
     drill and Story Write already grade on, flagged phon so callers can show the
     exact spelling rather than pretend it was letter-perfect.
     Only for a phrase or a word of 5+ letters, though: that fold is deliberately
     blunt, and on short words it stops telling words apart (مَعَ would pass for
     مَا, قَالُوا for قَالَ). Short words are graded strictly — they are also the ones
     he can actually be expected to spell. */
  const tgt = typedFold(targetAr);
  if (tgt.includes(" ") || tgt.length >= 5) {
    const w = writeMatchAr(conv, targetAr);
    if (w.ok) return { ok: true, rom, phon: true };
  }
  return { ok: false, rom: false };
}

/* Sentence-level fuzzy match (Sentence Practice). The conjugated verb is the thing
   being tested, and its person/tense lives in the first and last couple of letters
   (أكتب/نكتب, كتبت/كتبنا) — so the verb allows a slip only buried mid-word, never
   at the edges. The rest of the sentence is graded loosely: a spelling slip per
   word, a dropped/added ال, or joined/split words don't fail the sentence.
   Returns { ok, rom, fuzzy } — fuzzy means accepted but not letter-perfect. */
function sentenceMatchAr(typed, targetAr, verbForm) {
  if (!typed || !typed.trim()) return { ok: false, rom: false };
  const conv = /[A-Za-z]/.test(typed) ? latinToArabic(typed) : typed;
  const rom = conv !== typed;
  const fold = typedFold;
  const t = fold(conv), c = fold(targetAr);
  if (!t || !c) return { ok: false, rom };
  if (t === c) return { ok: true, rom };
  if (t.replace(/ /g, "") === c.replace(/ /g, "")) return { ok: true, rom, fuzzy: true };
  // the verb: exact, or one slip strictly inside (first/last 2 letters must stand)
  const innerSlip = (a, b) => {
    if (a === b) return true;
    if (Math.max(a.length, b.length) < 5 || editDist(a, b) !== 1) return false;
    const k = Math.min(a.length, b.length);
    let head = 0; while (head < k && a[head] === b[head]) head++;
    let tail = 0; while (tail < k && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
    return head >= 2 && tail >= 2;
  };
  // a long vowel he didn't type is romanization, not the wrong conjugation
  // ("aqulu" for أَقُولُ). The edges still have to stand — person and tense live there.
  const longVowelSlip = (a, b) => {
    const [sh, lo] = a.length <= b.length ? [a, b] : [b, a];
    if (lo.length - sh.length !== 1) return false;
    for (let i = 1; i < lo.length - 1; i++) {
      if (/[اوي]/.test(lo[i]) && lo.slice(0, i) + lo.slice(i + 1) === sh) return true;
    }
    return false;
  };
  const tWords = t.split(" "), cWords = c.split(" ");
  const cVerb = fold(verbForm || cWords[0]);
  if (!innerSlip(tWords[0], cVerb) && !longVowelSlip(tWords[0], cVerb)) return { ok: false, rom };
  // the rest: loose per-word; if word counts differ, compare joined with scaled slack
  // strip a leading ال to forgive a missing/extra article — but never down to a
  // stub, so function words that just start ا-ل (إلى → الي) keep their body
  const stripAl = w => { const s = w.replace(/^ال/, ""); return s.length >= 2 ? s : w; };
  const LONGV = /[اويى]$/;
  const wordOk = (a, b) => {
    if (a === b) return true;
    const as = stripAl(a), bs = stripAl(b);
    if (as === bs) return true;
    // a single dropped/added trailing long vowel — case ending or إلى-vs-الي, not a different word
    const [sh, lo] = a.length < b.length ? [a, b] : [b, a];
    if (lo.length - sh.length === 1 && lo.startsWith(sh) && LONGV.test(lo)) return true;
    // two slips at 5+ letters: an untyped long vowel plus a ة is normal romanization, not ignorance
    const len = Math.max(as.length, bs.length);
    return len >= 4 && editDist(as, bs, 2) <= (len >= 5 ? 2 : 1);
  };
  const restT = tWords.slice(1), restC = cWords.slice(1);
  let ok;
  if (!restC.length) ok = !restT.length;
  else if (restT.length === restC.length) ok = restC.every((w, i) => wordOk(restT[i], w));
  else {
    const a = stripAl(restT.join("")), b = stripAl(restC.join(""));
    const slack = Math.max(1, Math.floor(b.length / 5));
    ok = restT.length > 0 && editDist(a, b, slack) <= slack;
  }
  return ok ? { ok: true, rom, fuzzy: true } : { ok: false, rom };
}

/* Story Write (dictation & translation): whole-sentence check with per-word
   feedback. Romanized typing can't distinguish the emphatic letters, so pairs
   that share one casual Latin letter are folded for grading (ص/س, ط/ت, ظ/ذ/ز,
   ض/د, ح/ه, ع/ا) — but a fold-only match is reported as "phon", not perfect,
   so the exact spelling can be shown and stays honest. Returns
   { ok, phon, hits, words, right, total }: hits[i] ∈ 'hit'|'phon'|'miss' per
   TARGET word (words[i]), ok = every word placed and none extra. */
function writeMatchAr(typed, targetAr) {
  const words = String(targetAr).split(/\s+/).filter(w => normalizeAr(w));
  const empty = { ok: false, phon: false, hits: words.map(() => "miss"), words, right: 0, total: words.length };
  if (!typed || !typed.trim()) return empty;
  const conv = /[A-Za-z]/.test(typed) ? latinToArabic(typed) : typed;
  const strict = s => normalizeAr(String(s));
  const fold = s => typedFold(s)
    .replace(/ح/g, "ه")
    .replace(/ص/g, "س").replace(/ط/g, "ت")
    .replace(/[ظذ]/g, "ز").replace(/ض/g, "د")
    .replace(/ع/g, "ا");
  const stripAl = w => { const s = w.replace(/^ال/, ""); return s.length >= 2 ? s : w; };
  // 2 = letter-perfect, 1 = right by sound (fold / dropped long vowel), 0 = miss
  const tier = (typedW, targetW) => {
    const st = strict(typedW), sc = strict(targetW);
    if (st === sc) return 2;
    // ة is the feminine marker he must actually produce — والد≠والدة, ابن≠ابنة.
    // Checked on the raw typed word: romanized "-a" arrives as a trailing fatha,
    // which counts (he said the a) and is graded as the ة it spells; a bare
    // consonant ending does not count.
    if (/ة$/.test(sc)) {
      if (!/[ةهَاۃ]$/.test(String(typedW))) return 0;
      if (!/[ةه]$/.test(st)) typedW = String(typedW) + "ة";
    }
    const a = fold(typedW), b = fold(targetW);
    if (!a || !b) return 0;
    // a tanwin typed the way it sounds, with the n written out: "shukran" → شكرن
    if (/[ًٌٍ]/.test(String(targetW)) && b.replace(/[اه]$/, "") + "ن" === a) return 1;
    const as = stripAl(a), bs = stripAl(b);
    for (const [x, y] of [[a, b], [as, bs], [a, bs], [as, b]]) {
      if (x === y) return 1;
      // an untyped trailing long vowel ("fi" → ف vs في) is romanization, not a different word
      const [sh, lo] = x.length < y.length ? [x, y] : [y, x];
      if (lo.length - sh.length === 1 && lo.startsWith(sh) && /[اويى]$/.test(lo)) return 1;
      const len = Math.max(x.length, y.length);
      // a long vowel he didn't type ("halak" for حالك) is romanization, not a
      // different word — allowed at any length, because it explains itself
      if (Math.abs(x.length - y.length) === 1) {
        const [sv, lv] = x.length < y.length ? [x, y] : [y, x];
        for (let k = 0; k < lv.length; k++)
          if (/[اوي]/.test(lv[k]) && lv.slice(0, k) + lv.slice(k + 1) === sv) return 1;
      }
      // a plain slip needs 5+, not 4+: at four letters one substitution on top of
      // the sound-alike fold lands on a different word — عَلَيْهِ was grading as اللَّه.
      if (len >= 5 && editDist(x, y, 2) <= (len >= 6 ? 2 : 1)) return 1;
    }
    return 0;
  };
  const T = conv.split(/\s+/).filter(w => strict(w));
  const n = T.length, m = words.length;
  // order-preserving alignment maximizing match quality (sentences are short)
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    const tr = tier(T[i], words[j]);
    dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1], tr ? tr + dp[i + 1][j + 1] : 0);
  }
  const hits = new Array(m).fill("miss");
  let i = 0, j = 0;
  while (i < n && j < m) {
    const tr = tier(T[i], words[j]);
    if (tr && dp[i][j] === tr + dp[i + 1][j + 1]) { hits[j] = tr === 2 ? "hit" : "phon"; i++; j++; }
    else if (dp[i][j] === dp[i + 1][j]) i++;
    else j++;
  }
  let right = hits.filter(h => h !== "miss").length;
  let phon = hits.some(h => h === "phon");
  let ok = right === m && n === m;

  /* ---- THE WHOLE UTTERANCE, RUN TOGETHER ----
     His report, 2026-08-30, typing "bedroom": «غُرفَتُل نَوَم» for غُرْفَةُ نَوْمٍ —
     "dont you think i got it mostly right? … given that my writing isnt as much
     of my priority it probably needs to be easier for me to type and autocorrect."

     He did have it right. What defeated the word-by-word alignment is where the
     definite article LANDS: Arabic says ghurfatu n-nawm, so an English ear writes
     the ل onto the end of the previous word and every word after it is out of
     step. Marking that wrong is marking his ear correct and his spacing wrong,
     which is not the skill being tested — the site exists for understanding and
     speech, and he has said writing is not his priority.

     So when the word-by-word pass fails, the two sides are compared again as ONE
     run-together stream with the spaces and the article taken out. It is scored
     as "right by sound", never letter-perfect, and the exact spelling is still
     shown back to him. The budget scales with length (one slip per six letters)
     and the lengths must be close, so it forgives a boundary, not a guess. */
  if (!ok && m) {
    const stream = x => fold(normalizeAr(String(x))).replace(/\s+/g, "")
      .replace(/ال/g, "")                  // the article, wherever he attached it
      .replace(/(.)/g, "$1")            // a shadda he typed as a double letter
      .replace(/(?!^)[اوي]/g, "");         // long vowels romanization drops or adds
    const a = stream(conv), b = stream(targetAr);
    const len = Math.max(a.length, b.length);
    const cap = 1 + Math.floor(len / 6);
    if (a && b && Math.abs(a.length - b.length) <= cap && editDist(a, b, cap) <= cap) {
      hits.fill("phon"); right = m; phon = true; ok = true;
    }
  }
  return { ok, phon, hits, words, right, total: m };
}

/* ---------- marking an ENGLISH answer ----------
   His ask, 2026-08-30, looking at a meaning question: "in the test, why not give
   me the option to type in english word? here you have to take my word for it,
   not a proper test."

   Right — a self-graded recall question proves nothing, because the answer is on
   screen before he commits. So meaning questions take a typed English answer and
   mark it. The marking has to be generous about ENGLISH, though, because English
   is not what is being tested: a gloss in the data may read "flat, apartment" or
   "he searches / to look" or "sofa (armchair)", and any one of those is a right
   answer. So the target is split on its alternatives, both sides are stripped of
   articles, brackets, punctuation and plural -s, and a one-letter typo in a long
   answer is forgiven. What is NOT forgiven is a different word: "kitchen" for
   مَطْبَخ passes, "bedroom" does not. */
function enMatch(typed, target) {
  const stop = /\b(the|a|an|to|of|for|is|are|am|be|it|its|i|my|you|your|he|his|she|her|we|our|they|their|some|any)\b/g;
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(stop, " ")
    .replace(/\b(\w+?)s\b/g, "$1")          // plural -s, both sides
    .replace(/\s+/g, " ").trim();
  const t = norm(typed);
  if (!t) return false;
  const alts = String(target).split(/[\/;,·]|\bor\b/).map(norm).filter(Boolean);
  if (!alts.length) return false;
  return alts.some(a => {
    if (a === t) return true;
    // his answer inside the gloss, or the gloss inside his answer, on WORD
    // boundaries — "look" must not pass for "book"
    const aw = a.split(" "), tw = t.split(" ");
    // half the gloss's content words, all of them his own: "think" answers
    // "I think so", but "look" never answers "book"
    if (aw.length > 1 && tw.every(w => aw.includes(w)) && tw.length >= Math.ceil(aw.length / 2)) return true;
    if (tw.length > 1 && aw.every(w => tw.includes(w))) return true;
    return a.length >= 5 && editDist(a, t, 1) <= 1;   // one typo in a long answer
  });
}

/* ---------- MARKING WHAT HE SAID ----------
   2026-08-30, once the microphone was finally on the right device: "is there
   something you can do to improve the audio pickup? i say it but it doesnt quite
   get the right word."

   The pickup is as good as it is going to get — Chrome's ar-SA model is a cloud
   service and nothing on this page can retrain it. What CAN change is what
   counts as a match, and that had been wrong: spoken answers were being graded
   with writeMatchAr, which was built for TYPED input. The two fail in completely
   different ways.

     · typing goes wrong by ORTHOGRAPHY — a hamza seat, a ة, a long vowel he did
       not double. The letters are nearly right.
     · recognition goes wrong by WORD. It returns a real, correctly-spelled
       Arabic word that simply is not the one he said: a homophone, a near-rhyme,
       or the same root in another form. سَرِير comes back as سرر or سرار.

   So spoken answers get their own grader. It compares on the phonetic skeleton
   only — short vowels gone, the emphatics folded to their plain partners, long
   vowels dropped, ة/ت/ه as one letter — because that skeleton is what he
   actually produced with his mouth, and everything the recogniser adds on top is
   the recogniser's guess, not his pronunciation.

   For a SENTENCE it asks how much of it came through rather than demanding all
   of it: recognition drops small words constantly, and a sentence whose content
   words are all there was said correctly. The bar is 70%.

   Being generous here is the right trade and not a loose one: this only ever runs
   against ONE known target, never as a search, and when it says no he is asked
   rather than marked wrong. A false accept costs a card scheduled slightly early;
   a false reject costs him the belief that speaking works at all. */
function spokenFold(s) {
  return sugFoldLoose(String(s))
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function heardMatch(heard, target) {
  const H = spokenFold(heard), T = spokenFold(target);
  if (!H || !T) return false;
  if (H === T) return true;
  /* The definite article comes and goes in recognition — it hears السرير for
     سرير about as often as not, and neither is him saying the wrong word. */
  const bare = w => { const b = w.replace(/^ال/, ""); return b.length >= 2 ? b : w; };
  const hw = H.split(" ").filter(Boolean).map(bare);
  const tw = T.split(" ").filter(Boolean).map(bare);
  // does one spoken token stand for one target word?
  const hit = t => hw.some(h => h === t
    || (t.length >= 3 && h.length >= 3 && editDist(h, t, 1) <= 1)
    || (t.length >= 4 && (h.indexOf(t) >= 0 || t.indexOf(h) >= 0)));
  if (tw.length === 1) return hit(tw[0]);
  // a phrase: how much of it came through?
  const got = tw.filter(hit).length;
  return got / tw.length >= 0.7;
}

/* Render a writeMatchAr result word-by-word: green = letter-perfect, amber =
   right by sound (exact spelling shown so it stays honest), faded = missed.
   maskMisses hides the words he still has to produce (dictation), otherwise
   they are shown faded for comparison. Shared by story Write and the drill. */
function wordsHtml(m, maskMisses) {
  return m.words.map((w, i) =>
    m.hits[i] === "miss"
      ? (maskMisses ? '<span style="opacity:.45">···</span>' : `<span style="opacity:.55">${w}</span>`)
      : `<span style="color:${m.hits[i] === "hit" ? "var(--good,#16a34a)" : "var(--warn,#d97706)"}">${w}</span>`
  ).join(" ");
}

/* ears mode: he typed the SOUND of the word (its transliteration) instead of its meaning.
   Casual typing allowed: "qal" ~ qāla, "illa" ~ illā, "3ala" ~ ʿalā. */
function trMatch(typed, tr, ar) {
  if (!tr) return false;
  const norm = s => String(s).toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[ʿʾ'’`\-]/g, "")
    .replace(/7/g, "h").replace(/5/g, "kh").replace(/9/g, "q").replace(/6/g, "t").replace(/[23]/g, "")
    .replace(/[^a-z]/g, "")
    .replace(/(.)\1+/g, "$1");
  const vowel = ch => /[aiueo]/.test(ch);
  // the ONE differing char in an editDist<=1 pair must be a vowel (never mid-word: walid≠wahid; never trailing: rule below owns that)
  const vowelSlip = (a, b) => {
    if (a.length === b.length) {
      const d = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
      return d.length === 1 && vowel(a[d[0]]) && vowel(b[d[0]]);
    }
    const [s, l] = a.length < b.length ? [a, b] : [b, a];
    if (l.length - s.length !== 1) return false;
    for (let i = 0; i < s.length; i++) if (s[i] !== l[i]) return s.slice(i) === l.slice(i + 1) && vowel(l[i]);
    return false; // trailing-char case is handled (with the ة guard) below
  };
  const t = norm(typed);
  if (t.length < 2) return false;
  // ة is the feminine marker he must actually HEAR — walid≠walida, ibn≠ibna, jadd≠jadda
  const taMarbuta = /ة\s*$/.test(String(ar || ""));
  return String(tr).split("/").some(c => {
    c = norm(c);
    if (!c) return false;
    if (c === t) return true;
    // he may skip trailing short vowels ("qal" for qāla) — unless they ARE the word (ta marbuta)
    if (!taMarbuta && c.length > t.length && c.startsWith(t) && /^[aiueo]+$/.test(c.slice(t.length))) return true;
    // one vowel slip in longer words ("yaqol" ~ yaqūl)
    return Math.max(c.length, t.length) >= 5 && vowelSlip(c, t);
  });
}
/* accept a spoken transcript if it contains the target (or either half of a pair) */
/* ============================================================================
   SPEAKING INTO THE SITE — one shared dictation pipeline.

   Lifted out of speaking.html on 2026-08-30 so that lessons, tests and the
   vocabulary burst can all take a spoken answer: "is it possible to use audio
   input from me to repeat the words rather than writing it?" — which is a better
   fit for his goals than typing ever was, since he has said writing is not a
   priority and the whole point is the Qur'an by ear and speech in a mosque.

   The history in the comments below is real and hard-won; the three fixes marked
   FIX 1/2/3 are what "it wasnt working before, it needs to work" turned out to
   mean.
   ============================================================================ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

/* ---------- one shared dictation pipeline ----------
   His 2026-08-07 notes: rows stuck on "listening…", no retry, and "should i be
   able to hear back what i said". Root cause: every 🎤 spun up its own
   SpeechRecognition — the browser allows ONE, so competing rows hung forever.
   Now: one live recognition (starting a new one resets the old row), a 9s
   watchdog so nothing hangs, every 🎤 stays tappable for retries, and a
   best-effort MediaRecorder captures the take for "▶ hear yourself" (dropped
   automatically if this device's recognition can't share the mic). */
let _live = null;      // { rec, mediaRec, stream, watchdog, reset }
let _noHeard = 0;      // consecutive takes where nothing was heard at all
let _recFails = 0;     // consecutive empty takes while also recording

/* ---- WHY THE MICROPHONE KEPT NOT WORKING (2026-08-30) ----
   "it wasnt working before, it needs to work."

   The pipeline was recording his voice with MediaRecorder AT THE SAME TIME as
   SpeechRecognition was listening, so it could offer "▶ hear yourself".
   SpeechRecognition opens its own capture, and on Windows Chrome and Edge two
   simultaneous holds on the same microphone routinely make the recogniser fire
   `aborted` or hear silence. The code already knew this — it flipped recording
   off after two failures — but that is two wasted takes EVERY PAGE LOAD, which
   is exactly what "it doesn't work" feels like from the outside.

   So recording is now OFF unless he turns it on, and the choice is remembered.
   Recognition gets the microphone to itself, which is the job that matters. */
const OWN_VOICE_KEY = "ats-hear-yourself";
let _recOwnVoice = (() => { try { return !!store.get(OWN_VOICE_KEY, false); } catch (e) { return false; } })();
function setHearYourself(on) { _recOwnVoice = !!on; try { store.set(OWN_VOICE_KEY, !!on); } catch (e) {} }
function hearYourselfOn() { return _recOwnVoice; }
function stopDictation() {
  const L = _live;
  if (!L) return;
  _live = null;
  clearTimeout(L.watchdog);
  try { L.rec.onresult = L.rec.onerror = L.rec.onend = null; L.rec.abort(); } catch (e) {}
  try { if (L.mediaRec && L.mediaRec.state !== "inactive") { L.mediaRec.onstop = null; L.mediaRec.stop(); } } catch (e) {}
  try { if (L.stream) L.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  if (L.reset) L.reset();
}
function dictate(btn, idleLabel, cb) {
  // cb(heard|null, playbackUrl|null, errMsg|null) — heard=null means no usable take
  stopDictation(); stopSpeak();
  const rec = new SR();
  // interimResults ON (his 08-13 note: "i am saying it but doesnt get recorded
  // and keeps saying didnt get it"). Two reasons: he SEES the words appear as he
  // speaks, and — the actual bug — some engines emit interim text but never a
  // final result for ar-SA, so the take used to be thrown away as silence. The
  // last interim is now kept and used if no final arrives.
  /* FIX 2: ask for ALTERNATIVES. Arabic recognition is not confident, and its
     top guess is frequently a homophone of the right word while guess three is
     the word itself. Grading against only the first was throwing away correct
     answers. Every alternative is passed back and the grader may accept any. */
  rec.lang = "ar-SA"; rec.interimResults = true; rec.maxAlternatives = 8;
  const L = { rec, interim: "", reset: () => { btn.textContent = idleLabel; } };
  _live = L;
  /* The recogniser does not start the instant the button is tapped — there is a
     short handshake first, and anything said during it is simply not heard. A
     short word spoken into that gap comes back as `no-speech`, i.e. "heard
     silence", which is what he reported. So the button says when it is actually
     ready, and only then. */
  btn.textContent = "… getting the mic";
  const chunks = [];
  let alts = [];
  const finish = (heard, errMsg) => {
    if (!heard && L.interim) { heard = L.interim; errMsg = null; }   // partial beats nothing
    if (_live !== L) return;                 // superseded by a newer dictation
    _live = null;
    clearTimeout(L.watchdog);
    // If recording rode along and the recognizer still heard nothing twice in a
    // row, this device won't share the mic — drop self-recording so dictation
    // gets it alone (his 08-11 note: "I press microphone but nothing records").
    if (heard) { _recFails = 0; _noHeard = 0; }
    else {
      _noHeard++;
      if (typeof micTrouble === "function") setTimeout(micTrouble, 0);
      if (L.mediaRec && ++_recFails >= 2 && _recOwnVoice) {
        _recOwnVoice = false;
        errMsg = "didn't catch that — tap 🎤 once more (▶ hear-yourself is now off so the mic can listen properly)";
      }
    }
    L.reset();
    try { rec.onend = null; rec.stop(); } catch (e) {}
    const done = url => cb(heard, url, errMsg, alts);
    try {
      if (L.mediaRec && L.mediaRec.state !== "inactive") {
        L.mediaRec.onstop = () => {
          let url = null;
          try { if (heard && chunks.length) url = URL.createObjectURL(new Blob(chunks, { type: L.mediaRec.mimeType || "audio/webm" })); } catch (e) {}
          try { L.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
          done(url);
        };
        L.mediaRec.stop();
        return;
      }
    } catch (e) {}
    try { if (L.stream) L.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    done(null);
  };
  rec.onresult = ev => {
    let final = "", interim = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) {
        final += r[0].transcript;
        for (let a = 0; a < r.length; a++) if (r[a] && r[a].transcript) alts.push(r[a].transcript.trim());
      } else interim += r[0].transcript;
    }
    if (interim.trim()) { L.interim = interim.trim(); btn.textContent = "🔴 " + L.interim.slice(-22); }
    if (final.trim()) finish(final.trim(), null);
  };
  rec.onerror = ev => {
    if (ev.error === "aborted" && L.mediaRec) _recOwnVoice = false; // recording likely stole the mic here
    finish(null, ev.error === "not-allowed" ? "mic blocked — allow it in the address bar"
      : ev.error === "audio-capture" ? "no microphone found"
      : ev.error === "no-speech" ? "heard silence — wait for “speak now” before you start, or run the check below"
      : "didn't catch that — tap 🎤 to try again");
  };
  rec.onstart = () => { if (_live === L) btn.textContent = "🔴 speak now"; };
  rec.onend = () => finish(null, "didn't catch that — tap 🎤 to try again");
  // The watchdog must resolve the take itself: rec.stop() on a recognizer that
  // never started throws (swallowed) and leaves the row on "listening…" forever.
  /* FIX 3: 9 seconds cut him off part-way through anything longer than a few
     words, and a truncated take reads as "it didn't work". */
  L.watchdog = setTimeout(() => finish(null, "didn't catch that — tap 🎤 to try again"), 15000);
  const start = () => { try { rec.start(); } catch (e) { finish(null, "mic is busy — tap 🎤 to try again"); } };
  if (_recOwnVoice && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (_live !== L) { stream.getTracks().forEach(t => t.stop()); return; }
      try {
        L.stream = stream;
        L.mediaRec = new MediaRecorder(stream);
        L.mediaRec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
        L.mediaRec.start();
      } catch (e) { L.mediaRec = null; }
      start();
    }).catch(() => { if (_live === L) start(); });
  } else start();
}

/* ---------- WHY IS THE MICROPHONE NOT WORKING ----------
   Round two, 2026-08-30. He still gets "heard silence", AND he has just recorded
   himself successfully with the Windows Voice Recorder — so the hardware, the
   driver and the Windows default input all work. That eliminates every
   device-level explanation and leaves the ones inside the browser.

   The decisive test is therefore not "is the microphone working" — he has already
   answered that — but "can this browser recognise ARABIC specifically". So phase
   3 repeats the listening test in ENGLISH. If English comes back and Arabic does
   not, the microphone is irrelevant: it is the ar-SA model, and the fixes are
   completely different (use Chrome, or switch on Windows' online speech
   recognition) from anything to do with input devices.

     phase 1  level meter, 4s, then everything released
     phase 2  recognition in Arabic, alone, 6s
     phase 3  recognition in English, alone, 5s — only if Arabic heard nothing

   The phases never overlap. The old test ran the meter and the recogniser at the
   same time, which is the conflict that broke dictation in the first place. */
function micBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "chrome";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}
/* one listening pass, with nothing else holding the microphone */
function micListen(lang, ms, onText) {
  return new Promise(resolve => {
    if (!SR) return resolve({ heard: "", err: "no-sr" });
    let rec = null, done = false, heard = "", err = "";
    const fin = () => {
      if (done) return; done = true;
      try { if (rec) { rec.onresult = rec.onerror = rec.onend = null; rec.abort(); } } catch (e) {}
      resolve({ heard: heard.trim(), err });
    };
    try {
      rec = new SR();
      rec.lang = lang; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 3;
      rec.onresult = ev => {
        let txt = "";
        for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
        heard = txt;
        if (onText) onText(txt.trim());
      };
      rec.onerror = ev => { err = ev.error; if (ev.error !== "no-speech") fin(); };
      rec.start();
    } catch (e) { err = "start-failed"; return fin(); }
    setTimeout(fin, ms);
  });
}

/* ---------- WHICH OF HIS SIX MICROPHONES IS HE ACTUALLY TALKING INTO ----------
   2026-08-30, verdict B on Chrome: the browser opened a microphone and peaked at
   1%, while Windows Voice Recorder records him perfectly. His machine offers six
   inputs — an HP dock headset, the Intel array, a Jabra Evolve2, a Logitech
   BRIO, plus the Default and Communications aliases, and Windows' default is the
   Jabra.

   The trap is that CHROME KEEPS ITS OWN microphone choice, per site, entirely
   separate from the Windows default. So Chrome can sit on a dock headset that is
   unplugged, or a headset whose boom arm is up (the Evolve2 mutes itself that
   way), and hear nothing at all while every Windows app is happily using
   something else. No amount of changing the Windows default fixes that.

   Guessing between six devices is hopeless, so this opens each one in turn and
   measures it. Two and a half seconds each, one at a time, never overlapping.
   Whatever lights up is the device he is talking into — and then he sets that
   one in Chrome's own dropdown, which is the only thing that will actually move
   speech recognition, because SpeechRecognition offers no way to pick a device
   from code. This test cannot fix it for him; it can tell him exactly what to
   pick, which is the next best thing and much better than a list of guesses. */
async function micSweep(host) {
  if (!host) return;
  const bar = (pct, on) => `<span style="display:inline-block;width:120px;height:9px;background:var(--border);border-radius:99px;overflow:hidden;vertical-align:middle">
      <i style="display:block;height:100%;width:${Math.min(100, pct)}%;background:${on ? "var(--accent)" : "var(--muted)"}"></i></span>`;

  let devices = [];
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()));
    devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "audioinput");
  } catch (e) {
    host.innerHTML = `<p style="font-size:14px">The browser would not open a microphone at all — allow it from the 🎤 icon in the address bar first.</p>`;
    return;
  }
  if (!devices.length) { host.innerHTML = `<p style="font-size:14px">No inputs found.</p>`; return; }

  const rows = devices.map(d => ({ id: d.deviceId, name: d.label || "(unnamed input)", peak: 0, done: false }));
  const paint = (i) => {
    host.innerHTML = `<p style="margin:0 0 8px;font-size:14px"><b>Keep talking, out loud, until this finishes.</b>
      Testing each input for two and a half seconds — ${i + 1} of ${rows.length}.</p>` +
      rows.map((r, k) => `<div style="display:flex;gap:10px;align-items:center;padding:3px 0;font-size:13px">
        ${bar(Math.round(r.peak * 220), r.peak >= 0.05)}
        <span style="flex:1${k === i ? ";font-weight:700" : ""}">${r.name}</span>
        <span style="color:var(--muted);min-width:44px;text-align:right">${r.done ? Math.round(r.peak * 100) + "%" : (k === i ? "…" : "")}</span>
      </div>`).join("");
  };
  paint(0);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    let stream = null, ctx = null, raf = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: r.id } } });
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser(); an.fftSize = 512;
      src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let peak = 0;
        for (let j = 0; j < buf.length; j++) peak = Math.max(peak, Math.abs(buf[j] - 128) / 128);
        r.peak = Math.max(r.peak, peak);
        paint(i);
        raf = requestAnimationFrame(tick);
      };
      tick();
      await new Promise(res => setTimeout(res, 2500));
    } catch (e) { /* a device that refuses to open just scores zero */ }
    if (raf) cancelAnimationFrame(raf);
    try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    try { if (ctx) await ctx.close(); } catch (e) {}
    r.done = true;
    paint(Math.min(i + 1, rows.length - 1));
    await new Promise(res => setTimeout(res, 200));
  }

  const live = rows.filter(r => r.peak >= 0.05).sort((x, y) => y.peak - x.peak);
  const dead = rows.filter(r => r.peak < 0.05);
  const best = live[0];
  const chrome = /Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent);
  let verdict;
  if (!live.length) {
    verdict = `<b style="color:var(--red)">None of them heard you.</b> Every input the browser can open is silent, while
      Windows records fine — so something is muting the microphone for the BROWSER only. On a Jabra Evolve2 the boom arm
      being up is a hardware mute; check that first. Then Windows Settings → Privacy &amp; security → Microphone →
      <i>Let apps access your microphone</i> and <i>Let desktop apps access your microphone</i>, both on.`;
  } else {
    verdict = `<b style="color:var(--accent)">Your voice is on: ${best.name}</b> (peak ${Math.round(best.peak * 100)}%).
      ${dead.length ? `Silent: ${dead.map(d => d.name).join(", ")}.` : ""}
      <br><br><b>Now point ${chrome ? "Chrome" : "the browser"} at it.</b> Chrome keeps its OWN microphone choice, separate
      from the Windows default — which is why Windows can be perfectly happy while this page hears 1%.
      <br>Click the <b>🎤 or 🔒 icon at the left of the address bar</b> → <b>Microphone</b> → choose
      <b>${best.name}</b> → then reload this page.
      <br>If it is not offered there: paste <code>chrome://settings/content/microphone</code> into a new tab and set it
      at the top.`;
  }
  host.innerHTML = `<div style="font-size:14px;line-height:1.7">${verdict}</div>
    <div style="margin-top:8px">${rows.map(r => `<div style="display:flex;gap:10px;align-items:center;padding:2px 0;font-size:13px">
        ${bar(Math.round(r.peak * 220), r.peak >= 0.05)}
        <span style="flex:1">${r.name}</span>
        <span style="color:var(--muted);min-width:44px;text-align:right">${Math.round(r.peak * 100)}%</span></div>`).join("")}</div>
    <div class="row" style="justify-content:flex-start;margin-top:10px">
      <button class="small" id="msAgain">test them again</button></div>`;
  const again = document.getElementById("msAgain");
  if (again) again.onclick = () => micSweep(host);
  logEvent({ e: "micsweep", n: rows.length, live: live.length,
             best: best ? best.name.slice(0, 60) : "", peak: best ? Math.round(best.peak * 100) : 0 });
  try { if (typeof autoSync === "function") autoSync(); } catch (e) {}
}

async function micDiagnose(host) {
  if (!host) return;
  const say = html => { host.innerHTML = html; };
  const res = { peak: 0, err: "", ar: "", en: "", devices: [], browser: micBrowser() };

  /* ---- phase 1: is any audio reaching the browser at all? ---- */
  say(`<p style="margin:0 0 6px;font-size:14px"><b>1 of 3 — say anything at all, for four seconds.</b></p>
       <div style="height:10px;background:var(--border);border-radius:99px;overflow:hidden">
         <i id="mdBar" style="display:block;height:100%;width:0;background:var(--accent)"></i></div>`);
  let stream = null, ctx = null, raf = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      res.devices = list.filter(d => d.kind === "audioinput").map(d => d.label || "(unnamed)");
    } catch (e) {}
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser(); an.fftSize = 512;
    src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const bar = document.getElementById("mdBar");
    const tick = () => {
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
      res.peak = Math.max(res.peak, peak);
      if (bar) bar.style.width = Math.min(100, Math.round(peak * 220)) + "%";
      raf = requestAnimationFrame(tick);
    };
    tick();
    await new Promise(r => setTimeout(r, 4000));
  } catch (e) { res.err = (e && e.name) || "mic-denied"; }
  if (raf) cancelAnimationFrame(raf);
  try { if (stream) stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  try { if (ctx) await ctx.close(); } catch (e) {}
  await new Promise(r => setTimeout(r, 400));
  const micOk = res.peak >= 0.05;

  /* ---- phase 2: Arabic, alone ---- */
  if (SR && !res.err) {
    say(`<p style="margin:0 0 6px;font-size:14px"><b>2 of 3 — now say one Arabic word.</b>
         Wait for this line to change, then speak.</p>
         <div id="mdHeard" class="arabic" dir="rtl" style="font-size:20px;min-height:28px;color:var(--accent)">listening…</div>`);
    const r2 = await micListen("ar-SA", 6000, t => {
      const h = document.getElementById("mdHeard"); if (h) h.textContent = t;
    });
    res.ar = r2.heard; if (r2.err && r2.err !== "no-speech") res.err = r2.err;
  }

  /* ---- phase 3: English, alone — the discriminator ---- */
  if (SR && !res.err && !res.ar) {
    say(`<p style="margin:0 0 6px;font-size:14px"><b>3 of 3 — now say something in ENGLISH.</b>
         "hello hello hello" is fine. This separates your microphone from Arabic recognition.</p>
         <div id="mdHeard2" style="font-size:18px;min-height:26px;color:var(--accent)">listening…</div>`);
    const r3 = await micListen("en-US", 5000, t => {
      const h = document.getElementById("mdHeard2"); if (h) h.textContent = t;
    });
    res.en = r3.heard;
  }

  /* ---- the verdict ---- */
  const devList = res.devices.length
    ? `<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">Inputs seen: ${res.devices.map(d => `<code>${d}</code>`).join(", ")}</p>` : "";
  const winSpeech = `<b>Windows:</b> Settings → Privacy &amp; security → <b>Speech</b> → turn <b>Online speech recognition ON</b>.
    Browser speech needs it, and Voice Recorder does not — which is exactly why recording can work while this does not.`;
  let msg;
  if (res.err === "NotAllowedError" || res.err === "not-allowed" || res.err === "SecurityError") {
    msg = `<b style="color:var(--red)">A — the browser is blocking the microphone.</b>
      Click the 🔒 or 🎤 icon at the left of the address bar → Microphone → Allow, then reload.`;
  } else if (res.err === "NotFoundError" || res.err === "audio-capture") {
    msg = `<b style="color:var(--red)">A — no microphone found by the browser</b>, even though Windows has one.
      Close anything else using the mic (Teams, Zoom) and reload.`;
  } else if (res.err === "network") {
    msg = `<b style="color:var(--red)">The speech service could not be reached.</b> Browser speech recognition is a
      CLOUD service — it needs the internet, and a work VPN or firewall can block it while everything else works.`;
  } else if (!micOk) {
    /* This is where he landed. Listing six devices and telling him to guess is
       not an answer — the sweep opens each one and measures it. */
    msg = `<b style="color:var(--red)">B — the browser opened a microphone but heard almost nothing</b>
      (peak ${Math.round(res.peak * 100)}%), even though Windows records fine. The browser is on a different input from
      the one Windows uses — and ${res.browser === "chrome" ? "Chrome keeps its own microphone choice, per site, separate from the Windows default"
      : "the browser keeps its own microphone choice, separate from the Windows default"}, so changing Windows will not fix it.
      <br><br><b>Find out which one your voice is actually on:</b>`;
    setTimeout(() => {
      const slot = document.getElementById("mdSweep");
      if (slot) document.getElementById("mdSweepBtn").onclick = () => micSweep(slot);
    }, 0);
  } else if (res.ar) {
    msg = `<b style="color:var(--accent)">✓ Working.</b> Mic peaked at ${Math.round(res.peak * 100)}% and Arabic came
      back as <span class="arabic" dir="rtl">${res.ar}</span>. If a drill still misses, wait for "🔴 speak now"
      before you start.`;
  } else if (res.en) {
    msg = `<b style="color:var(--amber,#d97706)">C — your microphone is fine and English recognition works,
      but this browser returned nothing for Arabic.</b> It heard you say "${res.en}". So this is not your mic and
      not your setup — it is the <b>ar-SA</b> model in ${res.browser === "edge" ? "Edge" : "this browser"}.
      ${res.browser === "edge" ? `<br><br><b>Edge is the likely culprit</b> — its Arabic recognition is far less
      reliable than Chrome's. Open the site in <b>Google Chrome</b> and try again; that is usually the whole fix.`
      : `<br><br>Try <b>Google Chrome</b>, which has the most complete Arabic support.`}
      <br><br>${winSpeech}`;
  } else {
    msg = `<b style="color:var(--amber,#d97706)">C — audio is reaching the browser</b> (peak ${Math.round(res.peak * 100)}%)
      <b style="color:var(--amber,#d97706)">but no speech came back in either language.</b> Your hardware is fine —
      Voice Recorder proved that — so the recognition service itself is not running. Two causes, in order of likelihood:
      <br><br>${winSpeech}
      <br><br><b>Then the browser:</b> ${res.browser === "edge" ? "Edge's speech recognition is the weaker one. Try <b>Google Chrome</b>." : "try <b>Google Chrome</b>, which has the most complete Arabic support."}`;
  }
  const note = `<p style="font-size:13px;color:var(--muted);margin:12px 0 0">
    Either way, <b>you are not blocked</b>: tap 🎤 and choose <b>“I said it — mark it myself”</b>. Saying it out loud is
    the skill; the recogniser was only ever the thing that could check it for you.</p>`;
  const sweepUi = !micOk && !res.err
    ? `<div class="row" style="justify-content:flex-start;margin-top:8px">
         <button class="small" id="mdSweepBtn">🎚 test each microphone</button></div><div id="mdSweep"></div>` : "";
  say(`<div style="font-size:14px;line-height:1.7">${msg}</div>${sweepUi}${note}${devList}
       <div class="row" style="justify-content:flex-start;margin-top:10px">
         <button class="small" id="mdAgain">run it again</button></div>`);
  const again = document.getElementById("mdAgain");
  if (again) again.onclick = () => micDiagnose(host);
  logEvent({ e: "mictest", peak: Math.round(res.peak * 100) / 100, ar: res.ar ? 1 : 0, en: res.en ? 1 : 0,
             err: res.err || "", browser: res.browser, ua: navigator.userAgent.slice(0, 120) });
  try { if (typeof autoSync === "function") autoSync(); } catch (e) {}
}

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
  const [core, everyday, prompts, phraseGroups] = await Promise.all([
    fetch("data/quran-core.json").then(r => r.json()).then(d => d.words),
    fetch("data/everyday.json").then(r => r.json()).then(d => d.groups),
    fetch("data/prompts.json").then(r => r.json()).then(d => d.prompts),
    fetch("data/phrases.json").then(r => r.json()).then(d => d.groups).catch(() => []),
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

  const phTotal = phraseGroups.reduce((a, g) => a + g.members.length, 0);
  const phLearnt = phraseGroups.reduce((a, g) => a + g.members.filter((m, i) => isLearnt(`ph-${g.id}:${i}`)).length, 0);
  const msa = [
    { title: `The conversation deck — ${phTotal} phrases`, why: "The minimum set of whole sentences that, memorised, carries a basic conversation: every question with its answer pattern, plus the repair phrases that keep you IN the exchange.",
      have: phLearnt, need: phTotal, unit: "phrases", link: "vocab.html?view=phrases", test: "phrases" },
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
      have: storiesComplete + Math.min(msaLearnt, 150), need: STORY_LIST.filter(s => !s.locked).length + 150, unit: "stories+words", link: "stories.html" },
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
  const spokenAttempts = log.filter(x => ["speak", "speak-self", "qspeak", "vspeak", "vspeak-self", "prompt"].includes(x.e)).length;
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

/* Miss-buried rescue. A word he ANSWERED and got wrong, then retired within
   minutes, was almost certainly a victim of the old bucket-bar ✗ (it read as
   "got it wrong" but meant "never show again"). Deliberate retires — browse
   taps with no miss just before — are respected and never flagged. The LAST
   never-event per key decides, so re-retiring a rescued word sticks. */
function missBuriedKeys() {
  const srs = getSrs();
  const lastMiss = {}, buriedByMiss = {};
  store.get("ats-log", []).forEach(x => {
    if (!x.key) return;
    if (x.ok === false || x.g === "again") lastMiss[x.key] = x.t;
    if (x.e === "bucket" && x.b === "never")
      buriedByMiss[x.key] = !!(lastMiss[x.key] && x.t - lastMiss[x.key] < 10 * 60 * 1000);
  });
  return Object.keys(buriedByMiss).filter(k =>
    buriedByMiss[k] && srs[k] && srs[k].b === "never");
}

function suggestNext() {
  const out = [];
  const due = dueCards().length;
  // 0a-pre. Rescue accidentally buried words — a 10-second repair, so it goes first
  //         and disappears the moment it's done.
  const buried = missBuriedKeys();
  if (buried.length) out.push({
    icon: "🩹", title: `Rescue ${buried.length} buried word${buried.length > 1 ? "s" : ""}`,
    desc: "You missed these, and the old ✗ button retired them by mistake. One tap brings them back into your reviews.",
    href: "#", rescue: buried,
  });
  // 0. The one-button day: zero decisions, just start
  out.push({
    icon: "▶", title: "Start my 5 minutes" + (due ? ` (${due} due)` : ""),
    desc: "One tap: due reviews → a few new words → an ears round. It stops by itself.",
    href: "vocab.html?today=1",
  });
  // 0b. By-ear on-ramp — his #1 goal is understanding the Qur'an AS RECITED, and by-ear
  //     is the honest gap. Real recitation (not TTS) of Al-Fatiha — known by heart from
  //     salah — needs no prerequisites and no reading. Shown until he's listened even once.
  const earLog = store.get("ats-log", []);
  const byEarDone = earLog.filter(x => x.e === "rlisten" || x.e === "qlisten" || x.e === "qlisten-test").length;
  if (!byEarDone) out.push({
    icon: "🎧", title: "Just listen — 60 seconds",
    desc: "Al-Fatiha recited for real. You know it by heart — let the meanings you've learnt surface. No reading.",
    href: "quran.html?listen=1",
  });
  // 0c. Hands-free Audio Coach — active recall by ear for tired evenings and the commute,
  //     no typing/tapping. Straight at his #1 goal (understand as recited) with the lowest friction.
  out.push({
    icon: "🎧", title: "Audio Coach — hands-free",
    desc: "Listen, recall the meaning in the gap, hear the answer. Your weak words + whole sentences. Perfect on the move.",
    href: "audio.html",
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
  // 2b. Next phrase set — the direct route to the "converse in Arabic" goal:
  //     whole sentences, memorised, that carry a basic exchange
  const nextPh = PHRASE_LIST.find(g => !stepsDone("ph-" + g.id).fill);
  if (nextPh) out.push({
    icon: "💬", title: `Phrases: ${nextPh.title}`,
    desc: `${nextPh.hint} — whole sentences you'll actually say`,
    href: `vocab.html?ph=${nextPh.id}`,
  });
  // 3. Contextual listening — only when your learning has unlocked something worth hearing
  const lp = listenSuggestion();
  if (lp) out.push({ icon: "🎧", title: lp.title, desc: lp.desc, href: lp.url });
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
    ["who-acts", "نَحْنُ vs هُمْ — who's doing it?"],
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
  // Listen queue LAST (2026-07-19, his call): he recites the short surahs daily
  // in salah, so replaying them is low-value — study minutes go to words,
  // sentences and new material first. Only surfaces when little else remains.
  const studiedSurahs = QURAN_SURAHS.filter(s => { const d = stepsDone("q-" + s.id); return d.study || d.test; });
  if (studiedSurahs.length) out.push({
    icon: "🔁", title: `Listen queue — ${studiedSurahs.length} surah${studiedSurahs.length > 1 ? "s" : ""} you've studied`,
    desc: "Real recitation of text you already understand — background listening, zero study minutes",
    href: "quran.html?listen=1",
  });
  return out.slice(0, 5);
}

/* ---------- Arabic text utils ---------- */
function stripTashkeel(s) {
  // includes the Quranic annotation range (U+06D6-U+06ED: waqf signs, small
  // sukun, small madda...) so Uthmani mushaf text normalizes like plain text
  return s.replace(/[ً-ٰـۖ-ۭ]/g, "");
}
function normalizeAr(s) {
  return stripTashkeel(s)
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    // punctuation is never part of an answer — a target "وَأَنْتَ؟" must accept "wa anta"
    .replace(/[؟،؛]/g, "")
    .replace(/[^؀-ۿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------- transliteration for fully-vocalized text ----------
   Rule-based, for machine-generated forms that carry ALL their harakat (the
   conjugation tables). Matches the site's tr style: macrons, ʾ hamza, ʿ ayn.
   The data writes consonant + haraka + shadda, so shadda doubles the last
   consonant BEFORE any short vowel already emitted. Verified against 25
   hand-checked conjugations + all 1312 forms in conjugations.json (2026-08-09).
   Not for un-vowelled or ال-prefixed dictionary words — those need a human. */
const _TL_CONS = {
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ',
  'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ء': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ٱ': '',
};
const _TL_HARAKA = { 'َ': 'a', 'ُ': 'u', 'ِ': 'i' };
const _TL_TANWEEN = { 'ً': 'an', 'ٌ': 'un', 'ٍ': 'in' };
function translitAr(word) {
  const SUKUN = 'ْ', SHADDA = 'ّ';
  const s = String(word || '').replace(/[ـ\s]+/g, '');
  let out = '';
  const isHaraka = c => _TL_HARAKA[c] || _TL_TANWEEN[c] || c === SUKUN || c === SHADDA;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], first = out === '', next = s[i + 1];
    if (c === 'آ') { out += first ? 'ā' : 'ʾā'; continue; }
    if (c === 'ا') {
      if (first) {
        const h = _TL_HARAKA[next];
        if (h) { out += h; i++; }
        else out += ([s[i + 2], s[i + 3]].some(x => x === SUKUN || x === SHADDA) ? 'i' : 'a');
        continue;
      }
      if (out.slice(-1) === 'a') out = out.slice(0, -1) + 'ā';   // long ā; else silent (كَتَبُوا)
      continue;
    }
    if (c === 'ى') { out = (out.slice(-1) === 'a' ? out.slice(0, -1) : out) + 'ā'; continue; }
    if (c === 'ٰ') { if (out.slice(-1) !== 'ā') out = (out.slice(-1) === 'a' ? out.slice(0, -1) : out) + 'ā'; continue; }
    if (c === 'أ' || c === 'إ') {
      const h = _TL_HARAKA[next] || (c === 'إ' ? 'i' : '');
      if (first) { out += h || 'a'; if (_TL_HARAKA[next]) i++; continue; }
      out += 'ʾ'; continue;
    }
    if (c === 'ة') { if (out.slice(-1) !== 'a') out += 'a'; continue; }
    if (_TL_HARAKA[c]) { out += _TL_HARAKA[c]; continue; }
    if (_TL_TANWEEN[c]) { out += _TL_TANWEEN[c]; continue; }
    if (c === SUKUN) continue;
    if (c === SHADDA) {
      const m = out.match(/^([\s\S]*?)(sh|th|kh|dh|gh|ḥ|ṣ|ḍ|ṭ|ẓ|ʿ|ʾ|[bcdfghjklmnpqrstwyz])([aui]{0,2})$/);
      if (m) out = m[1] + m[2] + m[2] + m[3];
      continue;
    }
    if (c === 'و' || c === 'ي') {
      const shortV = c === 'و' ? 'u' : 'i', long = c === 'و' ? 'ū' : 'ī';
      if ((!isHaraka(next) || next === SUKUN) && out.slice(-1) === shortV) {
        out = out.slice(0, -1) + long;
        if (next === SUKUN) i++;
        continue;
      }
      out += _TL_CONS[c]; continue;
    }
    if (_TL_CONS[c] !== undefined) out += _TL_CONS[c];
  }
  return out;
}

/* ---------- TTS ----------
   Voice quality varies wildly by platform. Rank what's installed and take the
   best, instead of the browser default (on Windows that default is the old
   robotic SAPI voice): Edge/iOS neural voices > Google's hosted voices > rest. */
let _arVoice = null, _enVoice = null;
function _voiceScore(v) {
  const n = (v.name || "").toLowerCase();
  let s = 0;
  if (n.includes("natural") || n.includes("neural")) s += 8;
  if (n.includes("premium") || n.includes("enhanced")) s += 6;
  if (n.includes("google")) s += 5;
  if (n.includes("online")) s += 2;
  if (v.localService === false) s += 1;
  return s;
}
function _bestVoice(vs, langPrefix) {
  let best = null, bestScore = -1;
  vs.forEach(v => {
    if (!v.lang || !v.lang.toLowerCase().startsWith(langPrefix)) return;
    const s = _voiceScore(v);
    if (s > bestScore) { best = v; bestScore = s; }
  });
  return best;
}
function _loadVoices() {
  const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  _arVoice = _bestVoice(vs, "ar");
  _enVoice = _bestVoice(vs, "en");
}
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = _loadVoices;
  _loadVoices();
}
function hasArabicVoice() { _loadVoices(); return !!_arVoice; }
function bestEnglishVoice() { _loadVoices(); return _enVoice; }

/* Pre-generated neural audio (audio/ar|en/<hash>.mp3, built by scripts/gen-audio.py)
   beats any browser voice. speak() plays the recording when one exists for the
   text and quietly falls back to speechSynthesis when not (or offline+uncached). */
let _audioMan = null, _audioManLoading = null;
/* REAL RECITATION, where a real recording exists.
   His ask, 2026-08-30: "for all sentences include audio and also get real live
   audio wherever possible as well." Every sentence has a synthesised clip; the
   592 ayat also have Alafasy's actual recitation (scripts/gen-ayah-audio.js),
   and for the Qur'an that is not a nicety — his goal is to understand it AS IT
   IS RECITED, and a TTS voice has no tajwīd, no madd and none of the rhythm his
   ear has to learn. Practising against the synthetic voice would train the wrong
   signal. It is remote, so it needs the network; when it fails, speak() falls
   through to the local clip and the commute still works. */
let _ayahAud = null;
function loadAudioManifest() {
  if (_audioMan || _audioManLoading) return;
  _audioManLoading = fetch("data/audio-manifest.json").then(r => r.json())
    .then(d => (_audioMan = d)).catch(() => (_audioMan = { ar: {}, en: {} }));
  fetch("data/ayah-audio.json").then(r => r.json()).then(d => (_ayahAud = d)).catch(() => {});
}
loadAudioManifest();
function _audioFileFor(text) {
  const isAr = /[؀-ۿ]/.test(text);
  const key = isAr ? normalizeAr(text) : String(text).trim().toLowerCase().replace(/\s+/g, " ");
  if (isAr && _ayahAud && _ayahAud.map[key]) return { src: _ayahAud.base + _ayahAud.map[key] + ".mp3", real: true };
  if (!_audioMan) return null;
  const name = (_audioMan[isAr ? "ar" : "en"] || {})[key];
  return name ? { src: `audio/${isAr ? "ar" : "en"}/${name}.mp3`, real: false } : null;
}
/* ONE shared element, reused for every clip. Mobile autoplay policy blesses a
   media element the user has started once — a fresh `new Audio()` per clip is
   blocked as soon as the call chain isn't a tap (exactly the Audio Coach loop).
   primeSpeak() must be called synchronously inside a click handler (Start,
   Resume); direct 🔊 taps are their own gesture and need nothing. */
let _speakEl = null, _speakPrimed = false;
function _getSpeakEl() { if (!_speakEl) _speakEl = new Audio(); return _speakEl; }
function primeSpeak() {
  if (_speakPrimed || typeof Audio === "undefined") return;
  const a = _getSpeakEl();
  try {
    a.muted = true;
    // a beat of silence: the gesture-initiated play() is what unlocks the element
    a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
    const p = a.play();
    if (p && p.then) p.then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; });
    else a.muted = false;
    _speakPrimed = true;
  } catch (e) { a.muted = false; }
}
/* ---------- TWO SPEEDS, EVERYWHERE HE LISTENS ----------
   His pen note, 2026-08-31: "maybe i can do do 2 speeds of listening to all
   audios." Every 🔊 on the site plays at whatever rate its own page happened to
   hard-code, and there was no way to ask for it slower — story.html has a speed
   slider and nothing else does, which is precisely backwards: the story is the
   page where he already knows the words.

   So rather than a second button beside every one of the dozens of 🔊s, it is ONE
   switch that every call to speak() obeys and the site remembers. "normal" is a
   multiplier of exactly 1, so nothing about today's audio changes until he asks
   for slow; slow is 0.75, which separates the words without distorting the
   vowels. Slow applies to real recitation too — the standing rule against
   retiming a reciter is about the site doing it silently, not about him asking. */
const SPEAK_SLOW = 0.75;
function speakSpeed() { return store.get("ats-speak-speed", "normal") === "slow" ? "slow" : "normal"; }
function setSpeakSpeed(s) { store.set("ats-speak-speed", s === "slow" ? "slow" : "normal"); }
function _speedMul() { return speakSpeed() === "slow" ? SPEAK_SLOW : 1; }
function _speedBtns() {
  const slow = speakSpeed() === "slow";
  const on = "font-weight:700;border-color:var(--accent);color:var(--accent)";
  return `<button type="button" class="small" data-sp="normal" style="${slow ? "" : on}">🔊 normal</button>` +
         `<button type="button" class="small" data-sp="slow" style="${slow ? on : ""}">🐢 slow</button>`;
}
/* drop this anywhere audio is played; it needs no wiring — the listener below is
   delegated, so it survives every re-render of the card it sits in */
function speedToggleHtml() {
  return `<span class="speed-sw" style="display:inline-flex;gap:4px;vertical-align:middle">${_speedBtns()}</span>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-sp]");
  if (!b) return;
  e.preventDefault();
  setSpeakSpeed(b.dataset.sp);
  try { logEvent({ e: "speak-speed", to: speakSpeed() }); } catch (err) {}
  document.querySelectorAll(".speed-sw").forEach(el => { el.innerHTML = _speedBtns(); });
});

function speak(text, rate, onend) {
  stopSpeak();
  const file = _audioFileFor(text);
  if (file) {
    const a = _getSpeakEl();
    // A generated clip is already slightly slow, so don't slow it twice. A REAL
    // recitation is played as recorded — retiming a reciter is exactly the thing
    // the by-ear goal cannot afford.
    const pr = (file.real ? 1 : Math.min(1.15, Math.max(0.8, (rate || 0.85) + 0.2))) * _speedMul();
    let done = false;
    // if the recitation cannot be reached (no signal), the local clip answers,
    // and only if THAT fails does the browser voice
    const fin = ok => {
      if (done) return; done = true; a.onended = null; a.onerror = null;
      if (ok) { if (onend) onend(); return; }
      const local = file.real && _audioMan && (_audioMan.ar || {})[normalizeAr(text)];
      if (local) _playFile({ src: `audio/ar/${local}.mp3`, real: false }, text, rate, onend);
      else _speakTts(text, rate, onend);
    };
    a.onended = () => fin(true);
    a.onerror = () => fin(false);
    a.src = file.src;
    a.playbackRate = pr;
    const p = a.play();
    if (p && p.then) p.then(() => { a.playbackRate = pr; if (onend) setTimeout(() => fin(true), 30000); }).catch(() => fin(false));
    return;
  }
  _speakTts(text, rate, onend);
}
/* the fallback leg of speak() — a local clip after a remote one failed */
function _playFile(file, text, rate, onend) {
  const a = _getSpeakEl();
  let done = false;
  const fin = ok => { if (done) return; done = true; a.onended = null; a.onerror = null; if (!ok) _speakTts(text, rate, onend); else if (onend) onend(); };
  a.onended = () => fin(true);
  a.onerror = () => fin(false);
  a.src = file.src;
  a.playbackRate = Math.min(1.15, Math.max(0.8, (rate || 0.85) + 0.2)) * _speedMul();
  const p = a.play();
  if (p && p.then) p.then(() => { if (onend) setTimeout(() => fin(true), 20000); }).catch(() => fin(false));
}
function _speakTts(text, rate, onend) {
  if (!window.speechSynthesis) { if (onend) onend(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  _loadVoices();
  const isAr = /[؀-ۿ]/.test(text);
  u.lang = isAr ? "ar-SA" : "en-US";
  const v = isAr ? _arVoice : _enVoice;
  if (v) { u.voice = v; if (!isAr) u.lang = v.lang; }
  u.rate = (rate || 0.85) * _speedMul();
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}
function stopSpeak() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (_speakEl) { try { _speakEl.onended = null; _speakEl.onerror = null; _speakEl.pause(); } catch (e) {} }
}
/* true while the shared clip element or TTS is still producing (or fetching)
   sound — callers that bound their waits with a timer must not cut this off */
function speakBusy() {
  if (_speakEl && _speakEl.src && !_speakEl.paused && !_speakEl.ended) return true;
  return !!(window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending));
}

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
    a.playbackRate = _speedMul();
    a.onended = () => { i++; next(); };
    a.onerror = () => { _recAudio = null; if (onDone) onDone("audio-failed"); };
    a.play().catch(() => { _recAudio = null; if (onDone) onDone("blocked"); });
  };
  next();
}

/* Real qari voice for single Quran words (his 2026-08-17 pen note). The clips
   are quran.com's human word-by-word recordings; data/quran-word-audio.json
   maps OUR word tokens to them (built by scripts/gen-quran-word-audio.js —
   token boundaries differ from the canonical text, so the mapping is aligned
   at build time, never guessed here). Merged tokens play their clips in
   sequence; unmapped tokens and any load failure fall back to speak() (TTS). */
let _qwbw = null, _qwbwLoading = null;
function loadQuranWordAudio() {
  if (_qwbw || _qwbwLoading) return;
  _qwbwLoading = fetch("data/quran-word-audio.json").then(r => r.json())
    .then(d => (_qwbw = d)).catch(() => (_qwbw = { base: "", map: {} }));
}
function speakQuranWord(surahId, vi, wi, text, rate) {
  const urls = _qwbw && ((_qwbw.map[surahId] || [])[vi] || [])[wi];
  if (!urls || !urls.length) { speak(text, rate); return; }
  stopSpeak(); stopRecitation();
  const a = _getSpeakEl();
  let i = 0, done = false;
  const fail = () => { if (done) return; done = true; a.onended = null; a.onerror = null; speak(text, rate); };
  const next = () => {
    if (done) return;
    if (i >= urls.length) { done = true; a.onended = null; a.onerror = null; return; }
    a.src = _qwbw.base + urls[i++];
    a.playbackRate = _speedMul();
    const p = a.play();
    if (p && p.catch) p.catch(fail);
  };
  a.onended = next;
  a.onerror = fail;
  next();
}
/* One ayah in the real qari's voice (verse 🔊 taps); TTS if the stream fails. */
function reciteVerse(surahN, ayah, fallbackText, rate) {
  playRecitation([{ n: surahN, ayah }], null, err => { if (err) speak(fallbackText, rate); });
}

/* ---------- data files carry the build stamp ----------
   js and css are stamped in the markup by scripts/bump-version.js; data/*.json
   are fetched from code and were not, so a deploy could pair a NEW
   curriculum.json with a CACHED everyday.json. On 2026-08-30 that rendered him a
   lesson whose own four words could not resolve, leaving only its review items —
   the lesson looked like unrelated nonsense. Stamping the data URLs makes the
   pairing impossible: a new build asks for a URL the old cache does not hold.
   The service worker still answers offline via its ignoreSearch fallback. */
const DATA_V = "mtku26uv";
if (typeof window !== "undefined" && window.fetch) {
  const _f = window.fetch.bind(window);
  window.fetch = (u, o) => (typeof u === "string" && /^data\/[^?]+\.json$/.test(u))
    ? _f(u + "?v=" + DATA_V, o) : _f(u, o);
}

/* ---------- Phonetic Latin -> Arabic (from the rkarim25 keyboard) ---------- */
const LATIN_TO_AR = {
  A: "ا", aa: "ا", b: "ب", t: "ت", T: "ط", th: "ث",
  j: "ج", H: "ح", h: "ه", kh: "خ", d: "د", D: "ض",
  dh: "ذ", r: "ر", z: "ز", Z: "ظ", s: "س", S: "ص",
  sh: "ش", gh: "غ", f: "ف", q: "ق", k: "ك", l: "ل",
  m: "م", n: "ن", w: "و", y: "ي", Y: "ى", "3": "ع",
  "'": "ء", "t:": "ة",
  "A'": "أ", "a'": "إ", "w'": "ؤ", "y'": "ئ",
  "(la)": "لا", laa: "لا", "la'": "لإ", "lA'": "لأ",
  a: "َ", i: "ِ", u: "ُ", "^": "ْ", "*": "ّ",
  "a~": "ً", "i~": "ٍ", "u~": "ٌ",
  ".": ".", ",": "،", ";": "؛", "?": "؟", "-": "ـ",
  // forgiving extras: Arabizi chat numerals + intuitive long vowels + e/o vowels
  "2": "ء", "5": "خ", "6": "ط", "7": "ح", "9": "ق",
  ee: "ي", ii: "ي", oo: "و", uu: "و", ou: "و",
  e: "ِ", o: "ُ",
};
/* The definite article ال, however he romanizes it. In Arabic ال is ALWAYS
   written (alif+lam), even when the lam assimilates in speech to a following
   "sun letter" (as-sayyāra, ash-shams) and even when it fuses onto a preposition
   (bi-, wa-, li-…) where the alif elides in speech. Learners type all of these:
   al-, as-, bi al-, bial-, bis-, bissayyara, wal-…  This pre-pass rewrites every
   such form to a canonical "Al" (explicit alif+lam) so the converter always
   produces the written ال. Hyphens are treated as silent article joiners, never
   as a tatweel. */
const _SUN = "sh|th|dh|[tdrzsSDTZnl]";          // sun-letter romanizations (l included → covers plain al-)
const _PRE = "bi|li|ka|wa|fa|la|ta|sa";         // prepositions the article fuses onto
function expandArticles(raw) {
  return raw
    // hyphen form (optional preposition/space, optional elided 'a'): al- as- bial- bis- wal- "bi as-"
    .replace(new RegExp(`(^|\\s|${_PRE})a?(?:${_SUN})-`, "g"), "$1Al")
    // fused, no hyphen, plain article after a preposition: bialkitab walkitab
    .replace(new RegExp(`(${_PRE})al`, "g"), "$1Al")
    // fused, no hyphen, assimilated sun article after a preposition — the article's
    // 'a' MUST be written (biassayyara), else "sallama"/"kallama" (Form II verbs,
    // same preposition+doubled-sun shape) would be mis-read as articles
    .replace(new RegExp(`(${_PRE})a(${_SUN})\\2`, "g"), "$1Al$2")
    // standalone assimilated sun article: assayyara ashshams annas
    .replace(new RegExp(`(^|\\s)a(${_SUN})\\2`, "g"), "$1Al$2")
    // ال before a word that starts with a vowel: the alif of that word is still
    // written (al-ujra → الأجرة, al-insan → الإنسان), but romanization only carries
    // the vowel, so put the carrier back — otherwise the article eats it
    .replace(/Al(?=[aiueo])/g, "AlA")
    // any leftover hyphen is a silent joiner in romanized Arabic, not a kashida
    .replace(/-/g, "");
}
/* Doubled consonant = shadda: "sayyara" → سيّارة, "rabb" → ربّ — the way he'd
   naturally romanize it. Only a token whose output is one Arabic consonant
   triggers it; long-vowel digraphs (aa/ee/oo…) match as their own tokens first
   and ا is excluded, so vowels never double. '*' still works as explicit shadda.
   A word-initial a/i/u/e/o becomes ا — no Arabic word starts with a bare vowel
   mark, and it makes "al..." produce the definite article ال as he'd expect. */
/* ---------- words whose spelling no phonetic rule can reach ----------
   A short list of very frequent words is written with an alif maqṣūra or a
   dagger alif where the sound is a plain long ā (عَلَى, إِلَى, حَتَّى, هَٰذَا), or hides a
   spelling nothing in the sound announces (الله). Typing them the obvious way
   produced عَلا / الا / هاذا — visibly wrong Arabic in the box, however forgiving
   the grader downstream was. إِلَى alone is the object of a third of Sentence
   Practice. Substituted whole-word, before anything else runs. */
const _ORTHO = {
  allah: "الله", allaah: "الله", allahu: "اللهُ", allaahu: "اللهُ",
  // the site's own transliteration elides the alif after a vowel: "rasūlu llāh"
  llah: "الله", llaah: "الله", llahu: "اللهُ", llaahu: "اللهُ",
  // the shadda makes this word round-trip short ("allha"), and people type it that way
  allha: "الله", allaha: "الله", allhu: "اللهُ",
  ana: "أنا", anaa: "أنا",
  ila: "إلى", ilaa: "إلى", ilay: "إلى",
  ala: "على", alaa: "على", "3ala": "على", "3alaa": "على",
  hatta: "حتى", hattaa: "حتى", Hatta: "حتى", Hattaa: "حتى",
  mata: "متى", mataa: "متى",
  hadha: "هذا", hadhaa: "هذا", haadha: "هذا", haadhaa: "هذا",
  hadhihi: "هذه", haadhihi: "هذه",
  dhalika: "ذلك", dhaalika: "ذلك",
  lakin: "لكن", laakin: "لكن", lakinna: "لكنّ", laakinna: "لكنّ",
  "ulaika": "أولئك", "ulaaika": "أولئك", "ula'ika": "أولئك", "ulaa'ika": "أولئك",
  "shay": "شيء", "shay'": "شيء", "shai": "شيء",
};
/* The article is written separately from the word it defines, so "al-hadha"
   style forms still resolve. Anything not in the table falls through to the
   ordinary letter-by-letter conversion. */
function _orthoWord(w) {
  if (!w) return null;
  if (_ORTHO[w]) return _ORTHO[w];
  const m = /^(?:al-|Al-|al|Al)(.+)$/.exec(w);
  return m && _ORTHO[m[1]] ? "ال" + _ORTHO[m[1]] : null;
}
function latinToArabic(text) {
  text = String(text).split(/(\s+)/).map(t => _orthoWord(t) || t).join("");
  text = expandArticles(text);
  const consonant = ch => ch.length === 1 && /[ء-ي]/.test(ch) && ch !== "ا";
  let out = "", i = 0, atStart = true;
  while (i < text.length) {
    let matched = false;
    for (let len = 4; len > 0; len--) {
      const part = text.slice(i, i + len);
      if (LATIN_TO_AR[part]) {
        const ch = LATIN_TO_AR[part];
        i += len;
        // a word may START with a long vowel (أُومِنُ "uuminu", أُوحِي "uuHii"): the
        // carrier alif is still written, so emit it before the long letter too
        if (atStart && /^(aa|uu|ii|oo|ee|ou)$/.test(part)) out += "ا" + ch;
        else if (atStart && /^[aiueo]$/.test(part)) out += "ا";
        else if (consonant(ch) && text.slice(i, i + len) === part) { out += ch + "ّ"; i += len; }
        else out += ch;
        matched = true; atStart = false; break;
      }
    }
    if (!matched) { atStart = /\s/.test(text[i]); out += text[i]; i++; }
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
/* ============================================================================
   THE WEEK — browser glue for js/curriculum.js. Contract: CURRICULUM.md.

   curriculum.js is kept pure (no localStorage, no fetch) so scripts/test-curriculum.js
   can exercise it in node. Everything that touches the device lives here.
   ============================================================================ */
const WEEK_KEY = "ats-week";          // the coach-set week, cached from coach:<email>
let _curCtxP = null;
function curLoad() {
  if (!_curCtxP) {
    _curCtxP = Promise.all([
      fetch("data/curriculum.json").then(r => r.json()),
      fetch("data/verses.json").then(r => r.json()),
      // the sentence bank is what he actually studies (CURRICULUM.md §5); a page
      // that loads before it exists still works, it just has no sentences to pick
      fetch("data/sentence-bank.json").then(r => r.json()).catch(() => ({ sentences: [] })),
      // measured probability of use — what the interleaved bursts are ranked by
      fetch("data/frequency.json").then(r => r.json()).catch(() => ({ words: {}, cells: [] })),
      // the curated gloss for any word — a vocabulary burst must not show the
      // contextual Qur'anic gloss a bank sentence happens to carry
      fetch("data/lexicon.json").then(r => r.json()).catch(() => ({})),
    ]).then(([curriculum, verses, bank, freq, lexicon]) => ({ curriculum, verses, bank, freq, lexicon }))
      .catch(() => null);
  }
  return _curCtxP;
}
/* The engine groups keys but deliberately doesn't know content NAMES — that
   lives here, where the manifests already are. Used to title objectives and to
   describe exam results in words ("you held Al-Fatiha"). */
function curNameFor(group) {
  let m;
  if ((m = group.match(/^surah:(.+)$/))) {
    const s = QURAN_SURAHS.find(x => x.id === m[1]);
    return s ? `Surah ${s.name}` : "a surah";
  }
  if (group === "qc") return "the Qur'an's most frequent words";
  if (group === "tw") return "words you tapped to learn";
  if ((m = group.match(/^story-(\d+)$/))) {
    const s = STORY_LIST.find(x => x.id === group);
    return s ? s.titleEn : "a story";
  }
  if ((m = group.match(/^ph-(.+)$/))) return (window._PH_NAMES && window._PH_NAMES[m[1]]) || "a set of phrases";
  if ((m = group.match(/^ev-(.+)$/))) return (window._EV_NAMES && window._EV_NAMES[m[1]]) || "an everyday set";
  if ((m = group.match(/^fam-(.+)$/))) {
    const f = FAMILY_LIST.find(x => x.id === m[1]);
    return f ? `the ${f.root} family` : "a root family";
  }
  return "some words";
}

/* Phrase/cluster titles come from data, so they stay right when content changes. */
async function curLoadNames() {
  if (window._PH_NAMES) return;
  window._PH_NAMES = {}; window._EV_NAMES = {};
  try {
    const [ph, ev] = await Promise.all([
      fetch("data/phrases.json").then(r => r.json()),
      fetch("data/everyday.json").then(r => r.json()),
    ]);
    // `title` is the ARABIC heading; `theme` carries the English, often as
    // "Greetings & courtesy — how every exchange opens and closes". An objective
    // wants the short English name, so take the part before the dash.
    const label = g => {
      const th = String(g.theme || "").split(/\s+[—–-]\s+/)[0].replace(/\s*\([^)]*\)\s*$/, "").trim();
      return th || g.title || g.id;
    };
    (ph.groups || []).forEach(g => { window._PH_NAMES[g.id] = label(g); });
    (ev.groups || []).forEach(g => { window._EV_NAMES[g.id] = label(g); });
  } catch (e) { /* names are a nicety; the week still works without them */ }
}

async function curCtx() {
  const base = await curLoad();
  if (!base) return null;
  await curLoadNames();
  return Object.assign({}, base, {
    log: store.get("ats-log", []), srs: getSrs(), progress: getProgress(), now: Date.now(),
    nameFor: curNameFor,
  });
}

/* The current week: the coach's if there is one for this calendar week, otherwise
   a self-seeded one so he NEVER opens the site to a blank slate. */
async function weekGet() {
  const ctx = await curCtx();
  if (!ctx) return null;
  const bounds = Curriculum.weekBounds(Date.now());
  const saved = store.get(WEEK_KEY, null);
  const usable = saved && Curriculum.weekKeys(saved).length && saved.to >= bounds.from;
  const week = usable ? saved : Curriculum.weekSelfSeed(ctx);
  // PERSIST a self-seeded week: without this it is rebuilt on every page load,
  // and each rebuild would mint the next week number
  if (!usable) store.set(WEEK_KEY, week);
  weekAnnounce(week);
  return { week, ctx };
}

/* Log week-start once per week number — this IS the history (only the log
   syncs; see CURRICULUM.md §6).

   ONE EXCEPTION, and it is the difference between the coach's week reaching him
   and quietly not: weekOf() can self-seed and announce week N before
   loadCoach() has finished fetching coach:<email>. The coach's week then wins
   the HERO (it overwrites ats-week) while the HISTORY still holds the
   self-seeded objectives — so carry-over and the exam scope run off a week he
   was never shown. A coach-set week is therefore allowed to supersede a
   self-seeded announcement of the same number exactly once; weekHistory()
   replays with Object.assign, so the later record simply wins.

   `coachSet` is stamped rather than inferred from `source`, because
   weekSelfSeed() rebuilds an already-started week with source "coach" — the
   flag that matters is whether a human coach set it, not what it is labelled. */
function weekAnnounce(week) {
  if (!week || !week.n) return;
  const coachSet = week.source === "coach" && !week.selfSeeded;
  const prior = store.get("ats-log", []).filter(e => e && e.e === "week-start" && e.n === week.n);
  if (prior.length && !(coachSet && !prior[prior.length - 1].coachSet)) return;
  logEvent({
    e: "week-start", n: week.n, title: week.title, from: week.from, to: week.to,
    track: week.track, objectives: Curriculum.weekObjectives(week),
    keys: Curriculum.weekKeys(week), sizedFor: week.sizedFor, coachSet,
  });
}

/* Days until the week closes. The TEST itself is always open (retakes are how
   he sees progress and, by retrieval practice, how he learns) — this is only
   about which attempt goes on the record. */
function _dayStart(ymd) { const p = String(ymd).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
function weekDaysLeft(week) {
  if (!week || !week.to) return null;
  const n = new Date();
  return Math.round((_dayStart(week.to) - new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()) / 86400000);
}
/* Days until the Sunday 07:00 class that CLOSES this week — the thing the week
   is preparing him for. Same day = 0. */
function weekDaysToClass(week) {
  const on = week && (week.classOn || week.to);
  if (!on) return null;
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((_dayStart(on) - t0) / 86400000);
}
function weekClassLine(week) {
  const d = weekDaysToClass(week);
  if (d === null || d < 0) return "";
  return d === 0 ? "class today" : d === 1 ? "class tomorrow" : `class in ${d} days`;
}
function weekAttemptsSoFar(week) {
  return Curriculum.examAttempts(store.get("ats-log", []), week.n).length;
}

/* THE NAV IS HIS, 2026-08-30: "sentences, words, others, progress" — plus
   "there should be a tab of lessons (from preply, which just maintains the
   database of the lessons, what was taught etc)."

   This deliberately breaks the no-new-destination rule that has held since the
   eleven-tab sprawl, because the sprawl was pages nobody asked for; these five
   are the five things he says he works on. Anything else stays behind ⋯ More. */
function renderNav(active) {
  const due = dueCards().length;
  const el = document.createElement("nav");
  el.innerHTML = `
    <a class="brand" href="index.html"><span class="ar">العربية</span><span>Arabic</span></a>
    <span class="spacer"></span>
    <a class="link ${active === "home" || active === "learn" ? "active" : ""}" href="index.html">Home</a>
    <a class="link ${active === "sentences" ? "active" : ""}" href="sentences.html">✍️ Sentences${due ? `<span class="badge">${due}</span>` : ""}</a>
    <a class="link ${active === "words" || active === "vocab" ? "active" : ""}" href="words.html">📇 Words</a>
    <a class="link ${active === "grammar" ? "active" : ""}" href="grammar.html">📐 Others</a>
    <a class="link ${active === "classes" ? "active" : ""}" href="class.html">🧑‍🏫 Lessons</a>
    <a class="link ${active === "map" || active === "more" ? "active" : ""}" href="map.html">📈 Progress</a>
  `;
  document.body.prepend(el);
  mountNotePen();
  initWordTap();
  // the day-plan bar (js/plan.js) — walks him block to block without decisions
  if (typeof planMountBar === "function") { try { planMountBar(); } catch (e) {} }
}

/* ---------- mini phonetic keyboard component ----------
   Attaches under an Arabic answer input: a Latin phonetic box that live-converts,
   plus tap-buttons for direct letter insertion. */
function attachPhoneticInput(container, answerInput) {
  const wrap = document.createElement("div");
  wrap.className = "mini-kb";
  wrap.innerHTML = `
    <input class="phonetic-box" placeholder="type in English letters → عربي (e.g. Alsuwq qaryb)" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    <div class="ex-row" style="margin-top:6px">
      <button type="button" class="small kb-toggle">⌨ keys</button>
      <span style="font-size:12px;color:var(--muted)">H=ح · kh=خ · th=ث · dh=ذ · sh=ش · gh=غ · 3=ع · S=ص · T=ط · A=ا</span>
    </div>
    <div class="kb-rows" style="display:none"></div>
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
    rows.style.display = rows.style.display === "none" ? "block" : "none";
  };
  phon.addEventListener("input", () => {
    answerInput.value = latinToArabic(phon.value);
    answerInput.dispatchEvent(new Event("input"));
  });
}

/* ---------- shared transliteration dock ----------
   A visible Latin box that live-converts (mobile-safe `input` event + the
   digraph-aware latinToArabic) into the currently focused Arabic answer field.
   Only fills Arabic fields (class fill-input or dir=rtl) so English-answer
   fields are never overwritten. Used by every writing surface. */
let _tlDock = null, _tlTarget = null;
function mountTranslitDock(getTarget, forceOpen) {
  const dock = document.getElementById("kbDock");
  if (!dock) return;
  _tlTarget = getTarget;
  if (_tlDock) {
    _tlDock.style.display = forceOpen ? "block" : (_tlDock.style.display === "none" ? "block" : "none");
    if (_tlDock.style.display !== "none") _tlDock.querySelector(".tl-in").focus();
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.padding = "10px";
  wrap.innerHTML = `
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">Type in <b>English letters</b> — the Arabic appears as you type. <span style="white-space:nowrap">H=ح · kh=خ · th=ث · dh=ذ · sh=ش · gh=غ · 3=ع · S=ص · T=ط · A=ا · aa=آ</span></div>
    <div class="ex-row">
      <input class="tl-in" placeholder="e.g. Alsuwq qaryb → السوق قريب" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="flex:1;min-width:170px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:16px">
      <button type="button" class="small tl-clear">clear</button>
      <button type="button" class="small tl-keys">⌨ keys</button>
    </div>
    <div class="tl-preview" dir="rtl" style="font-family:var(--font-ar);font-size:22px;color:var(--accent);min-height:30px;margin-top:6px;text-align:right">…</div>
    <div class="kb-rows tl-rows" style="display:none;margin-top:6px"></div>
  `;
  dock.appendChild(wrap);
  _tlDock = wrap;
  const box = wrap.querySelector(".tl-in");
  const preview = wrap.querySelector(".tl-preview");
  const rows = wrap.querySelector(".tl-rows");
  const fill = () => {
    const ar = latinToArabic(box.value);
    preview.textContent = ar || "…";
    const t = _tlTarget && _tlTarget();
    if (t && (t.classList.contains("fill-input") || t.getAttribute("dir") === "rtl")) {
      t.value = ar; t.dispatchEvent(new Event("input"));
    }
  };
  box.addEventListener("input", fill);
  wrap.querySelector(".tl-clear").onclick = () => { box.value = ""; fill(); box.focus(); };
  wrap.querySelector(".tl-keys").onclick = () => { rows.style.display = rows.style.display === "none" ? "block" : "none"; };
  KB_LAYOUT.forEach(r => {
    const rd = document.createElement("div"); rd.className = "kb-row";
    r.forEach(k => { const b = document.createElement("button"); b.type = "button"; b.innerHTML = `<span class="k-ar">${LATIN_TO_AR[k]}</span><span class="k-lat">${k}</span>`; b.onmousedown = e => e.preventDefault(); b.onclick = () => { box.value += k; fill(); box.focus(); }; rd.appendChild(b); });
    rows.appendChild(rd);
  });
  const extra = document.createElement("div"); extra.className = "kb-row";
  const sp = document.createElement("button"); sp.type = "button"; sp.style.minWidth = "140px"; sp.innerHTML = `<span class="k-lat">space</span>`; sp.onmousedown = e => e.preventDefault(); sp.onclick = () => { box.value += " "; fill(); box.focus(); };
  const del = document.createElement("button"); del.type = "button"; del.innerHTML = `<span class="k-lat">⌫</span>`; del.onmousedown = e => e.preventDefault(); del.onclick = () => { box.value = box.value.slice(0, -1); fill(); box.focus(); };
  extra.appendChild(sp); extra.appendChild(del); rows.appendChild(extra);
  // focusing a different answer field starts a fresh Latin buffer
  document.addEventListener("focusin", e => {
    if (_tlDock && e.target !== box && e.target.classList && (e.target.classList.contains("fill-input") || e.target.getAttribute("dir") === "rtl")) { box.value = ""; preview.textContent = "…"; }
  });
  box.focus();
}

/* ---------- inline live transliteration ----------
   Makes an answer field convert English letters to Arabic AS he types, in the field
   itself — no separate box. A raw-Latin buffer on the element lets digraphs work
   ("k"+"h" → خ) and backspace peel one Latin char at a time. If the browser lacks
   beforeinput the field just stays plain text and the romanized-tolerant grader
   still accepts it, so nothing breaks. Idempotent per element.
   opts.lexicon (Arabic words): light autocorrect — while he types, close or
   completable lexicon words appear as tap-to-fix chips under the field. Never
   auto-replaces, and callers keep answer words (the verb) OUT of the lexicon
   so suggestions can't hand over the graded part. */
function attachInlineTranslit(el, opts) {
  if (!el || el.dataset.tlInline) return;
  el.dataset.tlInline = "1";
  el.setAttribute("dir", "rtl");
  el.setAttribute("autocomplete", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("autocapitalize", "off");
  el.setAttribute("spellcheck", "false");
  // committed = Arabic accepted from a suggestion; raw = Latin still being typed
  let raw = "", committed = "";
  const lex = [...new Set(((opts && opts.lexicon) || []).filter(Boolean))];
  let bar = null;
  const foldW = sugFoldW;
  const suggest = () => {
    if (!lex.length) return;
    if (!bar) {
      bar = document.createElement("div");
      bar.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;direction:rtl;min-height:0";
      el.insertAdjacentElement("afterend", bar);
    }
    const parts = el.value.split(" ");
    const last = foldW(parts[parts.length - 1]);
    const prev = parts.length >= 2 ? foldW(parts[parts.length - 2]) : "";
    const joined = prev ? prev + last : "";   // "ال مشجد" typed with a space → المشجد
    // lower score = closer match; null = no match
    const scoreAgainst = sugScore;
    let cands = [];
    if (last.length >= 2 || joined.length >= 3) {
      cands = lex.map(w => {
        const wn = foldW(w);
        if (!wn) return null;
        const bare = wn.replace(/^ال/, "");   // مشجد should still find المسجد
        let best = null, span = 1;
        // an exact two-token join ("ال"+"مشجد"→المشجد) is the best possible fix, cost 0
        const sJoin = !joined ? null : (wn === joined ? 0 : scoreAgainst(wn, joined));
        [[scoreAgainst(wn, last), 0, 1],
         [bare !== wn ? scoreAgainst(bare, last) : null, 0.2, 1],
         [sJoin, 0, 2]].forEach(([s, pen, sp]) => {
          if (s !== null && (best === null || s + pen < best)) { best = s + pen; span = sp; }
        });
        // a COMPLETION (he stopped mid-word) and a CORRECTION (he finished the
        // word and got a letter wrong) are different offers, and the ranking
        // below deliberately keeps them apart
        const comp = wn.startsWith(last) || (bare !== wn && bare.startsWith(last));
        return best === null ? null : { w, best, span, comp };
      }).filter(Boolean)
        .sort((a, b) => a.best - b.best || Math.abs(a.w.length - last.length) - Math.abs(b.w.length - last.length))
        .slice(0, 8);
      /* ONE SLOT IS ALWAYS KEPT FOR A CORRECTION. Completions score better than
         corrections by design (a word he is halfway through is usually the word
         he means), but that rule made شَقَّة unreachable: typing "shukka" offered
         شكر, شكرا, شكرًا — three completions of شك — and the word he wanted never
         appeared. So take the top three, and if they are all completions, add the
         best correction behind them. That is the case he reported. */
      const top = cands.slice(0, 3);
      if (cands.length && top.every(c => c.comp)) {
        const fix = cands.find(c => !c.comp);
        if (fix) top.push(fix);
      }
      /* IN A TEST there are no chips at all. The answer's own word is held out
         of the pool on purpose — a chip must never hand him the thing being
         marked — which means every chip that CAN appear is, by construction, a
         different word from the answer. Typing "sarir" for سَرِير offered صبر,
         سعر, صرط; tightening the threshold only changed which wrong words it
         offered (سرر, صورة, صغير), because the folds that make suggestions
         generous also make near-misses look certain. A distractor presented as
         the site's best guess is worse than silence, so in a test it says what
         is actually true instead: roughly right is accepted. */
      cands = opts && opts.strict ? [] : top;
    }
    bar.innerHTML = "";
    // Some callers hold a word back on purpose (Sentence Practice keeps the verb
    // out — it is the thing being proved). Silence there reads as "the
    // suggestions are broken", which is exactly how he reported it, so say so.
    if (!cands.length && opts && opts.heldBackNote && last.length >= 2) {
      const n = document.createElement("span");
      n.style.cssText = "font-size:12.5px;color:var(--muted);direction:ltr";
      n.textContent = opts.heldBackNote;
      bar.appendChild(n);
      return;
    }
    cands.forEach(c => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = c.w;
      b.style.cssText = "font-family:var(--font-ar);font-size:19px;border:1px solid var(--border);background:var(--card);color:var(--accent);border-radius:999px;padding:2px 14px;cursor:pointer";
      b.onmousedown = e => e.preventDefault();
      b.onclick = () => {
        parts.splice(parts.length - c.span, c.span, c.w);
        committed = parts.join(" ");
        raw = "";
        el.value = committed;
        bar.innerHTML = "";
        el.focus();
      };
      bar.appendChild(b);
    });
  };
  const render = () => { el.value = committed + latinToArabic(raw); suggest(); };
  el.addEventListener("beforeinput", e => {
    if (e.inputType === "insertText" && e.data != null) {
      e.preventDefault(); raw += e.data; render();
    } else if (e.inputType === "deleteContentBackward") {
      e.preventDefault();
      if (raw) raw = raw.slice(0, -1); else committed = committed.slice(0, -1);
      render();
    } else if (e.inputType === "insertFromPaste" && e.data != null) {
      e.preventDefault(); raw += e.data; render();
    }
    // other input types (line breaks, composition) fall through untouched
  });
  // keep the buffer in sync if code clears the field (e.g. on a new question)
  el.addEventListener("tl-reset", () => { raw = ""; committed = ""; if (bar) bar.innerHTML = ""; });
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
  ["lord", "master", "sustainer", "carer", "cherisher", "nurturer", "caretaker"],
  ["allah", "god"],
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
  ["merciful", "mercy", "compassionate", "gracious", "kind"],
  ["forgiving", "forgiver", "forgiveness", "forgive", "forgives", "forgave", "pardon"],
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
  // parentheticals in a gloss are explainer notes ("(carries the object) You",
  // "we worship (present tense)"), never the meaning itself — don't match against them
  gloss = String(gloss || "").replace(/\([^)]*\)/g, " ");
  // he may offer alternatives himself ("It was/ he was" for كان): every part
  // he offers must be right — a wrong hedge ("day/people") still fails
  const alts = typed.split(/[;,\/]|\bor\b/).map(s => s.trim()).filter(Boolean);
  if (alts.length > 1) return alts.every(a => fuzzyEn(a, gloss));
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
  if (t.some(w => g.includes(w))) return true; // shares a meaningful word (or synonym)
  // near-miss on a content word: a one-letter typo, or a shared stem (prefix)
  const words = s => s.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/[\s-]+/).filter(w => w && !_EN_STOP.has(w));
  const tw = words(typed), gw = words(gloss);
  return tw.some(w => w.length >= 4 && gw.some(x => x.length >= 4 && (editDist(w, x) <= 1 || x.startsWith(w) || w.startsWith(x))));
}

/* ---------- universal SRS card content resolver ----------
   Keys: "story-01:5", "fam-qwl:3", "qc:12", "qw:fatiha:2:1" */
async function resolveCards(keys) {
  const needStories = new Set();
  let needFams = false, needCore = false, needVerses = false, needEv = false, needGrammar = false, needPhrases = false;
  keys.forEach(k => {
    const sid = k.split(":")[0];
    if (sid === "qc") needCore = true;
    else if (sid === "qw") needVerses = true;
    else if (sid === "gt") needGrammar = true;
    else if (sid === "tw") { /* tapped-word cards resolve from local store */ }
    /* `s:` is the sentence bank and `w:` is form-based — neither is a WORD card,
       and neither is a story. Without this they fell through to the story branch
       and the page fetched data/s.json and data/w.json on every load, 404ing
       twice and silently dropping those keys. Caught in the network trace on
       2026-08-30 while checking the week briefing. */
    else if (sid === "s" || sid === "w") { /* sentence-level keys: not word cards */ }
    else if (sid.startsWith("fam-")) needFams = true;
    else if (sid.startsWith("ev-")) needEv = true;
    else if (sid.startsWith("ph-")) needPhrases = true;
    else needStories.add(sid);
  });
  const stories = {};
  const [fams, core, verses, everyday, grammar, phrases] = await Promise.all([
    needFams ? fetch("data/families.json").then(r => r.json()).then(d => d.families) : null,
    needCore ? fetch("data/quran-core.json").then(r => r.json()).then(d => d.words) : null,
    needVerses ? fetch("data/verses.json").then(r => r.json()).then(d => d.surahs) : null,
    needEv ? fetch("data/everyday.json").then(r => r.json()).then(d => d.groups) : null,
    needGrammar ? fetch("data/grammar.json").then(r => r.json()).then(d => d.patterns) : null,
    needPhrases ? fetch("data/phrases.json").then(r => r.json()).then(d => d.groups) : null,
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
    } else if (p[0] === "tw") {
      const w = store.get("ats-tapwords", {})[p.slice(1).join(":")];
      if (w) v = { ar: w.ar, en: w.en, tr: w.tr, note: w.note || "you tap this one a lot" };
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
    } else if (p[0].startsWith("ph-")) {
      const g = phrases && phrases.find(x => "ph-" + x.id === p[0]);
      const m = g && g.members[parseInt(p[1])];
      if (m) v = { ar: m.ar, en: m.en, tr: m.tr, note: "phrase: " + g.theme.split("—")[0].trim() };
    } else {
      const st = stories[p[0]];
      const w = st && st.vocab[parseInt(p[1])];
      if (w) v = { ar: w.ar, en: w.en, tr: w.tr, note: w.note };
    }
    return v ? { key: k, v } : null;
  }).filter(Boolean);
}

/* ---------- users ----------
   One site, two learners. The sync worker keeps each email's data, coach
   notes, and sessions fully separate; this map only personalizes the UI. */
const PROFILES = {
  "rkarim88@gmail.com": { name: "Reza", full: "Reza Karim", level: "standard" },
  "sabatarif.15@gmail.com": { name: "Saba", full: "Saba Khan", level: "beginner" },
};
function whoami() {
  const em = store.get("ats-email", null);
  return em && PROFILES[em] ? { email: em, ...PROFILES[em] } : null;
}

/* ---------- mnemonics (💡 memory hooks) ----------
   Optional hooks in data/mnemonics.json — only strong ones exist; most words
   have none by design. Keyed by normalized/al-stripped Arabic; first-word
   fallback covers phrases. */
let MNEM = {};
fetch("data/mnemonics.json").then(r => r.json()).then(d => { MNEM = d; }).catch(() => {});
function mnemFor(ar) {
  if (!ar) return null;
  const bare = stripTashkeel(ar).replace(/[^؀-ۿ\s]/g, "").replace(/^ال/, "").trim();
  if (MNEM[bare]) return MNEM[bare];
  const firstWord = stripTashkeel(ar.split(/\s+/)[0]).replace(/[^؀-ۿ\s]/g, "").replace(/^ال/, "").trim();
  if (MNEM[firstWord]) return MNEM[firstWord];
  const norm = normalizeAr(ar).replace(/^ال/, "");
  if (MNEM[norm]) return MNEM[norm];
  const firstNorm = normalizeAr(ar.split(/\s+/)[0]).replace(/^ال/, "");
  return MNEM[firstNorm] || null;
}
/* Put a 💡 in btnHost and a hidden full-width hook row right after tr.
   Call AFTER tr is in the DOM. No-op for words without a hook. */
function mountMnem(tr, btnHost, ar, key) {
  const mn = mnemFor(ar);
  if (!mn || !btnHost) return;
  const b = document.createElement("span");
  b.className = "mnem-btn"; b.title = "memory hook"; b.textContent = " 💡";
  btnHost.appendChild(b);
  const mrow = document.createElement("tr"); mrow.style.display = "none";
  const cell = document.createElement("td"); cell.colSpan = tr.children.length;
  const box = document.createElement("div"); box.className = "mnem-cell"; box.textContent = "💡 " + mn;
  cell.appendChild(box); mrow.appendChild(cell);
  tr.after(mrow);
  b.onclick = e => {
    e.stopPropagation();
    mrow.style.display = mrow.style.display === "none" ? "table-row" : "none";
    if (mrow.style.display !== "none") logEvent({ e: "mnem", key: key || stripTashkeel(ar) });
  };
}

/* ---------- shared bucket bar (✓ know · ↻ soon · ⏳ later · 🚫 retire) ----------
   🚫 must never look like the ✗ used for "got it wrong" on grading surfaces —
   a wrong-answer ✗ tap here would silently retire the word forever. */
function bucketSaidText(id) {
  return ({
    know: "got it — back in 30 days",
    repeat: "repeat — back in ~10 min",
    later: "much later — back in 7 days",
    never: "won't show again",
  })[id] || "saved";
}
function mountBucketBar(slot, key, onSet) {
  if (!slot) return;
  const bar = document.createElement("div");
  bar.className = "bucket-bar";
  const said = document.createElement("span");
  said.className = "bucket-said";
  const current = bucketOf(key);
  const marked = getSrs()[key] && getSrs()[key].b;
  BUCKETS.forEach(b => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = b.label;
    btn.title = b.name;
    if (b.id === current && marked) btn.classList.add("sel", b.id === "never" ? "never" : "x");
    btn.onclick = () => {
      setBucket(key, b.id);
      logEvent({ e: "bucket", key, b: b.id });
      [...bar.children].forEach(c => c.classList.remove("sel", "never"));
      btn.classList.add("sel");
      if (b.id === "never") btn.classList.add("never");
      // say what just happened — a silent save reads as a broken button
      said.textContent = bucketSaidText(b.id);
      said.classList.toggle("never", b.id === "never");
      if (onSet) onSet(b.id);
    };
    bar.appendChild(btn);
  });
  slot.innerHTML = "";
  slot.appendChild(bar);
  slot.appendChild(said);
}

/* ---------- page word-key registry ----------
   A page whose words already have proper SRS cards (story vocab, clusters)
   registers norm → key here, so ＋Learn and the 3-tap seed land on the card
   the curriculum and the homework contract count — not a parallel tw: twin.
   Registering also repairs twins made before the mapping existed: the twin's
   state moves onto the proper key and the twin is dropped. Idempotent and
   re-run on every page load, so a twin resurrected by a stale device's sync
   is cleaned again on the next visit. */
let _pageWordKeys = null;
/* exact norm first; else fold a feminine ة onto its lemma (واسعة → واسع) —
   only as a fallback, so a distinct ة-word with its own card still wins */
function _wordKeyFor(norm) {
  if (!_pageWordKeys || !norm) return null;
  return _pageWordKeys[norm] || (norm.endsWith("ة") ? _pageWordKeys[norm.slice(0, -1)] : null) || null;
}
function registerWordKeys(map) {
  _pageWordKeys = map;
  const srs = getSrs();
  let fixed = 0;
  for (const id of Object.keys(srs)) {
    if (!id.startsWith("tw:")) continue;
    const key = _wordKeyFor(id.slice(3));
    if (!key) continue;
    const twin = srs[id];
    const own = srs[key];
    if (!own) srs[key] = { ...twin, u: Date.now() };
    else if ((twin.box || 0) > (own.box || 0)) { own.box = twin.box; own.u = Date.now(); }
    delete srs[id];
    fixed++;
  }
  if (fixed) {
    store.set("ats-srs", srs);
    logEvent({ e: "tw-adopt", n: fixed });
  }
}
function pageWordKey(disp) {
  return _wordKeyFor(normalizeAr(String(disp)).replace(/^ال/, ""));
}

/* ---------- tap-to-review ----------
   A word you keep tapping for help is a word you don't know. On the 3rd tap
   it quietly joins the review deck: qw/story keys resolve normally; free
   words get a tw:<norm> card whose content lives in ats-tapwords (synced). */
function noteWordTap(opts) {
  const norm = opts.norm || (opts.content && opts.content.ar ? normalizeAr(opts.content.ar).replace(/^ال/, "") : null);
  const id = opts.key || _wordKeyFor(norm) || (norm ? "tw:" + norm : null);
  if (!id) return;
  const counts = store.get("ats-tapcounts", {});
  counts[id] = (counts[id] || 0) + 1;
  store.set("ats-tapcounts", counts);
  if (counts[id] < 3) return;
  const srs = getSrs();
  if (srs[id]) return; // already in the deck
  if (id.startsWith("tw:")) {
    if (!opts.content || !opts.content.en) return; // no known meaning — no useful card
    const words = store.get("ats-tapwords", {});
    words[norm] = { ar: opts.content.ar, en: opts.content.en, tr: opts.content.tr || "", note: opts.content.note || "you tap this one a lot" };
    store.set("ats-tapwords", words);
  }
  srs[id] = { box: 0, due: Date.now() }; // due now → appears in the next Review
  store.set("ats-srs", srs);
  logEvent({ e: "tapseed", key: id });
}

/* ---------- tap any word → meaning + Learn ----------
   One global handler for the whole site: tap/click any Arabic word and a small
   popover shows its meaning (from data/lexicon.json — every gloss the site
   teaches), a 🔊, and "＋ Learn" which puts it straight into the Review deck.
   Inside an active test (an enabled answer box in the same row, or an area
   marked data-nopeek) the meaning stays hidden — no free answers.
   Elements can carry data-qkey="qw:…" so Learn seeds their proper SRS card
   instead of a generic tapped-word card. */
let _lex = null, _lexLoading = null;
function loadLexicon() {
  if (_lex) return Promise.resolve(_lex);
  _lexLoading = _lexLoading || fetch("data/lexicon.json").then(r => r.json()).then(d => (_lex = d)).catch(() => (_lex = {}));
  return _lexLoading;
}
function lexLookup(word) {
  if (!_lex) return null;
  const bare = stripTashkeel(word).replace(/[^؀-ۿ\s]/g, "").trim();
  if (_lex[bare]) return _lex[bare];
  if (_lex[bare.replace(/^ال/, "")]) return _lex[bare.replace(/^ال/, "")];
  const n = normalizeAr(word);
  return _lex[n] || _lex[n.replace(/^ال/, "")] || null;
}
/* Root families travel WITH words (his call, 2026-07-19 — no separate Roots
   destination): every family member is indexed by its normalized form, and
   the tap popover shows the whole family under any of its words. */
let _famIdx = null, _famIdxLoading = null;
function loadFamIdx() {
  if (_famIdx || _famIdxLoading) return _famIdxLoading || Promise.resolve();
  _famIdxLoading = fetch("data/families.json").then(r => r.json()).then(d => {
    _famIdx = {};
    d.families.forEach(f => f.members.forEach(m => {
      const n = normalizeAr(m.ar).replace(/^ال/, "");
      if (n && !_famIdx[n]) _famIdx[n] = f;
    }));
  }).catch(() => (_famIdx = {}));
  return _famIdxLoading;
}
function famLookup(word) {
  if (!_famIdx) return null;
  const n = normalizeAr(word);
  return _famIdx[n] || _famIdx[n.replace(/^ال/, "")] || null;
}
/* Conjugation tables travel with words too (his 2026-07-21 note: every word
   should show "conjugation and present and past form"): conjugations.json
   indexes EVERY past/present form — plus the سـ future and و/ف-prefixed
   Quranic forms (وَقَالُوا، فَقَالَ) — so tapping any of them anywhere on the
   site finds the verb and the popover offers the full table. */
let _conj = null, _conjIdx = null, _conjLoading = null;
function loadConj() {
  if (_conjIdx || _conjLoading) return _conjLoading || Promise.resolve();
  _conjLoading = fetch("data/conjugations.json").then(r => r.json()).then(d => {
    _conj = d;
    _conjIdx = {};
    const putc = (n, hit) => { if (n && !_conjIdx[n]) _conjIdx[n] = hit; };
    d.verbs.forEach(v => d.persons.forEach(p => {
      putc(normalizeAr(v.past[p.key]), { v, person: p, tense: "past" });
      const pn = normalizeAr(v.pres[p.key]);
      putc(pn, { v, person: p, tense: "pres" });
      putc("س" + pn, { v, person: p, tense: "fut" });
    }));
  }).catch(() => (_conjIdx = {}));
  return _conjLoading;
}
function conjLookup(word) {
  if (!_conjIdx) return null;
  const n = normalizeAr(word);
  return _conjIdx[n] || _conjIdx[n.replace(/^[وف]/, "")] || null;
}
/* The un-vowelled skeleton is ambiguous: كتب is both كَتَبَ "he wrote" and كُتُب
   "books". That is fine for a tap (you tapped that exact word), but NOT for
   labelling a whole row as a verb — so the vocab strips demand the vowels match. */
function conjLookupStrict(word) {
  const hit = conjLookup(word);
  if (!hit) return null;
  // Vowels must match EXACTLY, final one included. Tempting as it is to forgive a
  // missing final harakah (فَهِمْت for فَهِمْتُ), it can't be done safely: ذَهَب
  // "gold" is then indistinguishable from ذَهَبَ "he went", and labelling a noun
  // as a verb is worse than missing a strip. Tapping the word still finds it.
  const bare = s => String(s).replace(/[ـ\s]/g, "");
  const w = bare(word);
  const forms = [];
  for (const p of (_conj ? _conj.persons : [])) { forms.push(hit.v.past[p.key], hit.v.pres[p.key]); }
  return forms.some(f => bare(f) === w) ? hit : null;
}
/* Verbs earn a visible line in the vocab tables, not just a popover you have to
   know to tap (his 2026-08-05 note: "i still dont see words with conjugations
   and present past future ... should be encouraged"). Past · present · future
   sit in the open; the eight persons are one tap away. */
/* His 2026-08-07 asks, all in one place: readable headings, transliteration on
   every form ("this is something i struggle with"), and BOLD the persons worth
   internalising first — the rest stay visible but dimmed. */
const CONJ_FOCUS = ["huwa", "ana", "anta", "hiya", "nahnu", "hum"];
function conjStripHTML(hit, opts) {
  const v = hit.v, noEn = !!(opts && opts.noEn); // noEn: the row is a test — don't leak the meaning
  const ar = s => `<span class="arabic" dir="rtl" style="font-size:16px;color:var(--ink)">${s}</span>`;
  const cell = s => `${ar(s)}<div class="conj-tr">${translitAr(s)}</div>`;
  return `<div class="conj-strip">
    <span class="conj-line">🔁 <b>past</b> ${ar(v.past3)} <i class="conj-tr-inline">${translitAr(v.past3)}</i> · <b>present</b> ${ar(v.pres3)} <i class="conj-tr-inline">${translitAr(v.pres3)}</i> · <b>future</b> ${ar("سَ" + v.pres3)} <i class="conj-tr-inline">sa-${translitAr(v.pres3)}</i></span>
    <a href="#" class="conj-more">all 8 persons ▾</a>
    <div class="conj-table" style="display:none">
      <table>
        <thead><tr><th></th><th>past</th><th>present</th></tr></thead>
        <tbody>${(_conj ? _conj.persons : []).map(p => {
          const cls = [p.key === (hit.person && hit.person.key) ? "me" : "", CONJ_FOCUS.includes(p.key) ? "focus" : "dim"].filter(Boolean).join(" ");
          return `<tr${cls ? ` class="${cls}"` : ""}>
          <td>${p.en}</td>
          <td>${cell(v.past[p.key])}</td>
          <td>${cell(v.pres[p.key])}</td></tr>`;
        }).join("")}</tbody>
      </table>
      <div class="conj-fut">future = ${ar("سَـ")} + present — ${ar("سَ" + v.pres.ana)} <i class="conj-tr-inline">sa-${translitAr(v.pres.ana)}</i>${noEn ? "" : ` “I will ${v.base}”`}</div>
      <div class="conj-pattern">the pattern — <b>past</b> = verb + ending: ‑a <i>he</i> · ‑tu <i>I</i> · ‑ta <i>you</i> · ‑at <i>she</i> · ‑nā <i>we</i> · ‑ū <i>they</i> &nbsp; <b>present</b> = prefix + verb: ya‑ <i>he</i> · a‑ <i>I</i> · ta‑ <i>you</i> · ta‑ <i>she</i> · na‑ <i>we</i> · ya‑…‑ūna <i>they</i>. Ordered by frequency — the top rows matter most.</div>
    </div>
  </div>`;
}
/* Build the strip row under one table row. Shared by both mounts below. */
function attachConjRow(tr, hit, colSpan, opts) {
  if (!tr || tr.dataset.conjDone) return null;
  tr.dataset.conjDone = "1";
  const row = document.createElement("tr");
  row.className = "conj-row";
  const td = document.createElement("td");
  td.colSpan = colSpan || 5;
  td.innerHTML = conjStripHTML(hit, opts);
  row.appendChild(td);
  tr.after(row);
  const more = td.querySelector(".conj-more"), tbl = td.querySelector(".conj-table");
  more.onclick = e => {
    e.preventDefault();
    e.stopPropagation(); // review rows reveal their English on row-click — don't trigger that
    const open = tbl.style.display !== "none";
    tbl.style.display = open ? "none" : "block";
    more.textContent = open ? "all 8 persons ▾" : "hide ▴";
    if (!open) logEvent({ e: "conj-open", verb: hit.v.id, from: (opts && opts.from) || "table" });
  };
  return row;
}
/* Attach the strip to one row whose Arabic isn't in the DOM (Ears/Write rows hide
   it — it's the answer) or is a phrase rather than the target word. */
function mountConjFor(tr, word, colSpan, opts) {
  if (!tr || !word) return Promise.resolve();
  return loadConj().then(() => {
    const hit = conjLookupStrict(word);
    if (hit) attachConjRow(tr, hit, colSpan, opts);
  });
}
/* Attach the strip to every row of a vocab table whose Arabic is a known verb.
   Called after the table is built; loads the conjugation index on demand. */
function mountConjRows(tbody, colSpan, opts) {
  if (!tbody) return Promise.resolve();
  return loadConj().then(() => {
    [...tbody.querySelectorAll("tr")].forEach(tr => {
      if (tr.dataset.conjDone) return;
      const arCell = tr.querySelector(".ar-cell");
      if (!arCell) return;
      const word = (arCell.textContent || "").trim().split(/\s+/)[0];
      const hit = word && conjLookupStrict(word);
      if (hit) attachConjRow(tr, hit, colSpan, opts);
    });
  });
}
const _AR_CH = /[؀-ۿ]/;
function wordAtPoint(x, y) {
  let node = null, off = 0;
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; off = r.startOffset; }
  } else if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; off = p.offset; }
  }
  if (!node || node.nodeType !== 3) return null;
  const text = node.textContent;
  let a = off, b = off;
  while (a > 0 && _AR_CH.test(text[a - 1])) a--;
  while (b < text.length && _AR_CH.test(text[b])) b++;
  const w = text.slice(a, b).trim();
  if (!_AR_CH.test(w) || a === b) return null;

  try {
    const range = document.createRange();
    range.setStart(node, a);
    range.setEnd(node, b);
    const rects = range.getClientRects();
    const pad = 4;
    let hit = false;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
        hit = true;
        break;
      }
    }
    if (!hit) return null;
  } catch (_) {
    return null;
  }

  return w;
}
let _wordPop = null;
function closeWordPop() { if (_wordPop) { _wordPop.remove(); _wordPop = null; } }
/* "he ___s" label for a verb base: go→goes, be→is, seek help→seeks help */
function en3sg(base) {
  if (base === "be") return "is";
  return String(base).replace(/^(\S+)/, w => /(o|ch|sh|ss|x|z)$/.test(w) ? w + "es" : w + "s");
}
function showWordPop(word, x, y, o) {
  closeWordPop();
  const hit = o.hit;
  const disp = hit ? hit[0] : word;
  const properKey = o.qkey || pageWordKey(disp);
  const already = !!getSrs()[properKey || ("tw:" + normalizeAr(disp).replace(/^ال/, ""))];
  const canLearn = properKey || hit;
  const pop = document.createElement("div");
  pop.id = "wordPop";
  pop.style.cssText = "position:fixed;z-index:95;background:var(--card,#fff);color:var(--ink,#222);border:1px solid var(--border,#ddd);border-radius:14px;padding:12px 16px;box-shadow:0 8px 28px rgba(0,0,0,.18);max-width:250px;font-family:var(--font-ui,sans-serif);font-size:14px;text-align:center";
  pop.innerHTML = `
    <div class="arabic" dir="rtl" style="font-size:26px;line-height:1.6">${disp}</div>
    ${hit && hit[1] ? `<div style="color:var(--muted,#888);font-style:italic;font-size:12.5px">${hit[1]}</div>` : ""}
    ${o.hideMeaning
      ? `<div style="color:var(--muted,#888);font-size:12.5px;margin-top:4px">meaning hidden — you're mid-test 🤫</div>`
      : hit ? `<div style="font-weight:600;margin-top:4px">${hit[2]}</div>`
            : `<div style="color:var(--muted,#888);font-size:12.5px;margin-top:4px">not in the site's word lists yet</div>`}
    ${!o.hideMeaning && o.mnem ? `<div style="border-top:1px dashed var(--border,#ddd);margin-top:8px;padding-top:7px;font-size:12.5px;color:var(--muted,#888);text-align:left">💡 ${o.mnem}</div>` : ""}
    ${!o.hideMeaning && o.fam ? `<div style="border-top:1px dashed var(--border,#ddd);margin-top:8px;padding-top:7px;font-size:12.5px;color:var(--muted,#888)">
      🌿 root <b dir="rtl" class="arabic" style="font-size:14px">${o.fam.root.split("(")[0].trim()}</b> —
      ${o.fam.members.slice(0, 5).map(m => `<span style="white-space:nowrap"><span class="arabic" dir="rtl" style="font-size:16px;color:var(--ink,#222)">${m.ar}</span> <span style="font-size:11.5px">${m.en}</span></span>`).join(" · ")}
      <a href="vocab.html?fam=${o.fam.id}" style="color:var(--accent,#0d7a5f);display:inline-block">study the family →</a></div>` : ""}
    ${!o.hideMeaning && o.conj ? `<div style="border-top:1px dashed var(--border,#ddd);margin-top:8px;padding-top:7px;font-size:12.5px;color:var(--muted,#888)">
      🔁 <span class="arabic" dir="rtl" style="font-size:16px;color:var(--ink,#222)">${o.conj.v.past3}</span> ${o.conj.v.pastEn} ·
      <span class="arabic" dir="rtl" style="font-size:16px;color:var(--ink,#222)">${o.conj.v.pres3}</span> ${en3sg(o.conj.v.base)} —
      this form: <b>${o.conj.person.en} + ${({ past: "past", pres: "present", fut: "future" })[o.conj.tense]}</b>
      <a href="#" class="wp-conj" style="color:var(--accent,#0d7a5f);display:inline-block">full table ▾</a>
      <div class="wp-conjtable" style="display:none;max-height:38vh;overflow-y:auto;margin-top:6px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <tr style="color:var(--muted,#888)"><td style="padding:2px 4px"></td><td style="padding:2px 4px;text-align:center">past</td><td style="padding:2px 4px;text-align:center">present</td></tr>
          ${(_conj ? _conj.persons : []).map(p => `<tr style="border-top:1px solid var(--border,#eee)${p.key === o.conj.person.key ? ";background:rgba(13,122,95,.08)" : ""}">
            <td style="padding:3px 4px;white-space:nowrap"><span class="arabic" dir="rtl" style="font-size:14px;color:var(--ink,#222)">${p.ar}</span> <span style="font-size:10.5px">${p.en}</span></td>
            <td class="arabic" dir="rtl" style="padding:3px 4px;font-size:16px;color:var(--ink,#222);text-align:center">${o.conj.v.past[p.key]}</td>
            <td class="arabic" dir="rtl" style="padding:3px 4px;font-size:16px;color:var(--ink,#222);text-align:center">${o.conj.v.pres[p.key]}</td>
          </tr>`).join("")}
        </table>
        <div style="margin-top:4px;font-size:11.5px">future = <span class="arabic" dir="rtl" style="font-size:14px;color:var(--ink,#222)">سَـ</span> + present — <span class="arabic" dir="rtl" style="font-size:14px;color:var(--ink,#222)">سَ${o.conj.v.pres.ana}</span> I will ${o.conj.v.base}</div>
      </div></div>` : ""}
    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
      <button type="button" class="wp-say" style="border:1px solid var(--border,#ddd);background:transparent;border-radius:10px;padding:6px 12px;cursor:pointer;font-size:15px">🔊</button>
      ${canLearn ? `<button type="button" class="wp-learn" ${already ? "disabled" : ""} style="border:none;background:var(--accent,#0d7a5f);color:#fff;border-radius:10px;padding:6px 14px;cursor:pointer;font-weight:600">${already ? "✓ in your deck" : "＋ Learn"}</button>` : ""}
    </div>`;
  document.body.appendChild(pop);
  const place = () => {
    const r = pop.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(x - r.width / 2, innerWidth - r.width - 8)) + "px";
    pop.style.top = Math.max(8, y + 16 + r.height > innerHeight ? y - r.height - 12 : y + 16) + "px";
  };
  place();
  pop.querySelector(".wp-say").onclick = () => speak(disp, 0.75);
  const cj = pop.querySelector(".wp-conj");
  if (cj) cj.onclick = e => {
    e.preventDefault();
    const t = pop.querySelector(".wp-conjtable");
    const open = t.style.display !== "none";
    t.style.display = open ? "none" : "block";
    cj.textContent = open ? "full table ▾" : "hide table ▴";
    place();
    if (!open) logEvent({ e: "conj-open", verb: o.conj.v.id, form: normalizeAr(disp) });
  };
  const lb = pop.querySelector(".wp-learn");
  if (lb && !already) lb.onclick = () => {
    const srs = getSrs();
    let id = properKey;
    if (!id) {
      const norm = normalizeAr(disp).replace(/^ال/, "");
      id = "tw:" + norm;
      const words = store.get("ats-tapwords", {});
      if (!words[norm]) {
        words[norm] = { ar: disp, en: hit[2], tr: hit[1] || "", note: "you chose to learn this" };
        store.set("ats-tapwords", words);
      }
    }
    if (!srs[id]) { srs[id] = { box: 0, due: Date.now() }; store.set("ats-srs", srs); }
    logEvent({ e: "tap-learn", key: id });
    lb.textContent = "✓ in your Review deck";
    lb.disabled = true;
  };
  _wordPop = pop;
}
function initWordTap() {
  if (document.body.dataset.wordtap) return;
  document.body.dataset.wordtap = "1";
  document.addEventListener("click", async e => {
    if (e.target.closest("#wordPop")) return;
    if (e.target.closest("input,textarea,select,button,a,label,[contenteditable],nav,#notePen,#noteOverlay")) { closeWordPop(); return; }
    const word = wordAtPoint(e.clientX, e.clientY);
    if (!word) { closeWordPop(); return; }
    await Promise.all([loadLexicon(), loadFamIdx(), loadConj()]);
    const hit = lexLookup(word);
    const fam = famLookup(word);
    const conj = conjLookup(word);
    const mnem = mnemFor(word);
    const row = e.target.closest("tr");
    const tested = e.target.closest("[data-nopeek]") || (row && row.querySelector("input:not([disabled])"));
    const qEl = e.target.closest("[data-qkey]");
    showWordPop(word, e.clientX, e.clientY, { hit, fam, conj, mnem, hideMeaning: !!tested, qkey: qEl && qEl.dataset.qkey });
    logEvent({ e: "wtap", ar: normalizeAr(word), hit: !!hit, ...(conj ? { conj: conj.v.id } : {}), ...(tested ? { hidden: true } : {}) });
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeWordPop(); });
  window.addEventListener("scroll", closeWordPop, { passive: true });
}

/* ---------- ✏️ note to coach: floating pen on every page ----------
   Open format — the learner writes anything; the note carries where they
   were (page, headings, any selected text). Saved as a `note` log event,
   synced with everything else; the nightly coach reads and answers via the
   dashboard notes. */
/* A phone photo is 1-3MB — far too big to ride inside the log blob, which is
   rewritten on every sync. Shrink to something readable-but-small first, then
   the upload stores it under its own key and the note keeps just the id. */
function shrinkImage(file, maxPx = 1400, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? resolve(b) : reject(new Error("encode-failed")), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode-failed")); };
    img.src = url;
  });
}

async function uploadNoteImage(blob) {
  const r = await wReq("/image", { method: "POST", body: blob, headers: { "Content-Type": "image/jpeg" } });
  if (!r.ok) throw new Error("upload-" + r.status);
  const j = await r.json();
  if (!j.id) throw new Error("no-id");
  return j.id;
}

function mountNotePen() {
  if (document.getElementById("notePen")) return;
  const btn = document.createElement("button");
  btn.id = "notePen"; btn.type = "button"; btn.title = "Write a note to your coach"; btn.textContent = "✏️";
  document.body.appendChild(btn);
  btn.onclick = () => {
    if (document.getElementById("noteOverlay")) return;
    const who = whoami();
    // capture context BEFORE the overlay steals focus/selection
    const h = document.querySelector("main h1, main h2");
    const ctx = {
      url: location.pathname.split("/").pop() + location.search,
      title: h ? h.textContent.trim().slice(0, 80) : document.title.slice(0, 80),
      view: [...document.querySelectorAll("main h2")].slice(0, 3).map(x => x.textContent.trim().slice(0, 60)),
      sel: (window.getSelection() + "").trim().slice(0, 160) || undefined,
    };
    const recent = store.get("ats-log", []).filter(x => x.e === "note").slice(-2);
    // photos travel through the sync Worker, so they need a Worker session
    const canPhoto = typeof syncMethod === "function" && syncMethod() === "google";
    const MAX_SHOTS = 6;
    const ov = document.createElement("div");
    ov.id = "noteOverlay";
    ov.innerHTML = `
      <div class="note-box">
        <h3 style="margin:0 0 4px">✏️ Note to your coach</h3>
        <p style="font-size:12.5px;color:var(--muted);margin:0 0 8px">Anything at all — “this confused me”, “too hard”, “more like this”. Your coach reads these nightly, sees exactly what you were looking at, and replies in the dashboard notes.</p>
        <textarea id="noteText" rows="4" placeholder="${who ? `What's on your mind, ${who.name}?` : "What's on your mind?"}"></textarea>
        ${canPhoto ? `
        <div id="noteShots" class="note-shots"></div>
        <div class="ex-row" style="margin-top:8px;align-items:center">
          <button class="small" id="notePhoto" type="button">📷 Add a photo</button>
          <span style="font-size:12px;color:var(--muted)">or paste / drag one in — a lesson page, a worksheet, anything</span>
        </div>
        <input type="file" id="noteFile" accept="image/*" multiple style="display:none">` : ""}
        <div class="ex-row" style="margin-top:8px">
          <button class="primary" id="noteSave" type="button">Send to coach</button>
          <button class="small" id="noteCancel" type="button">Cancel</button>
        </div>
        <div id="noteErr" style="margin-top:8px;font-size:12.5px;color:var(--red)"></div>
        ${recent.length ? `<div style="margin-top:10px;font-size:12px;color:var(--muted)">Recent: ${recent.map(n => `“${(n.text || "").slice(0, 48)}”${n.imgs ? " 📷" : ""} ✓`).join(" · ")}</div>` : ""}
      </div>`;
    document.body.appendChild(ov);
    const box = ov.querySelector(".note-box");
    const errEl = document.getElementById("noteErr");
    const shots = [];
    const closeOv = () => { shots.forEach(s => URL.revokeObjectURL(s.url)); ov.remove(); };

    const renderShots = () => {
      const el = document.getElementById("noteShots");
      if (!el) return;
      el.innerHTML = shots.map((s, i) =>
        `<span class="note-shot"><img src="${s.url}" alt="attached photo ${i + 1}"><button type="button" class="shot-x" data-i="${i}" title="Remove">×</button></span>`).join("");
      el.querySelectorAll(".shot-x").forEach(b => {
        b.onclick = () => { const i = +b.dataset.i; URL.revokeObjectURL(shots[i].url); shots.splice(i, 1); renderShots(); };
      });
    };
    /* Shrinking a phone photo takes a moment. Send must WAIT for it, or a note
       sent quickly after dropping would silently arrive without the picture. */
    let queued = 0, shotQueue = Promise.resolve();
    const setBusy = on => {
      const b = document.getElementById("noteSave");
      if (!b) return;
      b.disabled = on;
      b.textContent = on ? "Preparing photo…" : "Send to coach";
    };
    const addFiles = files => {
      const pics = [...files].filter(f => f && /^image\//.test(f.type))
        .slice(0, Math.max(0, MAX_SHOTS - shots.length - queued));
      if (!pics.length) return;
      errEl.textContent = "";
      queued += pics.length;
      setBusy(true);
      shotQueue = shotQueue.then(async () => {
        for (const f of pics) {
          try { const blob = await shrinkImage(f); shots.push({ blob, url: URL.createObjectURL(blob) }); }
          catch (e) { errEl.textContent = "One of those images couldn't be read — try another."; }
          queued--;
        }
        renderShots();
        if (queued === 0) setBusy(false);
      });
    };

    if (canPhoto) {
      const fileInput = document.getElementById("noteFile");
      document.getElementById("notePhoto").onclick = () => fileInput.click();
      fileInput.onchange = () => { addFiles(fileInput.files); fileInput.value = ""; };
      document.getElementById("noteText").addEventListener("paste", e => {
        const pics = [...((e.clipboardData && e.clipboardData.items) || [])]
          .filter(i => i.type && i.type.startsWith("image/")).map(i => i.getAsFile()).filter(Boolean);
        if (!pics.length) return;
        e.preventDefault();
        addFiles(pics);
      });
      box.addEventListener("dragover", e => { e.preventDefault(); box.classList.add("drag"); });
      box.addEventListener("dragleave", e => { if (e.target === box) box.classList.remove("drag"); });
      box.addEventListener("drop", e => { e.preventDefault(); box.classList.remove("drag"); addFiles(e.dataTransfer.files); });
    }

    ov.onclick = e => { if (e.target === ov) closeOv(); };
    document.getElementById("noteCancel").onclick = closeOv;
    document.getElementById("noteText").focus();
    document.getElementById("noteSave").onclick = async () => {
      await shotQueue; // a photo still being prepared must never be left behind
      const text = document.getElementById("noteText").value.trim();
      if (!text && !shots.length) return;
      const saveBtn = document.getElementById("noteSave");
      const imgs = [];
      if (shots.length) {
        // upload BEFORE logging, so a failure can never leave a note pointing at nothing
        saveBtn.disabled = true;
        saveBtn.textContent = shots.length > 1 ? `Sending ${shots.length} photos…` : "Sending photo…";
        errEl.textContent = "";
        try { for (const s of shots) imgs.push(await uploadNoteImage(s.blob)); }
        catch (err) {
          saveBtn.disabled = false; saveBtn.textContent = "Send to coach";
          errEl.textContent = "The photo didn't upload — check your connection and press send again. Nothing you typed is lost.";
          return;
        }
      }
      logEvent({ e: "note", text: text.slice(0, 2000), ctx, user: who ? who.name : undefined, ...(imgs.length ? { imgs } : {}) });
      box.innerHTML = `<p style="font-size:15px;margin:0">✓ Saved${who ? ", " + who.name : ""}${imgs.length ? ` — photo${imgs.length > 1 ? "s" : ""} sent too` : ""}. Your coach will read it tonight and reply in your dashboard notes.</p>`;
      setTimeout(closeOv, 2000);
      if (typeof autoSync === "function") setTimeout(autoSync, 50);
    };
  };
}

/* ---------- offline (PWA) ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* http or unsupported — site works without it */ });
}
