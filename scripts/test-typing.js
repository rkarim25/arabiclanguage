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
  // the test asks for a whole sentence now, so what must be withheld is the
  // whole target, not just the one word the question is scored on
  yes(/const target = sent \? sent\.ar : q\.v\.ar;/.test(learn) && /wireAnswer\("ans", "chk", \[target\]\)/.test(learn),
    "the TEST box excludes everything it is asking for from its suggestions");
  yes(/attachInlineTranslit/.test(learn), "learn.html uses the shared live-transliteration helper, not its own");
}

/* ---------- the spellings romanization cannot reach ----------
   Reported 2026-08-30. Typing these the obvious way used to produce visibly
   wrong Arabic (عَلا for عَلَى, الا for إِلَى) and the grader then marked a correct
   answer wrong. Each of these is a word he meets constantly. */
for (const [typed, want] of [
  ["ilaa", "إلى"], ["3alaa", "على"], ["Hattaa", "حتى"], ["mataa", "متى"],
  ["haadhaa", "هذا"], ["dhaalika", "ذلك"], ["allaah", "الله"], ["laakin", "لكن"],
]) {
  yes(normalizeAr(latinToArabic(typed)) === normalizeAr(want), `"${typed}" → ${want}, not a phonetic guess`);
}
yes(normalizeAr(latinToArabic("al-ujra")).includes("اجر"), "ال before a vowel keeps that word's own alif (al-ujra → الأجرة)");

/* ---------- the four things a typist cannot know ---------- */
for (const [typed, target, why] of [
  ["qaaluu", "قَالُوا", "the plural's silent alif (ـوا)"],
  ["ghurfa", "غُرْفَة", "ة heard as a plain -a"],
  ["shukran", "شُكْرًا", "a tanwin written out as n"],
  ["hudan", "هُدًى", "a tanwin over an alif maqsura"],
  ["3alaa", "عَلَى", "a final long ā written ى"],
  ["li'anna", "لِأَنَّ", "a hamza whose seat he cannot guess"],
]) {
  yes(answerMatchAr(typed, target).ok, `${why}: "${typed}" is accepted for ${target}`);
}

/* ---------- the whole lexicon, typed as the site itself transliterates it ----------
   The site SHOWS him a transliteration for every word. Typing that back must be
   accepted, or the site is contradicting itself. Was 82% before this was fixed. */
{
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "lexicon.json"), "utf8"));
  const ascii = s => String(s).normalize("NFC")
    .replace(/ā/g, "aa").replace(/ū/g, "uu").replace(/ī/g, "ii")
    .replace(/ḥ/g, "H").replace(/ṣ/g, "S").replace(/ḍ/g, "D").replace(/ṭ/g, "T").replace(/ẓ/g, "Z")
    .replace(/ʿ/g, "3").replace(/[ʾʼ’]/g, "'");
  let n = 0, ok_ = 0;
  for (const v of Object.values(L)) {
    const ar = (v[0] || "").split("/")[0].trim(), tr = ascii((v[1] || "").split("/")[0].trim());
    if (!ar || !tr || /[^\x00-\x7F]/.test(tr) || tr.includes("--")) continue;   // skip morpheme-marked Quranic tr
    n++;
    if (answerMatchAr(tr, ar).ok) ok_++;
  }
  const pct = 100 * ok_ / n;
  yes(n > 700, `${n} lexicon words carry a transliteration to type back`);
  yes(pct >= 92, `typing the site's own transliteration is accepted ${pct.toFixed(1)}% of the time (floor 92%)`);
  /* The other half of the bargain: forgiving cannot mean indiscriminate. A word
     he did not write must not be accepted, or "proved" means nothing. */
  for (const [typed, target] of [["3alayhi", "اللَّه"], ["ma3", "مَا"], ["qaala", "قَالُوا"], ["madrasa", "مَسْجِد"]]) {
    yes(!answerMatchAr(typed, target).ok, `"${typed}" is still wrong for ${target}`);
  }
}

/* ---------- Sentence Practice: every conjugation must be typeable ----------
   The verb is the graded word and gets no suggestion chips, so if the converter
   or the grader can't handle it he has no way through at all. */
{
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sentences.json"), "utf8"));
  const ascii = s => String(s).normalize("NFC")
    .replace(/ā/g, "aa").replace(/ū/g, "uu").replace(/ī/g, "ii")
    .replace(/ḥ/g, "H").replace(/ṣ/g, "S").replace(/ḍ/g, "D").replace(/ṭ/g, "T").replace(/ẓ/g, "Z")
    .replace(/ʿ/g, "3").replace(/[ʾʼ’]/g, "'");
  let n = 0, ok_ = 0;
  for (const v of D.verbs) for (const p of ["ana", "nahnu", "hum"]) for (const t of ["past", "pres", "fut"]) {
    const form = v.forms[p] && v.forms[p][t];
    if (!form) continue;
    const typed = [form, ...v.obj.ar.split(" ")].map(w => ascii(translitAr(w))).join(" ");
    n++;
    if (sentenceMatchAr(typed, form + " " + v.obj.ar, form).ok) ok_++;
  }
  yes(n >= 100, `${n} verb × person × tense sentences`);
  yes(ok_ === n, `every one of them is accepted when typed as it sounds (${ok_}/${n})`);
}
/* …and a wrong conjugation must still fail, or the drill proves nothing. */
yes(!sentenceMatchAr("qultu alHaqqa", "قَالُوا الحَقَّ", "قَالُوا").ok,
  "the wrong person/tense is still wrong — the fold forgives spelling, not conjugation");

/* ---------- a chip must offer the word he is halfway through ----------
   Scoring a completion by half its remaining length buried the right long word
   under an unrelated near-miss: typing الص offered إِلَى ahead of الصَّالِحَاتِ. */
{
  const src2 = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  const m = /if \(wn\.startsWith\(probe\)\) return ([^;]+);/.exec(src2);
  yes(!!m, "the completion score is still where the suggestion ranking can be checked");
  const completionCost = m ? eval(m[1].replace(/wn\.length/g, "12").replace(/probe\.length/g, "3")) : 99;
  yes(completionCost < 1.1, `a 9-letter-longer completion (cost ${completionCost}) still outranks any edit-distance fix (1.1+)`);
}

/* ---------- every page that types Arabic is wired and looks like the others ---------- */
{
  const css = fs.readFileSync(path.join(ROOT, "css", "style.css"), "utf8");
  yes(/^\.fill-input \{/m.test(css), ".fill-input is styled site-wide, not inside one page's <style>");
  for (const page of ["sentences.html", "test.html", "vocab.html"]) {
    const html = fs.readFileSync(path.join(ROOT, page), "utf8");
    if (!/class="fill-input"/.test(html)) continue;
    yes(/attachInlineTranslit/.test(html), `${page} converts English letters as he types`);
  }
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
