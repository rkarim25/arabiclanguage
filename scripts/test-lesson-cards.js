/* Automated test suite for Lesson Cards (data/lesson-cards.json + js/lesson-cards.js + Practice integration) */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");
const LessonCards = require(path.join(ROOT, "js", "lesson-cards.js"));
const Practice = require(path.join(ROOT, "js", "practice.js"));

let passed = 0;
function check(name, fn) {
  fn();
  console.log("  ✓ " + name);
  passed++;
}

const lcData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lesson-cards.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "audio-manifest.json"), "utf8"));
const gramData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "grammar.json"), "utf8"));
const bankData = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sentence-bank.json"), "utf8"));

const normAr = s => String(s || "").replace(/[ً-ٰـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[؟،؛]/g, "").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

check("lesson-cards.json contains at least 8 structured Lesson Cards spanning multiple categories", () => {
  assert(Array.isArray(lcData.cards) && lcData.cards.length >= 8);
  const cats = new Set(lcData.cards.map(c => c.category));
  assert(cats.has("grammar") && cats.has("nuance") && cats.has("quran") && cats.has("conversation"));
});

check("every Lesson Card has unique id, title, arTitle, summary, visual diagram, rows, and quickCheck", () => {
  const ids = new Set();
  for (const c of lcData.cards) {
    assert(c.id && !ids.has(c.id), "duplicate or missing id: " + c.id);
    ids.add(c.id);
    assert(c.title && c.arTitle && c.summary);
    assert(c.diagram && ["timeline", "lanes", "fortress"].includes(c.diagram.type));
    assert(Array.isArray(c.rows) && c.rows.length >= 3);
    assert(c.quickCheck && c.quickCheck.prompt && c.quickCheck.answerAr);
  }
});

check("Negation Lesson Card (lc:negation) renders visual diagram, 5 pairings table, and ✗ لَا ذَهَبْتُ warning", () => {
  const neg = lcData.cards.find(c => c.id === "negation");
  assert(neg);
  const html = LessonCards.renderBodyHtml(neg, { setsLink: true });
  assert(html.includes("لَمْ أَذْهَبْ إِلَى العَمَلِ"));
  assert(html.includes("مَا ذَهَبْتُ إِلَى العَمَلِ"));
  assert(html.includes("لَا ذَهَبْتُ"));
  assert(html.includes("sets.html#lc-negation"));
});

check("Verb Tenses Lesson Card (lc:verb-tenses) includes She (هِيَ) and They (هُمْ: ذَهَبُوا / يَذْهَبُونَ / سَيَذْهَبُونَ) with legible .ar-inline spans", () => {
  const vt = lcData.cards.find(c => c.id === "verb-tenses");
  assert(vt);
  const html = LessonCards.renderBodyHtml(vt, { setsLink: true });
  assert(html.includes("هُمْ") && html.includes("يَذْهَبُونَ إِلَى المَسْجِدِ") && html.includes("ذَهَبُ<b>وا</b>") && html.includes("<b>سَ</b>يَذْهَبُونَ"));
  assert(html.includes("هِيَ") && html.includes("تَذْهَبُ إِلَى البَيْتِ"));
  assert(html.includes('class="ar-inline"'), "inline Arabic inside table cells/summaries must wrap in .ar-inline");
});

check("every spoken Arabic example across all Lesson Cards resolves to a real neural MP3 clip", () => {
  for (const c of lcData.cards) {
    for (const r of c.rows) {
      if (!r.ar) continue;
      const h = manifest.ar[normAr(r.ar)];
      assert(h, `missing manifest entry for Lesson Card ${c.id} row: ${r.ar}`);
      assert(fs.existsSync(path.join(ROOT, "audio", "ar", h + ".mp3")));
    }
    if (c.quickCheck && c.quickCheck.speakAr) {
      const h = manifest.ar[normAr(c.quickCheck.speakAr)];
      assert(h, `missing manifest entry for Lesson Card ${c.id} quickCheck: ${c.quickCheck.speakAr}`);
    }
  }
});

check("Practice PROACTIVELY TEACHES an unseen Lesson Card at #1 when a batch uses its concept", () => {
  const pool = LessonCards.buildPracticePool(lcData.cards);
  const gramPool = Practice.buildGrammarPool(gramData.patterns);
  const negSents = bankData.sentences.filter(s => s.pattern === "negation").slice(0, 6).map(s => ({
    key: s.key, ar: s.ar, en: s.en, tr: s.tr || "", words: s.words || [], src: s.src || "bank", track: "everyday", pattern: s.pattern
  }));
  const now = Date.now();
  const built = Practice.buildBatch({
    now,
    batchNum: 1,
    activeChapNum: 2,
    srs: {},
    log: [{ e: "vocab-rate", g: "yes", t: now - 3600000 }],
    words: [],
    sentences: negSents,
    grammar: gramPool,
    lessonCards: pool,
    exclude: new Set()
  });
  assert(built.counts.lessonCard === 1, "expected 1 lesson card in batch");
  assert(built.list[0].kind === "lesson-card", "teach-mode lesson card must lead at #1");
  assert(built.list[0].key === "lc:negation", "expected lc:negation to be taught");
  assert(built.list[0].lcMode === "teach" && built.list[0]._autoReveal === true);
});

check("Practice SKIPS fresh solid Lesson Cards, then REVIEWS them from time to time when due", () => {
  const pool = LessonCards.buildPracticePool(lcData.cards);
  const sents = bankData.sentences.filter(s => s.pattern === "negation").slice(0, 8).map(s => ({
    key: s.key, ar: s.ar, en: s.en, tr: s.tr || "", words: s.words || [], src: s.src || "bank", track: "everyday", pattern: s.pattern
  }));
  const now = Date.now();
  // Mark all lesson cards solid & due in 14 days
  const srsFresh = {};
  pool.forEach(lc => {
    srsFresh[lc.key] = { box: 3, s: 14, g: "yes", u: now - 86400000, due: now + 13 * 86400000 };
  });
  const builtFresh = Practice.buildBatch({
    now, batchNum: 1, srs: srsFresh, log: [{ e: "vocab-rate", g: "yes", t: now - 3600000 }],
    words: [], sentences: sents, grammar: [], lessonCards: pool, exclude: new Set()
  });
  assert(builtFresh.counts.lessonCard === 0, "fresh solid lesson cards should not interrupt Practice");

  // Advance clock past lc:negation's due date → should come back in Review Mode!
  const srsDue = Object.assign({}, srsFresh, {
    "lc:negation": { box: 3, s: 7, g: "yes", u: now - 8 * 86400000, due: now - 3600000 }
  });
  const builtDue = Practice.buildBatch({
    now, batchNum: 1, srs: srsDue, log: [{ e: "vocab-rate", g: "yes", t: now - 3600000 }],
    words: [], sentences: sents, grammar: [], lessonCards: pool, exclude: new Set()
  });
  assert(builtDue.counts.lessonCard === 1, "due lesson card must come back for spaced review");
  const picked = builtDue.list.find(x => x.kind === "lesson-card");
  assert(picked && picked.key === "lc:negation" && picked.lcMode === "review" && picked._autoReveal === false);
});

check("sets.html, index.html (Practice), and sentences.html load js/lesson-cards.js and render Earned Mastery Dots", () => {
  const setsHtml = fs.readFileSync(path.join(ROOT, "sets.html"), "utf8");
  const idxHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const sentsHtml = fs.readFileSync(path.join(ROOT, "sentences.html"), "utf8");
  assert(setsHtml.includes("js/lesson-cards.js") && setsHtml.includes("data/lesson-cards.json"));
  assert(idxHtml.includes("js/lesson-cards.js") && idxHtml.includes("data/lesson-cards.json"));
  assert(sentsHtml.includes("js/lesson-cards.js"));
  global.SRS = require(path.join(ROOT, "js", "srs.js"));
  const cardHtml = LessonCards.renderBodyHtml(lcData.cards[0], {});
  assert(cardHtml.includes('data-mkey="lc:' + lcData.cards[0].id + '"'), "Lesson Card header must include Earned Mastery Dot");
});

console.log(`\n✓ ${passed} Lesson Card assertions passed.`);
