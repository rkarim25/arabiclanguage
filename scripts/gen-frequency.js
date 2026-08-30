#!/usr/bin/env node
/* What is actually WORTH drilling — measured, not assumed.
   ============================================================================
   Reza, 2026-08-30:

     "Lets say X are the sentences and Y are the variations. The XY combo that i
      should focus on should be based on frequency of use in language. i dont
      want to waste time going over variants which are not going to be used."

   Fair, and it exposed a real fault. The Sentence Practice drill was built on
   ana / nahnu / hum — I / we / they — because those felt like the useful ones.
   Measured against the actual Qur'an, that is about a tenth of real verb use,
   and it omits the single commonest person in the language:

     هُوَ, the 3rd masculine singular, is the narrative voice of the Qur'an and
     the citation form of every verb. It was NEVER drilled.

   This counts every conjugated form of the 82 verbs in data/conjugations.json
   against two corpora — the whole Qur'an (cached by import-quran-sentences.js)
   and the site's own everyday sentences — and writes the shares to
   data/frequency.json so the generators and the UI can rank by evidence.

   HONEST LIMIT, recorded in the output: Arabic surface forms collide once the
   vowels are stripped (قُلْتُ / قُلْتَ / قُلْتِ are one string), so per-person
   shares inside the past tense are approximate and are pooled where they cannot
   be told apart. Matching WITH vowels is worse, not better: the Uthmani text
   carries pausal and orthographic marks the citation tables do not, which
   produced obviously false zeros for قَالُوا. The ranking is therefore reliable
   at the level of "which cells matter", not to the decimal point.

   Run: node scripts/gen-frequency.js   (needs the Qur'an cache; the importer
        fills it, or set QURAN_CACHE)
   ============================================================================ */
const fs = require("fs"), path = require("path"), os = require("os");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const CACHE = process.env.QURAN_CACHE || path.join(os.tmpdir(), "quran-corpus");

const norm = s => String(s).replace(/[ً-ٰـۖ-ۭ]/g, "")
  .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي")
  .replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

/* ---------- two corpora, counted SEPARATELY ----------
   Pooling raw counts would be wrong: the Qur'an is 75,000 words and the site's
   everyday Arabic about 1,100, so the Qur'an would decide everything and the
   conversation goal would silently inherit Qur'anic register. Measured that way,
   أَنْتُمْ outranked نَحْنُ — true of scripture, useless at a hotel desk.

   So each corpus is normalised to its own share and the two are then blended,
   weighted 60/40 toward the Qur'an because that is his ranked-first goal — not
   100/0, because he has two. */
const QURAN_WEIGHT = 0.6;
const qCount = new Map(), eCount = new Map();
let quranTokens = 0, everydayTokens = 0, surahs = 0;
const bump = (map, w) => { const k = norm(w); if (k) map.set(k, (map.get(k) || 0) + 1); };

if (fs.existsSync(CACHE)) {
  fs.readdirSync(CACHE).filter(f => f.endsWith(".json")).forEach(f => {
    surahs++;
    const s = JSON.parse(fs.readFileSync(path.join(CACHE, f), "utf8"));
    (s.ayahs || []).forEach(a => Object.values(a.word_by_word || {}).forEach(w => { quranTokens++; bump(qCount, w.arabic); }));
  });
}
let bank = { sentences: [] };
try { bank = D("sentence-bank.json"); } catch (e) {}
bank.sentences.filter(s => s.track !== "quran").forEach(s =>
  String(s.ar).split(/\s+/).forEach(w => { everydayTokens++; bump(eCount, w); }));

/* combined view for word ranking: each corpus normalised, then blended */
const count = new Map();
const blend = (k) => (QURAN_WEIGHT * (qCount.get(k) || 0) / (quranTokens || 1))
  + ((1 - QURAN_WEIGHT) * (eCount.get(k) || 0) / (everydayTokens || 1));
new Set([...qCount.keys(), ...eCount.keys()]).forEach(k => count.set(k, blend(k)));

/* ---------- which person/tense cells actually occur ---------- */
const conj = D("conjugations.json");
const cells = {}, cellsQ = {}, cellsE = {};
conj.verbs.forEach(v => ["past", "pres"].forEach(t =>
  Object.entries(v[t] || {}).forEach(([p, form]) => {
    const id = `${p}:${t}`, k = norm(form);
    cells[id] = (cells[id] || 0) + (count.get(k) || 0);
    cellsQ[id] = (cellsQ[id] || 0) + (qCount.get(k) || 0);
    cellsE[id] = (cellsE[id] || 0) + (eCount.get(k) || 0);
  })));

/* Collisions: within a tense, persons whose forms normalize identically get the
   same tally. Note which ones so the ranking is not read as finer than it is. */
const collide = {};
conj.verbs.forEach(v => ["past", "pres"].forEach(t => {
  const byForm = {};
  Object.entries(v[t] || {}).forEach(([p, f]) => {
    const k = norm(f); (byForm[k] = byForm[k] || []).push(`${p}:${t}`);
  });
  Object.values(byForm).forEach(ps => { if (ps.length > 1) ps.forEach(p => { collide[p] = [...new Set((collide[p] || []).concat(ps))]; }); });
}));

const total = Object.values(cells).reduce((a, n) => a + n, 0) || 1;
const ranked = Object.entries(cells)
  .map(([cell, n]) => ({
    cell, person: cell.split(":")[0], tense: cell.split(":")[1],
    share: +(100 * n / total).toFixed(2),
    quranHits: cellsQ[cell] || 0, everydayHits: cellsE[cell] || 0,
    ...(collide[cell] && collide[cell].length > 1 ? { sharedWith: collide[cell].filter(x => x !== cell) } : {}),
  }))
  .sort((a, b) => b.share - a.share);

/* the smallest set of cells that covers 90% of real use */
let cum = 0;
const core = [];
for (const r of ranked) { if (cum >= 90) break; cum += r.share; core.push(r.cell); }

/* ---------- the words worth memorising ---------- */
/* words worth memorising, same blend, reported as per-10k so the numbers mean something */
const words = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1500)
  .map(([w, v]) => [w, +(v * 10000).toFixed(2)]);

const out = {
  version: 1,
  note: "GENERATED by scripts/gen-frequency.js. What is worth drilling, measured against the whole Qur'an plus the site's own everyday sentences. Do not hand-edit.",
  caveat: "Surface forms collide once vowels are stripped, so per-person shares within a tense are pooled where they cannot be told apart (see sharedWith). Reliable for ranking cells, not to the decimal point.",
  corpus: { surahs, quranTokens, everydayTokens, quranWeight: QURAN_WEIGHT },
  cells: ranked,
  coreCells: core,
  words: Object.fromEntries(words),
};
fs.writeFileSync(path.join(ROOT, "data", "frequency.json"), JSON.stringify(out, null, 1));

const drilled = ["ana:past", "ana:pres", "nahnu:past", "nahnu:pres", "hum:past", "hum:pres"];
const drilledShare = ranked.filter(r => drilled.includes(r.cell)).reduce((a, r) => a + r.share, 0);
console.log(`corpus: ${surahs} surahs (${quranTokens} words) + ${everydayTokens} everyday words`);
console.log(`top cells: ${ranked.slice(0, 5).map(r => `${r.cell} ${r.share}%`).join(", ")}`);
console.log(`${core.length} cells cover 90% of real verb use`);
console.log(`the OLD drill set (ana/nahnu/hum) covered ${drilledShare.toFixed(1)}% — and never once drilled هُوَ`);
