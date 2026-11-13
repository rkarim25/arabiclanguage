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

// 5. Incremental Multi-Batch Progression: Batch 1 advances active weekly Chapter sentences; Batch 2 & Batch 3 shift toward review!
{
  const chapData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "chapters.json"), "utf8"));
  const chapPool = [];
  chapData.chapters.forEach(c => (c.sentences || []).forEach((s, idx) => {
    chapPool.push({
      key: `chap:${c.num}:${idx}`, ar: s.ar, en: s.en, tr: s.tr || "",
      words: s.words || [], src: "chapters", track: "everyday", pattern: s.pattern || null, frames: s.frames || []
    });
  }));
  const fullSentences = chapPool.concat(sentencePool);
  const srs = {};
  // Seed 20 seen items (due/shaky) so incremental batches have real review material
  sentencePool.filter(s => s.track !== "quran").slice(0, 12).forEach(s => {
    srs[s.key] = { box: 1, s: 1.0, g: "maybe", u: now - 2 * DAY, due: now - 3600000 };
  });
  wordPool.slice(0, 14).forEach(w => {
    srs[w.key] = { box: 1, s: 1.0, g: "no", u: now - 2 * DAY, due: now - 3600000 };
  });
  grammarPool.slice(0, 3).forEach(g => {
    srs[g.key] = { box: 1, s: 1.0, g: "maybe", u: now - 2 * DAY, due: now - 3600000 };
  });
  sentencePool.filter(s => s.track === "quran").slice(0, 4).forEach(q => {
    srs[q.key] = { box: 2, s: 2.0, g: "yes", u: now - 5 * DAY, due: now - 3600000 };
  });

  // Chapters 1-3 passed -> Chapter 4 is active weekly lesson!
  const baseLog = [
    { e: "chap-test", chap: "chap-1", score: 100, pass: true, t: now - 14 * DAY },
    { e: "chap-test", chap: "chap-2", score: 100, pass: true, t: now - 10 * DAY },
    { e: "chap-test", chap: "chap-3", score: 100, pass: true, t: now - 4 * DAY },
    { e: "sentence-rate", g: "yes", t: now - DAY }
  ];

  const b1 = Practice.buildBatch({
    now, srs, log: baseLog, words: wordPool, sentences: fullSentences,
    grammar: grammarPool, grammarPatterns: gramData.patterns, freq: freqData.words, FreeTry
  });
  yes(b1.batchNum === 1 && b1.diag.activeChapNum === 4, `Batch 1 detects active weekly Chapter 4 (got batch=${b1.batchNum}, chap=${b1.diag.activeChapNum})`);
  const ch4InB1 = b1.list.filter(x => String(x.key).startsWith("chap:4:"));
  yes(ch4InB1.length >= 1, `Batch 1 advances active weekly Chapter 4 sentences (${ch4InB1.length} included)`);

  const logAfterB1 = baseLog.concat([{ e: "tryit-free-done", kind: "myday", n: b1.list.length, ok: 9, t: now - 600000 }]);
  const b2 = Practice.buildBatch({
    now, srs, log: logAfterB1, exclude: new Set(b1.list.map(x => x.key)),
    words: wordPool, sentences: fullSentences, grammar: grammarPool, grammarPatterns: gramData.patterns, freq: freqData.words, FreeTry
  });
  const logAfterB2 = logAfterB1.concat([{ e: "tryit-free-done", kind: "myday", n: b2.list.length, ok: 10, t: now - 300000 }]);
  const b3 = Practice.buildBatch({
    now, srs, log: logAfterB2, exclude: new Set(b1.list.concat(b2.list).map(x => x.key)),
    words: wordPool, sentences: fullSentences, grammar: grammarPool, grammarPatterns: gramData.patterns, freq: freqData.words, FreeTry
  });
  yes(b2.batchNum === 2 && b3.batchNum === 3, "completed daily rounds increment Batch 1 → Batch 2 → Batch 3 automatically");
  yes(b3.reviewPct >= b2.reviewPct && b2.reviewPct > b1.reviewPct && b3.reviewPct >= 90,
    `review share rises across incremental batches (Batch 1: ${b1.reviewPct}% → Batch 2: ${b2.reviewPct}% → Batch 3: ${b3.reviewPct}%)`);

  // Inline grammar rule attachment + AI Speaking Brief
  const gramMap = Practice.buildGrammarMap(gramData.patterns);
  yes(gramMap.negation && /لَمْ/.test(gramMap.negation.rule) && /لَا ذَهَبْتُ/.test(gramMap.negation.rule),
    "negation grammar rule explains لَمْ + short present vs مَا + past and warns against ✗ لَا ذَهَبْتُ");
  const brief = Practice.buildSpeakingBrief(b1.list, { srs, grammarMap: gramMap, batchNum: 1, activeChapNum: 4 });
  yes(/Practice Batch 1/.test(brief) && /AI VOICE SESSION REPORT/.test(brief) && ch4InB1.every(s => brief.includes(s.ar)),
    "buildSpeakingBrief produces a ready-to-paste 3-5 min AI voice brief containing the batch's exact sentences & report block");
}

