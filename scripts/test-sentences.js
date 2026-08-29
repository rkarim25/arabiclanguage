/* The sentence layer — what he actually studies (CURRICULUM.md §5).

   His rule, 2026-08-30: "i just keep working with sentences only and as primary
   method", with two conditions — the vocab list is still maintained underneath
   and tested inside sentences, and grammar is explained when a rule genuinely
   needs it.

   These tests pin the three things that make that safe:
     1. every sentence is REAL Arabic from a real source, never composed here;
     2. every sentence links to the word cards under it, so nothing he has
        learned is orphaned and a sentence answer can grade its words;
     3. the selector actually covers a lesson's words, and reports honestly how
        much of the ladder the bank can reach.

   Run: node scripts/test-sentences.js
*/
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const C = require(path.join(ROOT, "js", "curriculum.js"));

const bank = D("sentence-bank.json");
const curriculum = D("curriculum.json");
const verses = D("verses.json"), phrases = D("phrases.json"), prompts = D("prompts.json"), grammar = D("grammar.json");

let fails = 0;
const ok = m => console.log("  ✓ " + m);
const bad = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : bad(m));

const S = bank.sentences || [];
const norm = s => String(s).replace(/[ً-ٰـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي")
  .replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

/* ---------- the bank exists and is the right shape ---------- */
yes(S.length > 250, `${S.length} sentences in the bank`);
yes(S.filter(s => s.track === "quran").length > 50, `${S.filter(s => s.track === "quran").length} of them Qur'an`);
yes(S.every(s => s.key && s.ar && s.en), "every sentence has a key, Arabic and a meaning");
yes(new Set(S.map(s => s.key)).size === S.length, "every sentence key is unique");
yes(S.every(s => Array.isArray(s.words) && s.words.length), "every sentence lists its words");

/* ---------- NOTHING IS INVENTED ----------
   The one rule that matters most: a sentence he is taught must come from content
   already on the site and already checked. If this fails, someone has started
   composing Arabic in the generator. */
{
  const sources = new Set();
  verses.surahs.forEach(s => s.verses.forEach(v => {
    sources.add(norm(v.ar));
    // an ayah may be studied as hand-authored clauses; those are substrings of it
    (v.words || []).forEach((_, i) => (v.words || []).forEach((__, j) => {
      if (j > i) sources.add(norm(v.words.slice(i, j + 1).map(w => w[0]).join(" ")));
    }));
  }));
  phrases.groups.forEach(g => g.members.forEach(m => sources.add(norm(m.ar))));
  prompts.prompts.forEach(p => sources.add(norm(p.ar)));
  grammar.patterns.forEach(p => (p.examples || []).forEach(e => sources.add(norm(e.ar))));
  fs.readdirSync(path.join(ROOT, "data")).filter(f => /^story-\d+\.json$/.test(f)).forEach(f =>
    (D(f).sentences || []).forEach(s => sources.add(norm(s.ar))));
  const sen = D("sentences.json");
  sen.verbs.forEach(v => Object.values(v.forms).forEach(t => Object.values(t).forEach(form => {
    sources.add(norm(`${form} ${v.obj.ar}`));
  })));

  const orphans = S.filter(s => !sources.has(norm(s.ar)));
  yes(!orphans.length, `every sentence traces back to a verified source${orphans.length ? " — NOT: " + orphans.slice(0, 3).map(o => o.ar).join(" / ") : ""}`);
}

/* ---------- the words underneath ---------- */
{
  const withKeys = S.filter(s => (s.wordKeys || []).length).length;
  yes(withKeys === S.length, "every sentence links to the word cards inside it");
  // his existing cards must be REUSED, not re-minted, or his history is orphaned
  const reused = new Set(S.flatMap(s => s.wordKeys).filter(k => !k.startsWith("w:")));
  yes(reused.size > 300, `${reused.size} of the words map onto cards the site already had`);
  const ph = S.find(s => s.key.startsWith("ph-"));
  yes(!!ph, "the phrase deck keeps its original ph- keys, so its SRS history carries over");
  yes(S.every(s => (s.teaches || []).includes(s.key) || !(s.teaches || []).length || s.key.startsWith("s:")),
    "a deck sentence counts as teaching its own card");
}

/* ---------- Qur'an units are the right size ---------- */
{
  const q = S.filter(s => s.track === "quran");
  const longest = Math.max.apply(null, q.map(s => s.words.length));
  yes(longest <= 9, `the longest Qur'an unit is ${longest} words — an ayah, not a page`);
  const parts = q.filter(s => s.part);
  yes(parts.every(s => s.verseEn), "a split ayah always carries the whole verse's meaning with it");
  yes(parts.every(s => s.en && !/·/.test(s.en)), "a split ayah has a real clause translation, not joined word glosses");
}

/* ---------- variations are verified, never invented ---------- */
{
  const varied = S.filter(s => (s.vary || []).length);
  yes(varied.length > 10, `${varied.length} sentences carry variations`);
  const sen = D("sentences.json");
  const real = new Set();
  sen.verbs.forEach(v => Object.values(v.forms).forEach(t => Object.values(t).forEach(f => real.add(norm(`${f} ${v.obj.ar}`)))));
  const madeUp = varied.flatMap(s => s.vary).filter(v => !real.has(norm(v.ar)));
  yes(!madeUp.length, `every variation is a form from the verified conjugation table${madeUp.length ? " — NOT: " + madeUp[0].ar : ""}`);
  // and no ayah is ever mutated
  yes(!S.some(s => s.track === "quran" && (s.vary || []).length), "no Qur'an verse is ever slot-substituted");
}

/* ---------- the selector ---------- */
{
  const ctx = { bank, curriculum, srs: {}, log: [], now: Date.UTC(2026, 7, 30) };
  const lessons = (curriculum.milestones || []).flatMap(m => (m.lessons || []).map(l => ({ l, track: m.track })));
  let tot = 0, cov = 0, none = 0;
  lessons.forEach(({ l, track }) => {
    const picked = C.sentencesFor(l.keys, ctx, { track, limit: 4 });
    const c = new Set(picked.flatMap(s => s.teaches || []));
    tot += l.keys.length;
    cov += l.keys.filter(k => c.has(k)).length;
    if (!picked.length) none++;
    if (picked.length > 4) bad("a lesson was given more sentences than its limit");
  });
  const pct = 100 * cov / tot;
  yes(pct >= 50, `the bank reaches ${pct.toFixed(1)}% of the ladder's words (floor 50%) — the rest fall back to single words and are the content job`);
  yes(none <= 20, `${none} of ${lessons.length} lessons have no sentence yet`);
  console.log(`  · honest state: ${S.length} sentences, ${pct.toFixed(1)}% word coverage, ${none} lessons still word-only`);

  // the greedy cover must actually be greedy: the first pick carries the most
  const l = lessons.find(x => x.l.keys.length >= 4 && C.sentencesFor(x.l.keys, ctx, { track: x.track }).length >= 2);
  if (l) {
    const picked = C.sentencesFor(l.l.keys, ctx, { track: l.track, limit: 4 });
    const want = new Set(l.l.keys);
    const gains = picked.map(s => (s.teaches || []).filter(k => want.has(k)).length);
    yes(gains[0] >= gains[gains.length - 1], `the sentence that teaches the most comes first (${gains.join(" → ")})`);
  }
}

/* ---------- review comes back as sentences, never as a word list ---------- */
{
  const now = Date.UTC(2026, 7, 30);
  const srs = {};
  // three overdue words that real sentences contain
  const some = S.filter(s => (s.teaches || []).length).slice(0, 3);
  some.forEach(s => { srs[s.teaches[0]] = { box: 1, due: now - 86400000 }; });
  const ctx = { bank, curriculum, srs, log: [], now };
  const back = C.reviewSentencesFor({ keys: [] }, ctx, 2);
  yes(back.length > 0 && back.every(s => s.ar), "what is due comes back as sentences to say, not words to stare at");
  yes(C.weakWords(ctx, 5).length > 0, "the weakest words are still identifiable underneath — that is the vocab list");
}

/* ---------- grammar appears once, when it is new ---------- */
{
  const withPat = S.filter(s => s.pattern);
  yes(withPat.length > 50, `${withPat.length} sentences demonstrate a named grammar pattern`);
  const ids = new Set(grammar.patterns.map(p => p.id));
  yes(withPat.every(s => ids.has(s.pattern)), "every pattern named by a sentence exists in data/grammar.json");
  const ctx = { bank, curriculum, srs: {}, log: [], now: Date.now() };
  const first = C.grammarToShow(withPat.slice(0, 3), ctx);
  yes(!!first, "a new pattern is offered for explanation");
  const after = C.grammarToShow(withPat.slice(0, 3), { ...ctx, log: [{ e: "pattern-seen", pattern: first }] });
  yes(after !== first, "and is not explained a second time once it has been seen");
}

/* ---------- the lesson runner and the nav actually reflect all this ---------- */
{
  const learn = fs.readFileSync(path.join(ROOT, "learn.html"), "utf8");
  yes(/Curriculum\.sentencesFor/.test(learn), "learn.html builds its lesson from sentences");
  yes(/Curriculum\.reviewSentencesFor/.test(learn), "…and folds review in as sentences");
  yes(/function recite\(/.test(learn) && /function decode\(/.test(learn),
    "the Qur'an track recites from memory and is tested by ear, instead of being played the audio to learn it");
  yes(/function vary\(/.test(learn), "variations are a step in the lesson");
  yes(/grammarGate/.test(learn), "a new grammar rule is explained before the sentences that use it");
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  yes(!/href="vocab\.html">📖 Vocabulary/.test(app), "Vocabulary is no longer a top-level destination");
  yes((app.match(/class="link /g) || []).length === 3, "the nav is three links");
  yes(/sentence-bank\.json/.test(app), "the sentence bank is loaded with the curriculum");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
