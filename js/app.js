/* Shared core: story manifest, storage, SRS scheduler, TTS, Arabic text utils, phonetic input */

const STORY_LIST = [
  { id: "story-01", level: 1, n: 1, titleAr: "يَوْمِي", titleEn: "My Day", desc: "A simple daily routine, morning to night." },
  { id: "story-02", level: 1, n: 2, titleAr: "عَائِلَتِي وَبَيْتُنَا", titleEn: "My Family and Our Home", desc: "Ahmad introduces his family and house." },
  { id: "story-03", level: 1, n: 3, titleAr: "فِي السُّوقِ", titleEn: "At the Market", desc: "Saturday shopping with mother." },
  { id: "story-04", level: 1, n: 4, titleAr: "قَرِيبًا", titleEn: "Coming soon", locked: true },
  { id: "story-05", level: 1, n: 5, titleAr: "قَرِيبًا", titleEn: "Coming soon", locked: true },
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
];

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
  { id: "know", label: "✓ know", days: 30, box: 5 },
  { id: "repeat", label: "↻ repeat", days: 0, box: 0 },      // due in 10 min
  { id: "later", label: "⏳ later", days: 7, box: 3 },
  { id: "never", label: "✗ don't repeat", days: null, box: 5 },
];
function setBucket(key, b) {
  const srs = getSrs();
  const def = BUCKETS.find(x => x.id === b);
  if (!def) return;
  const due = b === "never" ? NEVER_DUE : (b === "repeat" ? Date.now() + 10 * 60 * 1000 : Date.now() + def.days * DAY);
  srs[key] = { box: def.box, due, b };
  store.set("ats-srs", srs);
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

/* ---------- "What now?" suggestions ---------- */
const QURAN_SURAHS = [
  { id: "fatiha", name: "Al-Fatiha", ar: "الفاتحة" },
  { id: "ikhlas", name: "Al-Ikhlas", ar: "الإخلاص" },
  { id: "asr", name: "Al-Asr", ar: "العصر" },
  { id: "kawthar", name: "Al-Kawthar", ar: "الكوثر" },
  { id: "nas", name: "An-Nas", ar: "الناس" },
  { id: "falaq", name: "Al-Falaq", ar: "الفلق" },
  { id: "qadr", name: "Al-Qadr", ar: "القدر" },
];

function suggestNext() {
  const out = [];
  const due = dueCards().length;
  // 1. Vocab Learn — the always-right micro-lesson, as short or long as wanted
  out.push({
    icon: "📝", title: "Vocab Learn" + (due ? ` (${due} due)` : ""),
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
  return out.slice(0, 4);
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
  let needFams = false, needCore = false, needVerses = false, needEv = false;
  keys.forEach(k => {
    const sid = k.split(":")[0];
    if (sid === "qc") needCore = true;
    else if (sid === "qw") needVerses = true;
    else if (sid.startsWith("fam-")) needFams = true;
    else if (sid.startsWith("ev-")) needEv = true;
    else needStories.add(sid);
  });
  const stories = {};
  const [fams, core, verses, everyday] = await Promise.all([
    needFams ? fetch("data/families.json").then(r => r.json()).then(d => d.families) : null,
    needCore ? fetch("data/quran-core.json").then(r => r.json()).then(d => d.words) : null,
    needVerses ? fetch("data/verses.json").then(r => r.json()).then(d => d.surahs) : null,
    needEv ? fetch("data/everyday.json").then(r => r.json()).then(d => d.groups) : null,
    Promise.all([...needStories].map(async id => {
      try { stories[id] = await loadStory(id); } catch (e) { /* removed story */ }
    })),
  ]);
  return keys.map(k => {
    const p = k.split(":");
    let v = null;
    if (p[0] === "qc") {
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