// 6. Teach vs Review modes across unseen vs seen items
{
  const lcData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lesson-cards.json"), "utf8"));
  const LessonCards = require("../js/lesson-cards.js");
  const lcPool = LessonCards.buildPracticePool(lcData.cards);
  const srs = {};
  wordPool.slice(0, 6).forEach(w => { srs[w.key] = { box: 0, s: 0.3, g: "no", u: now - DAY, due: now - 3600000 }; });
  grammarPool.slice(0, 1).forEach(g => { srs[g.key] = { box: 0, s: 0.4, g: "no", u: now - DAY, due: now - 3600000 }; });

  const b = Practice.buildBatch({
    now, srs, log: [{ e: "sentence-rate", g: "yes", t: now - DAY }],
    words: wordPool, sentences: sentencePool, grammar: grammarPool,
    grammarPatterns: gramData.patterns, lessonCards: lcPool, freq: freqData.words, FreeTry
  });
  const newItems = b.list.filter(x => !(srs[x.key] && srs[x.key].u));
  const revItems = b.list.filter(x => !!(srs[x.key] && srs[x.key].u));
  yes(newItems.length > 0 && newItems.every(x => x.practiceMode === "teach" && x._autoReveal === true),
    `unseen Practice items enter in explicit Teach mode (_autoReveal=true across ${newItems.length} unseen items)`);
  yes(revItems.length > 0 && revItems.every(x => x.practiceMode === "review" && x._autoReveal === false),
    `seen Practice items enter in Review mode (_autoReveal=false across ${revItems.length} seen items)`);
}

// 7. Bidirectional Auto-Sync: syncVerdict updates Chapter sentences, line pointer, and canonical + raw vocab keys
{
  const chapData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "chapters.json"), "utf8"));
  const chapPool = [];
  chapData.chapters.forEach(c => (c.sentences || []).forEach((s, idx) => {
    chapPool.push({ key: `chap:${c.num}:${idx}`, ar: s.ar, en: s.en, words: s.words || [], src: "chapters", track: "everyday" });
  }));
  const memStore = { "ats-srs": { "tw:انا": { box: 0, g: "no", u: now - DAY }, "أَنَا": { box: 0, g: "no", u: now - DAY } } };
  const mockStore = {
    get: (k, d) => (k in memStore ? memStore[k] : d),
    set: (k, v) => { memStore[k] = v; }
  };
  const mockRate = (k, g) => {
    const s = mockStore.get("ats-srs", {});
    const card = { box: g === "yes" ? 3 : 0, s: g === "yes" ? 7 : 0.2, g, u: now, due: now + (g === "yes" ? 7 * DAY : 600000) };
    s[k] = card;
    mockStore.set("ats-srs", s);
    return card;
  };
  const wkMap = { "انا": "ev-people:0" };
  for (let i = 0; i < 3; i++) {
    const cs = chapPool.find(x => x.key === `chap:4:${i}`);
    Practice.syncVerdict({
      item: { key: `myday:test-${i}`, kind: "sentence", ar: cs.ar, en: cs.en, words: [["أَنَا", "I"]] },
      grade: "yes",
      srsApi: { rate: mockRate },
      getSrs: () => mockStore.get("ats-srs", {}),
      store: mockStore,
      chapters: chapData.chapters,
      wordKeyFor: ar => (ar === "أَنَا" ? wkMap["انا"] : null)
    });
  }
  const srsAfter = mockStore.get("ats-srs", {});
  yes(srsAfter["chap:4:0"] && srsAfter["chap:4:1"] && srsAfter["chap:4:2"],
    "syncVerdict cross-syncs practiced sentences onto matching Chapter sentence keys (chap:4:0..2)");
  yes(mockStore.get("ats-chap-line-chap-4", 0) === 3 && mockStore.get("ats-current-chap-id", "") === "chap-4",
    "syncVerdict advances active Chapter line pointer (ats-chap-line-chap-4 -> 3)");
  yes(srsAfter["ev-people:0"] && srsAfter["tw:انا"].box === 3 && srsAfter["أَنَا"].box === 3,
    "syncVerdict syncs constituent canonical word keys (ev-*), tw:* twins, and Chapter raw-Arabic keys");
}

