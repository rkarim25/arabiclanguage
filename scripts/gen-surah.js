/* Generate word-by-word surah lessons for data/verses.json from the
   Quran-Project word-by-word dataset (ai_wbw) and translations.
   Usage: node scripts/gen-surah.js 114 113 97
   Data source: env QURAN_DATA or the default OneDrive path.
   Existing hand-authored surahs are kept; matching ids are replaced. */

const fs = require("fs");
const path = require("path");

const QP = process.env.QURAN_DATA || "C:/Users/Reza Karim/OneDrive/Quran-Project/docs/data";
const OUT = path.join(__dirname, "..", "data", "verses.json");

const META = {
  1:   { id: "fatiha",  name: "الفَاتِحَة", nameEn: "Al-Fatiha — The Opening", why: "You recite this at least 17 times a day in prayer. Understanding it word-by-word transforms every salah." },
  97:  { id: "qadr",    name: "القَدْر", nameEn: "Al-Qadr — The Decree", why: "The night worth more than a thousand months — recited constantly in Ramadan." },
  103: { id: "asr",     name: "العَصْر", nameEn: "Al-Asr — Time", why: "Three verses containing the Quran's core message — and its highest-frequency structures: إنّ، الذين، آمنوا، عملوا، الحق." },
  108: { id: "kawthar", name: "الكَوْثَر", nameEn: "Al-Kawthar — Abundance", why: "The shortest surah — and you already know فَصَلِّ and لِرَبِّكَ from your word families." },
  112: { id: "ikhlas",  name: "الإِخْلَاص", nameEn: "Al-Ikhlas — Sincerity", why: "Equal to a third of the Quran in reward, and built entirely from top-frequency words: قل، هو، الله، لم، يكن، له." },
  109: { id: "kafirun", name: "الكَافِرُون", nameEn: "Al-Kafirun — The Disbelievers", why: "Six verses built almost entirely from one root (ع-ب-د, worship) and the negations لا وما — pure high-frequency grammar practice." },
  110: { id: "nasr",    name: "النَّصْر", nameEn: "An-Nasr — The Divine Support", why: "Three verses with إذا، جاء، رأيت، كان — four of the highest-frequency words in the Quran, in their natural habitat." },
  111: { id: "masad",   name: "المَسَد", nameEn: "Al-Masad — The Palm Fibre", why: "Short narrative verses with past-tense verbs (تبّ، أغنى، كسب) — a story you already know, told in five lines." },
  113: { id: "falaq",   name: "الفَلَق", nameEn: "Al-Falaq — Daybreak", why: "One of the two protection surahs you recite morning and evening." },
  114: { id: "nas",     name: "النَّاس", nameEn: "An-Nas — Mankind", why: "The Quran's final surah, recited daily for protection — six short verses around one root: النَّاس." },
};

function clampSentence(s, max = 220) {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("—"), cut.lastIndexOf(";"));
  return (stop > 60 ? cut.slice(0, stop + 1) : cut).trim() + "…";
}

function genSurah(n) {
  const meta = META[n];
  if (!meta) throw new Error(`No META for surah ${n} — add name/nameEn/why to the META map first.`);
  const wbw = JSON.parse(fs.readFileSync(`${QP}/ai_wbw/surah_${n}.json`, "utf8"));
  let trans = {};
  try { trans = JSON.parse(fs.readFileSync(`${QP}/ai_translations/surah_${n}.json`, "utf8")).ayahs || {}; } catch (e) {}

  const verses = Object.keys(wbw).sort((a, b) => +a - +b).map(ayah => {
    const words = Object.keys(wbw[ayah]).sort((a, b) => +a - +b).map(w => {
      const it = wbw[ayah][w];
      const ar = it.parts.map(p => p.ar).join("");
      const tr = it.parts.map(p => p.tr).join("-");
      const en = it.parts.map(p => p.en).join(" ").replace(/\s+/g, " ").trim();
      const entry = [ar, tr, en];
      const g = (it.grammar || "").trim();
      const root = (it.root || "").trim();
      if (g && g !== "—") entry.push(clampSentence(g, 320));
      if (root && root !== "—") entry.push(root);
      return entry;
    });
    return {
      ref: `${n}:${ayah}`,
      ar: words.map(w => w[0]).join(" "),
      en: clampSentence(trans[ayah] || ""),
      words,
    };
  });
  return { id: meta.id, n, name: meta.name, nameEn: meta.nameEn, why: meta.why, verses };
}

const targets = process.argv.slice(2).map(Number).filter(Boolean);
if (!targets.length) { console.error("Usage: node scripts/gen-surah.js <surah numbers...>"); process.exit(1); }

const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
// annotate existing surahs with their numbers so the site can link to the Quran reader
const NUM = Object.fromEntries(Object.entries(META).map(([n, m]) => [m.id, +n]));
data.surahs.forEach(s => { if (!s.n && NUM[s.id]) s.n = NUM[s.id]; });

targets.forEach(n => {
  const s = genSurah(n);
  const i = data.surahs.findIndex(x => x.id === s.id);
  if (i >= 0) data.surahs[i] = { ...data.surahs[i], n: s.n, verses: data.surahs[i].verses };
  else data.surahs.push(s);
  console.log(`surah ${n} (${s.id}): ${s.verses.length} verses, ${s.verses.reduce((a, v) => a + v.words.length, 0)} words ${i >= 0 ? "(kept hand-authored verses, added n)" : "(generated)"}`);
});

fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + "\n", "utf8");
console.log("written", OUT);
