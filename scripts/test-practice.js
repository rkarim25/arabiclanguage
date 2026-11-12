/* Automated tests for js/practice.js — Adaptive Practice batch composer */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Practice = require("../js/practice.js");
const FreeTry = require("../js/freetry.js");

const ROOT = path.join(__dirname, "..");
const gramData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "grammar.json"), "utf8"));
const bankData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sentence-bank.json"), "utf8"));
const evData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "everyday.json"), "utf8"));
const freqData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "frequency.json"), "utf8"));

const grammarPool = Practice.buildGrammarPool(gramData.patterns);
const wordPool = [];
evData.groups.slice(0, 6).forEach(g => g.members.forEach((m, i) => {
  wordPool.push({ key: `ev-${g.id}:${i}`, ar: m.ar, en: m.en, tr: m.tr || "", src: "everyday" });
}));
const sentencePool = bankData.sentences.filter(s => s.track === "quran").slice(0, 50)
  .concat(bankData.sentences.filter(s => s.track !== "quran").slice(0, 80))
  .map(s => ({
    key: s.key || s.id, ar: s.ar, en: s.en, tr: s.tr || "",
    words: (s.words || []).map(w => Array.isArray(w) ? w : [w.ar, w.en]),
    src: s.src || "bank", track: s.track || "everyday",
    ref: s.ref || null, surah: s.surah || null, wordKeys: s.wordKeys || [],
    pattern: s.pattern || "-", frames: s.frames || []
  }));

let passed = 0;
function yes(cond, msg) {
  if (!cond) { console.error("  ✗ " + msg); process.exit(1); }
  console.log("  ✓ " + msg);
  passed++;
}

const now = Date.now();
const DAY = 86400000;

console.log("\n-- Practice: effort equivalence & adaptive behaviour --");

// 1. Steady 10-sentence equivalent workload
{
  const srs = {};
  wordPool.slice(0, 5).forEach(w => { srs[w.key] = { box: 1, s: 0.4, g: "no", u: now - DAY, due: now - 3600000 }; });
  grammarPool.slice(0, 2).forEach(g => { srs[g.key] = { box: 1, s: 0.5, g: "maybe", u: now - 2 * DAY, due: now - 3600000 }; });
  const log = [{ e: "sentence-rate", g: "yes", t: now - 12 * 3600000 }];

  const b = Practice.buildBatch({ now, srs, log, words: wordPool, sentences: sentencePool, grammar: grammarPool, freq: freqData.words, FreeTry });
  yes(b.budget === 10, "steady session targets 10.0 sentence-effort units");
  yes(b.effort >= 9.5 && b.effort <= 10.5, `steady batch lands at equivalent 10-sentence effort (got ${b.effort})`);
  yes(b.counts.word > 0 && b.counts.sentence > 0 && b.counts.grammar > 0 && b.counts.quran > 0,
    `comprehensive mix spans vocab (${b.counts.word}), sentences (${b.counts.sentence}), grammar (${b.counts.grammar}), and Qur'an (${b.counts.quran})`);
}

// 2. Heavy mood taps -> lighter 6-unit review-only session
{
  const srs = {};
  wordPool.slice(0, 6).forEach(w => { srs[w.key] = { box: 2, s: 2, g: "yes", u: now - 3 * DAY, due: now - 3600000 }; });
  sentencePool.slice(0, 10).forEach(s => { srs[s.key] = { box: 2, s: 2, g: "yes", u: now - 3 * DAY, due: now - 3600000 }; });
  const log = [
    { e: "sentence-rate", g: "yes", t: now - 2 * DAY },
    { e: "mood", mood: "heavy", t: now - 2 * DAY },
    { e: "mood", mood: "heavy", t: now - DAY }
  ];
  const b = Practice.buildBatch({ now, srs, log, words: wordPool, sentences: sentencePool, grammar: grammarPool, freq: freqData.words, FreeTry });
  yes(b.diag.light && b.budget === 6, "two heavy mood taps drop budget to 6.0 effort units");
  yes(!b.diag.allowNew, "heavy energy mode pauses new items (review-only)");
  yes(b.effort >= 5.5 && b.effort <= 6.5, `light batch lands at 6-sentence effort (got ${b.effort})`);
}

// 3. Comeback after >=4 days away -> gentle 6-unit review-only session
{
  const srs = {};
  wordPool.slice(0, 8).forEach(w => { srs[w.key] = { box: 2, s: 2, g: "yes", u: now - 7 * DAY, due: now - 2 * DAY }; });
  sentencePool.slice(0, 10).forEach(s => { srs[s.key] = { box: 2, s: 2, g: "yes", u: now - 7 * DAY, due: now - 2 * DAY }; });
  const log = [{ e: "vocab-rate", g: "yes", t: now - 6 * DAY }];
  const b = Practice.buildBatch({ now, srs, log, words: wordPool, sentences: sentencePool, grammar: grammarPool, freq: freqData.words, FreeTry });
  yes(b.diag.comeback && b.budget === 6 && !b.diag.allowNew, "returning after a 6-day gap triggers comeback mode (6 units, review-only)");
}

// 4. Not a fixed pattern: vocab-slip spike vs Qur'an-ear drought shift composition dynamically
{
  const srsVocabSpike = {};
  wordPool.slice(0, 12).forEach(w => { srsVocabSpike[w.key] = { box: 0, s: 0.2, g: "no", u: now - DAY, due: now - 3600000 }; });
  // Recent Qur'an practice already done today -> quranUnits drops to 0, vocab expands!
  const logVocabFocus = [
    { e: "qtest-done", t: now - 3600000 },
    { e: "qlisten-test", t: now - 3600000 },
    { e: "qtest-done", t: now - 1800000 }
  ];
  const b1 = Practice.buildBatch({ now, srs: srsVocabSpike, log: logVocabFocus, words: wordPool, sentences: sentencePool, grammar: grammarPool, freq: freqData.words, FreeTry });

  // Contrast: 0 word slips, 0 recent ear events -> Qur'an expands, fewer words!
  const srsCleanWords = {};
  sentencePool.filter(s => s.track !== "quran").slice(0, 15).forEach(s => { srsCleanWords[s.key] = { box: 4, s: 20, g: "solid", u: now - DAY, due: now + 15 * DAY }; });
  const logNoEar = Array.from({ length: 12 }, (_, i) => ({ e: "sent-drill", ok: true, t: now - (i + 1) * 3600000 }));
  const b2 = Practice.buildBatch({ now, srs: srsCleanWords, log: logNoEar, words: wordPool, sentences: sentencePool, grammar: grammarPool, freq: freqData.words, FreeTry });

  yes(b1.counts.word > b2.counts.word && b1.counts.quran < b2.counts.quran,
    `composition adapts dynamically (vocab-slip day: ${b1.counts.word} words/${b1.counts.quran} Qur'an vs ear-gap day: ${b2.counts.word} words/${b2.counts.quran} Qur'an)`);
}

console.log(`\n✓ ${passed} Practice assertions passed.\n`);