// 8. Hands-free Commute Queue + Screen Modality Compensation + Capability Ledger
{
  const lcData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lesson-cards.json"), "utf8"));
  const LessonCards = require("../js/lesson-cards.js");
  const lcPool = LessonCards.buildPracticePool(lcData.cards);
  const chapData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "chapters.json"), "utf8"));
  const chapPool = [];
  chapData.chapters.forEach(c => (c.sentences || []).forEach((s, idx) => {
    chapPool.push({ key: `chap:${c.num}:${idx}`, ar: s.ar, en: s.en, words: s.words || [], src: "chapters", track: "everyday", pattern: s.pattern || "-" });
  }));
  const allSents = chapPool.concat(sentencePool);
  const srs = {};
  wordPool.slice(0, 6).forEach(w => { srs[w.key] = { box: 1, s: 0.6, g: "maybe", u: now - 2 * DAY, due: now - 3600000 }; });

  const cq = Practice.buildCommuteQueue({
    now, srs,
    log: [
      { e: "chap-test", chap: "chap-1", pass: true, t: now - 10 * DAY },
      { e: "chap-test", chap: "chap-2", pass: true, t: now - 8 * DAY },
      { e: "chap-test", chap: "chap-3", pass: true, t: now - 5 * DAY }
    ],
    scriptLines: [chapPool[0]],
    sentences: allSents,
    freeTrySentences: chapPool.slice(30, 34),
    lessonCards: lcPool,
    words: wordPool,
    homework: new Set([wordPool[8].key])
  });
  const cqKinds = new Set(cq.map(x => x.kind));
  const ruleItem = cq.find(x => x.kind === "rule");
  yes(cqKinds.has("script") && cqKinds.has("rule") && cqKinds.has("say") && cqKinds.has("quran") && cqKinds.has("word"),
    `buildCommuteQueue assembles full 5-part hands-free commute (${[...cqKinds].join(", ")})`);
  yes(ruleItem && ruleItem.enCue && !/[\u0600-\u06FF]/.test(ruleItem.enCue) && ruleItem.arModel,
    "Commute Lesson Card rule cue uses pure English audioCue (offline neural MP3 safe) + Arabic model");

  // Simulate 3 pocket commute sessions with ungraded pocket-heard words & sentences, 0 screen sessions
  const unvWord = wordPool[12].key;
  const unvSent = chapPool[31].key;
  const commuteHeavyLog = [
    { e: "chap-test", chap: "chap-1", pass: true, t: now - 12 * DAY },
    { e: "chap-test", chap: "chap-2", pass: true, t: now - 10 * DAY },
    { e: "chap-test", chap: "chap-3", pass: true, t: now - 8 * DAY },
    { e: "commute-done", min: 13, taught: 8, sents: 5, keys: [unvWord], ungradedKeys: [unvWord], sentKeys: [unvSent], ungradedSentKeys: [unvSent], t: now - 3 * DAY },
    { e: "commute-done", min: 13, taught: 7, sents: 5, keys: [unvWord], ungradedKeys: [unvWord], sentKeys: [unvSent], ungradedSentKeys: [unvSent], t: now - 2 * DAY },
    { e: "commute-done", min: 13, taught: 9, sents: 6, keys: [unvWord], ungradedKeys: [unvWord], sentKeys: [unvSent], ungradedSentKeys: [unvSent], t: now - 4 * 3600000 }
  ];
  const compBatch = Practice.buildBatch({
    now, srs, log: commuteHeavyLog, words: wordPool, sentences: allSents,
    grammar: grammarPool, grammarPatterns: gramData.patterns, lessonCards: lcPool, freq: freqData.words, FreeTry
  });
  yes(compBatch.diag.commuteHeavy && compBatch.diag.commuteDebt,
    "diagnose detects heavy commute streak + unverified pocket items (commuteHeavy & commuteDebt = true)");
  const verifyHits = compBatch.list.filter(x => x.practiceMode === "commute-verify");
  yes(verifyHits.some(x => x.key === unvWord) && verifyHits.some(x => x.key === unvSent),
    `Screen Practice automatically pulls pocket-heard commute words & sentences for visual Screen Check (${verifyHits.length} verified)`);
  yes(compBatch.counts.lessonCard === 1 && compBatch.counts.grammar >= 1,
    `Screen Practice compensates for audio-only commutes by guaranteeing visual Lesson Card (${compBatch.counts.lessonCard}) & Grammar vowel check (${compBatch.counts.grammar})`);

  const caps = Practice.summarizeCapabilities({
    now, srs, log: commuteHeavyLog, words: wordPool, sentences: allSents, grammar: grammarPool, lessonCards: lcPool
  });
  yes(caps.modality.commuteHeavy && caps.gaps.some(g => /commute/i.test(g)) && caps.concepts.lessonCardsTotal === lcPool.length,
    "summarizeCapabilities tracks honest capability breakdown & flags unverified commute gaps");
}

console.log(`\n✓ ${passed} Practice assertions passed.\n`);
