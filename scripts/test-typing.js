/* Typing Arabic must work, because it is the one thing standing between him and
   every production question. His report (2026-08-30): "the arabic writing isnt
   appearing as i type english… being able to seamlessly or roughly type arabic
   is extremely important for this to work."

   The conversion and the forgiving grader live in js/app.js; this pins the
   behaviour so a future edit to either can't silently break typed answers.

   Run: node scripts/test-typing.js
*/
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");

/* Pull the real implementations out of js/app.js rather than reimplementing them —
   a copy here would drift from what actually runs in the browser. latinToArabic
   leans on small private helpers (expandArticles and friends), so take every
   top-level function declaration and let the unused ones sit idle. */
/* Two self-contained regions of js/app.js: the answer-matching block and the
   Arabic text/phonetic-input block. Taken by their bounding functions rather
   than by fixed line numbers, so ordinary edits above them don't break this. */
const lines = src.split("\n");
const lineOf = decl => {
  const i = lines.findIndex(l => l.startsWith(decl));
  if (i === -1) throw new Error("could not find `" + decl + "` in js/app.js — has it been renamed?");
  return i;
};
const region = (fromDecl, toDecl) => lines.slice(lineOf(fromDecl), lineOf(toDecl)).join("\n");
/* The text region carries some voice setup that runs on load. Stub the browser
   just enough for it to be harmless — the typing logic itself is pure. */
const window = { speechSynthesis: null };
const document = { addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }) };
const fetch = () => Promise.reject(new Error("no network in tests"));
class Audio {}

eval(region("function editDist(", "function wordsHtml(") +
     "\n" + region("function stripTashkeel(", "function curLoad("));
for (const n of ["stripTashkeel", "normalizeAr", "latinToArabic", "arMatch", "writeMatchAr"]) {
  if (typeof eval(n) !== "function") throw new Error("could not load " + n + "() from js/app.js");
}

let fails = 0;
const ok = m => console.log("  ✓ " + m);
const bad = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : bad(m));

/* ---------- English letters become Arabic ---------- */
/* The scheme is the documented one: a single vowel is a short vowel (fatha), a
   doubled one is the long letter — "kitaab" → كتاب, not "kitab". */
const cases = [
  ["kitaab", "كتاب", "a plain word"],
  ["al-kitaab", "الكتاب", "the definite article attaches"],
  ["kh", "خ", "a digraph makes one letter"],
  ["sh", "ش", "sh → shin"],
  ["3ayn", "عين", "3 → ayn"],
];
for (const [typed, expect, why] of cases) {
  const got = latinToArabic(typed);
  yes(normalizeAr(got) === normalizeAr(expect), `${why}: "${typed}" → ${got}`);
}
yes(/[؀-ۿ]/.test(latinToArabic("kayfa haluk")), "a whole phrase converts to Arabic script");

/* ---------- roughly-right typing is still accepted ---------- */
/* Roughly right must pass: the grader folds sound-alike letters, so plain `h`
   for ح, a dropped short vowel, or the wrong final vowel are all accepted. This
   is what makes typing Arabic survivable — spelling is not the skill on test. */
const target = "كَيْفَ حالُك؟";
for (const typed of ["kayfa haluk", "kayfa Haluk", "kayf halak", "kayfa 7aluk"]) {
  const ar = latinToArabic(typed);
  const accepted = writeMatchAr(ar, target).ok || arMatch(ar, target);
  yes(accepted, `"${typed}" is accepted for ${target}`);
}
yes(!(writeMatchAr(latinToArabic("madrasa"), target).ok || arMatch(latinToArabic("madrasa"), target)),
  "a genuinely wrong word is still marked wrong");

/* ---------- typing Arabic directly works too ---------- */
yes(writeMatchAr("كيف حالك", target).ok || arMatch("كيف حالك", target),
  "typing Arabic straight in, without tashkeel, is accepted");

/* ---------- the suggestion pool must never contain the graded answer ---------- */
{
  const lex = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lexicon.json"), "utf8")));
  yes(lex.length > 500, `the suggestion pool is broad (${lex.length} words), so chips are a keyboard aid, not multiple choice`);
  const exclude = new Set("كَيْفَ حالُك؟".split(/\s+/).map(normalizeAr));
  const testPool = lex.filter(w => !exclude.has(normalizeAr(w)));
  yes(testPool.length < lex.length, "a test's pool drops the answer's own words");
  yes(!testPool.some(w => exclude.has(normalizeAr(w))), "…so no chip can hand over the graded answer");
}

/* ---------- every answer box is actually wired ---------- */
{
  const learn = fs.readFileSync(path.join(ROOT, "learn.html"), "utf8");
  const inputs = (learn.match(/<input id="ans"/g) || []).length;
  const wired = (learn.match(/wireAnswer\("ans"/g) || []).length;
  yes(inputs > 0, `learn.html has ${inputs} answer box(es)`);
  yes(wired === inputs, `every one of them calls wireAnswer (${wired}/${inputs}) — this is the bug he reported`);
  yes(/wireAnswer\("ans", "chk", \[q\.v\.ar\]\)/.test(learn), "the TEST box excludes the answer from its suggestions");
  yes(/attachInlineTranslit/.test(learn), "learn.html uses the shared live-transliteration helper, not its own");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
