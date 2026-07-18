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
  { id: "never", label: "🚫", name: "retire — never show this word again", days: null, box: 5 },
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
/* Arabic answer match — forgiving. normalizeAr already folds tashkeel and the
   أإآ/ى variants; here we also forgive the ة/ه and hamza-seat confusions that
   learners make, and a single slip in longer words. Accepts either half of a
   "X / Y" pair. */
function arMatch(typed, target) {
  const t = normalizeAr(typed);
  if (!t) return false;
  const cands = [target, ...target.split("/")].map(normalizeAr).filter(Boolean);
  if (cands.includes(t)) return true;
  const fold = s => s.replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء");
  const tf = fold(t), tfns = tf.replace(/ /g, "");
  return cands.some(c => {
    const cf = fold(c);
    if (cf === tf || cf.replace(/ /g, "") === tfns) return true; // exact, or same but for spacing
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
  if (/[A-Za-z]/.test(typed)) {
    const conv = latinToArabic(typed);
    if (conv && conv !== typed && arMatch(conv, targetAr)) return { ok: true, rom: true };
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
  const fold = s => normalizeAr(String(s)).replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء");
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
  const tWords = t.split(" "), cWords = c.split(" ");
  if (!innerSlip(tWords[0], fold(verbForm || cWords[0]))) return { ok: false, rom };
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
  const fold = s => strict(s)
    .replace(/[ءؤئ]/g, "")
    .replace(/ة/g, "ه").replace(/ح/g, "ه")
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
    const as = stripAl(a), bs = stripAl(b);
    for (const [x, y] of [[a, b], [as, bs], [a, bs], [as, b]]) {
      if (x === y) return 1;
      // an untyped trailing long vowel ("fi" → ف vs في) is romanization, not a different word
      const [sh, lo] = x.length < y.length ? [x, y] : [y, x];
      if (lo.length - sh.length === 1 && lo.startsWith(sh) && /[اويى]$/.test(lo)) return 1;
      const len = Math.max(x.length, y.length);
      if (len >= 4 && editDist(x, y, 2) <= (len >= 6 ? 2 : 1)) return 1;
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
  const right = hits.filter(h => h !== "miss").length;
  const phon = hits.some(h => h === "phon");
  return { ok: right === m && n === m, phon, hits, words, right, total: m };
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
    desc: "Listen, recall the meaning in the gap, hear the answer. Your weak words + Qur'an rests. Perfect on the move.",
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
  // includes the Quranic annotation range (U+06D6-U+06ED: waqf signs, small
  // sukun, small madda...) so Uthmani mushaf text normalizes like plain text
  return s.replace(/[ً-ٰـۖ-ۭ]/g, "");
}
function normalizeAr(s) {
  return stripTashkeel(s)
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^؀-ۿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
function loadAudioManifest() {
  if (_audioMan || _audioManLoading) return;
  _audioManLoading = fetch("data/audio-manifest.json").then(r => r.json())
    .then(d => (_audioMan = d)).catch(() => (_audioMan = { ar: {}, en: {} }));
}
loadAudioManifest();
function _audioFileFor(text) {
  if (!_audioMan) return null;
  const isAr = /[؀-ۿ]/.test(text);
  const key = isAr ? normalizeAr(text) : String(text).trim().toLowerCase().replace(/\s+/g, " ");
  const name = (_audioMan[isAr ? "ar" : "en"] || {})[key];
  return name ? `audio/${isAr ? "ar" : "en"}/${name}.mp3` : null;
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
function speak(text, rate, onend) {
  stopSpeak();
  const file = _audioFileFor(text);
  if (file) {
    const a = _getSpeakEl();
    // clips are generated slightly slow already; don't slow them twice
    const pr = Math.min(1.15, Math.max(0.8, (rate || 0.85) + 0.2));
    let done = false;
    const fin = ok => { if (done) return; done = true; a.onended = null; a.onerror = null; if (!ok) _speakTts(text, rate, onend); else if (onend) onend(); };
    a.onended = () => fin(true);
    a.onerror = () => fin(false);
    a.src = file;
    a.playbackRate = pr;
    const p = a.play();
    if (p && p.then) p.then(() => { a.playbackRate = pr; if (onend) setTimeout(() => fin(true), 20000); }).catch(() => fin(false));
    return;
  }
  _speakTts(text, rate, onend);
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
  u.rate = rate || 0.85;
  if (onend) u.onend = onend;
  speechSynthesis.speak(u);
}
function stopSpeak() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (_speakEl) { try { _speakEl.onended = null; _speakEl.onerror = null; _speakEl.pause(); } catch (e) {} }
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
    a.onended = () => { i++; next(); };
    a.onerror = () => { _recAudio = null; if (onDone) onDone("audio-failed"); };
    a.play().catch(() => { _recAudio = null; if (onDone) onDone("blocked"); });
  };
  next();
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
    // any leftover hyphen is a silent joiner in romanized Arabic, not a kashida
    .replace(/-/g, "");
}
/* Doubled consonant = shadda: "sayyara" → سيّارة, "rabb" → ربّ — the way he'd
   naturally romanize it. Only a token whose output is one Arabic consonant
   triggers it; long-vowel digraphs (aa/ee/oo…) match as their own tokens first
   and ا is excluded, so vowels never double. '*' still works as explicit shadda.
   A word-initial a/i/u/e/o becomes ا — no Arabic word starts with a bare vowel
   mark, and it makes "al..." produce the definite article ال as he'd expect. */
function latinToArabic(text) {
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
        if (atStart && /^[aiueo]$/.test(part)) out += "ا";
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
function renderNav(active) {
  const due = dueCards().length;
  const el = document.createElement("nav");
  el.innerHTML = `
    <a class="brand" href="index.html"><span class="ar">العربية بالقصص</span><span>Arabic Through Stories</span></a>
    <span class="spacer"></span>
    <a class="link ${active === "stories" ? "active" : ""}" href="index.html">Stories</a>
    <a class="link ${active === "vocab" ? "active" : ""}" href="vocab.html">Vocab</a>
    <a class="link ${active === "lessons" ? "active" : ""}" href="vocab.html?view=lessons">Lessons</a>
    <a class="link ${active === "quran" ? "active" : ""}" href="quran.html">Quran</a>
    <a class="link ${active === "grammar" ? "active" : ""}" href="grammar.html">Grammar</a>
    <a class="link ${active === "sentences" ? "active" : ""}" href="sentences.html">Sentences</a>
    <a class="link ${active === "audio" ? "active" : ""}" href="audio.html">🎧 Audio</a>
    <a class="link ${active === "speaking" ? "active" : ""}" href="speaking.html">Speak</a>
    <a class="link ${active === "converse" ? "active" : ""}" href="converse.html">Converse</a>
    <a class="link ${active === "review" ? "active" : ""}" href="review.html">Review${due ? `<span class="badge">${due}</span>` : ""}</a>
    <a class="link ${active === "keyboard" ? "active" : ""}" href="keyboard.html">Keyboard</a>
  `;
  document.body.prepend(el);
  mountNotePen();
  initWordTap();
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
  const foldW = w => normalizeAr(String(w)).replace(/ة/g, "ه").replace(/[ؤئ]/g, "ء");
  const suggest = () => {
    if (!lex.length) return;
    if (!bar) {
      bar = document.createElement("div");
      bar.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;direction:rtl;min-height:0";
      el.insertAdjacentElement("afterend", bar);
    }
    const parts = el.value.split(" ");
    const last = foldW(parts[parts.length - 1]);
    let cands = [];
    if (last.length >= 2) {
      cands = lex.filter(w => {
        const wn = foldW(w);
        if (!wn || wn === last) return false;
        return wn.startsWith(last) || (last.length >= 3 && editDist(wn, last, 2) <= (wn.length >= 6 ? 2 : 1));
      }).slice(0, 3);
    }
    bar.innerHTML = "";
    cands.forEach(w => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = w;
      b.style.cssText = "font-family:var(--font-ar);font-size:19px;border:1px solid var(--border);background:var(--card);color:var(--accent);border-radius:999px;padding:2px 14px;cursor:pointer";
      b.onmousedown = e => e.preventDefault();
      b.onclick = () => {
        parts[parts.length - 1] = w;
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
  let needFams = false, needCore = false, needVerses = false, needEv = false, needGrammar = false;
  keys.forEach(k => {
    const sid = k.split(":")[0];
    if (sid === "qc") needCore = true;
    else if (sid === "qw") needVerses = true;
    else if (sid === "gt") needGrammar = true;
    else if (sid === "tw") { /* tapped-word cards resolve from local store */ }
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
function mnemKey(ar) { return normalizeAr(ar || "").replace(/^ال/, ""); }
function mnemFor(ar) { if (!ar) return null; return MNEM[mnemKey(ar)] || MNEM[mnemKey(ar.split(/\s+/)[0])] || null; }
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
function mountBucketBar(slot, key, onSet) {
  if (!slot) return;
  const bar = document.createElement("div");
  bar.className = "bucket-bar";
  const current = bucketOf(key);
  BUCKETS.forEach(b => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = b.label;
    btn.title = b.name;
    if (b.id === current && getSrs()[key] && getSrs()[key].b) btn.classList.add("sel", b.id === "never" ? "never" : "x");
    btn.onclick = () => {
      setBucket(key, b.id);
      logEvent({ e: "bucket", key, b: b.id });
      [...bar.children].forEach(c => c.classList.remove("sel", "never"));
      btn.classList.add("sel");
      if (b.id === "never") btn.classList.add("never");
      if (onSet) onSet(b.id);
    };
    bar.appendChild(btn);
  });
  slot.innerHTML = "";
  slot.appendChild(bar);
}

/* ---------- tap-to-review ----------
   A word you keep tapping for help is a word you don't know. On the 3rd tap
   it quietly joins the review deck: qw/story keys resolve normally; free
   words get a tw:<norm> card whose content lives in ats-tapwords (synced). */
function noteWordTap(opts) {
  const norm = opts.norm || (opts.content && opts.content.ar ? normalizeAr(opts.content.ar).replace(/^ال/, "") : null);
  const id = opts.key || (norm ? "tw:" + norm : null);
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
  const n = normalizeAr(word);
  return _lex[n] || _lex[n.replace(/^ال/, "")] || null;
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
  return _AR_CH.test(w) ? w : null;
}
let _wordPop = null;
function closeWordPop() { if (_wordPop) { _wordPop.remove(); _wordPop = null; } }
function showWordPop(word, x, y, o) {
  closeWordPop();
  const hit = o.hit;
  const disp = hit ? hit[0] : word;
  const already = !!getSrs()[o.qkey || ("tw:" + normalizeAr(disp).replace(/^ال/, ""))];
  const canLearn = o.qkey || hit;
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
    <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
      <button type="button" class="wp-say" style="border:1px solid var(--border,#ddd);background:transparent;border-radius:10px;padding:6px 12px;cursor:pointer;font-size:15px">🔊</button>
      ${canLearn ? `<button type="button" class="wp-learn" ${already ? "disabled" : ""} style="border:none;background:var(--accent,#0d7a5f);color:#fff;border-radius:10px;padding:6px 14px;cursor:pointer;font-weight:600">${already ? "✓ in your deck" : "＋ Learn"}</button>` : ""}
    </div>`;
  document.body.appendChild(pop);
  const r = pop.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(x - r.width / 2, innerWidth - r.width - 8)) + "px";
  pop.style.top = (y + 16 + r.height > innerHeight ? y - r.height - 12 : y + 16) + "px";
  pop.querySelector(".wp-say").onclick = () => speak(disp, 0.75);
  const lb = pop.querySelector(".wp-learn");
  if (lb && !already) lb.onclick = () => {
    const srs = getSrs();
    let id = o.qkey;
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
    await loadLexicon();
    const hit = lexLookup(word);
    const row = e.target.closest("tr");
    const tested = e.target.closest("[data-nopeek]") || (row && row.querySelector("input:not([disabled])"));
    const qEl = e.target.closest("[data-qkey]");
    showWordPop(word, e.clientX, e.clientY, { hit, hideMeaning: !!tested, qkey: qEl && qEl.dataset.qkey });
    logEvent({ e: "wtap", ar: normalizeAr(word), hit: !!hit, ...(tested ? { hidden: true } : {}) });
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeWordPop(); });
  window.addEventListener("scroll", closeWordPop, { passive: true });
}

/* ---------- ✏️ note to coach: floating pen on every page ----------
   Open format — the learner writes anything; the note carries where they
   were (page, headings, any selected text). Saved as a `note` log event,
   synced with everything else; the nightly coach reads and answers via the
   dashboard notes. */
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
    const ov = document.createElement("div");
    ov.id = "noteOverlay";
    ov.innerHTML = `
      <div class="note-box">
        <h3 style="margin:0 0 4px">✏️ Note to your coach</h3>
        <p style="font-size:12.5px;color:var(--muted);margin:0 0 8px">Anything at all — “this confused me”, “too hard”, “more like this”. Your coach reads these nightly, sees exactly what you were looking at, and replies in the dashboard notes.</p>
        <textarea id="noteText" rows="4" placeholder="${who ? `What's on your mind, ${who.name}?` : "What's on your mind?"}"></textarea>
        <div class="ex-row" style="margin-top:8px">
          <button class="primary" id="noteSave" type="button">Send to coach</button>
          <button class="small" id="noteCancel" type="button">Cancel</button>
        </div>
        ${recent.length ? `<div style="margin-top:10px;font-size:12px;color:var(--muted)">Recent: ${recent.map(n => `“${(n.text || "").slice(0, 48)}” ✓`).join(" · ")}</div>` : ""}
      </div>`;
    document.body.appendChild(ov);
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    document.getElementById("noteCancel").onclick = () => ov.remove();
    document.getElementById("noteText").focus();
    document.getElementById("noteSave").onclick = () => {
      const text = document.getElementById("noteText").value.trim();
      if (!text) return;
      logEvent({ e: "note", text: text.slice(0, 2000), ctx, user: who ? who.name : undefined });
      ov.querySelector(".note-box").innerHTML = `<p style="font-size:15px;margin:0">✓ Saved${who ? ", " + who.name : ""} — your coach will read it tonight and reply in your dashboard notes.</p>`;
      setTimeout(() => ov.remove(), 2000);
      if (typeof autoSync === "function") setTimeout(autoSync, 50);
    };
  };
}

/* ---------- offline (PWA) ---------- */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => { /* http or unsupported — site works without it */ });
}
