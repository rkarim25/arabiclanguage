/* Shared core: story manifest, storage, SRS scheduler, TTS, Arabic text utils, phonetic input */

const STORY_LIST = [
  { id: "story-01", level: 1, n: 1, titleAr: "يَوْمِي", titleEn: "My Day", desc: "A simple daily routine, morning to night." },
  { id: "story-02", level: 1, n: 2, titleAr: "عَائِلَتِي وَبَيْتُنَا", titleEn: "My Family and Our Home", desc: "Ahmad introduces his family and house." },
  { id: "story-03", level: 1, n: 3, titleAr: "فِي السُّوقِ", titleEn: "At the Market", desc: "Saturday shopping with mother." },
  { id: "story-04", level: 1, n: 4, titleAr: "قَرِيبًا", titleEn: "Coming soon", locked: true },
  { id: "story-05", level: 1, n: 5, titleAr: "قَرِيبًا", titleEn: "Coming soon", locked: true },
];

const STEPS = [
  { key: "listen", ar: "اِسْتَمِعْ", en: "Listen" },
  { key: "read", ar: "اِقْرَأْ", en: "Read" },
  { key: "memorize", ar: "اِحْفَظْ", en: "Memorize" },
  { key: "quiz", ar: "أَجِبْ", en: "Quiz" },
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
