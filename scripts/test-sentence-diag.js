/* Sentence Practice: naming the wrong CELL he produced (2026-08-19).
   His logged answers were graded exact:false but the screen still said "8/8
   built cleanly" and never said what was wrong. diagnoseVerb() names the cell.
   The function under test is pulled out of sentences.html itself, so this test
   fails if the page edit drifts. Run: node scripts/test-sentence-diag.js */
const fs = require("fs"), vm = require("vm");
const noop = () => {};
const el = () => ({ style: {}, classList: { add: noop, remove: noop }, addEventListener: noop,
  appendChild: noop, querySelector: () => null, querySelectorAll: () => [], setAttribute: noop });
const ctx = vm.createContext({
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve("") }),
  window: { addEventListener: noop, location: { href: "", search: "" }, matchMedia: () => ({ matches: false, addEventListener: noop }) },
  document: { addEventListener: noop, readyState: "complete", getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el() },
  navigator: { userAgent: "node" }, localStorage: { getItem: () => null, setItem: noop },
  speechSynthesis: { getVoices: () => [], speak: noop, cancel: noop },
});
ctx.globalThis = ctx; ctx.self = ctx;
vm.runInContext(fs.readFileSync("js/app.js", "utf8"), ctx);

const page = fs.readFileSync("sentences.html", "utf8");
const src = page.match(/function diagnoseVerb\(typed, it\) \{[\s\S]*?\n\}/);
if (!src) { console.error("diagnoseVerb not found in sentences.html — did the page change?"); process.exit(1); }
const DATA = JSON.parse(fs.readFileSync("data/sentences.json", "utf8"));
ctx.DATA = DATA;
vm.runInContext(src[0], ctx);
const { diagnoseVerb } = ctx;

const item = (base, personKey, tenseKey) => {
  const v = DATA.verbs.find(x => x.base === base);
  if (!v) throw new Error("no verb " + base);
  return { form: v.forms[personKey][tenseKey], forms: v.forms,
    person: DATA.persons.find(p => p.key === personKey),
    tense: DATA.tenses.find(t => t.key === tenseKey) };
};

let fail = 0;
const t = (label, typed, base, personKey, tenseKey, want) => {
  const d = diagnoseVerb(typed, item(base, personKey, tenseKey));
  const got = d ? d.person.key + ":" + d.tense.key : null;
  const good = got === want;
  if (!good) fail++;
  console.log(`  ${good ? "✓" : "✗"} ${label} → ${got || "no cell match"}${good ? "" : `  EXPECTED ${want}`}`);
};

console.log("His real answers, 2026-08-18/19 (all logged exact:false, all shown as 'got it'):");
// asked for "we said" — he wrote the they-present form
t("'يَقولونَ الحَقَّ' asked we/past", "يَقولونَ الحَقَّ", "say", "nahnu", "past", "hum:pres");
// asked for "they say" — he wrote the they-future form
t("'ساقولونَ الحَقَّ' asked they/pres", "ساقولونَ الحَقَّ", "say", "hum", "pres", null);
// asked for "I go (past)" — correct verb, so no cell diagnosis
t("'ذَهَبتُ المَسْجِدِ' asked I/past", "ذَهَبتُ المَسْجِدِ", "go", "ana", "past", null);

console.log("\nThe confusion the diagnosis exists to name:");
t("they-past written for we-past", "قَالُوا الحَقَّ", "say", "nahnu", "past", "hum:past");
t("we-present written for we-future", "نَقُولُ الحَقَّ", "say", "nahnu", "fut", "nahnu:pres");
t("I-past written for we-past", "قُلْتُ الحَقَّ", "say", "nahnu", "past", "ana:past");
t("they-future written for they-present", "سَيَقُولُونَ الحَقَّ", "say", "hum", "pres", "hum:fut");

console.log("\nNo false accusations:");
t("correct answer diagnoses nothing", "قُلْنَا الحَقَّ", "say", "nahnu", "past", null);
t("undiacritized correct answer", "قلنا الحق", "say", "nahnu", "past", null);
t("empty input", "", "say", "nahnu", "past", null);
t("a word that is not this verb at all", "بيت كبير", "say", "nahnu", "past", null);

console.log(fail ? `\n${fail} FAILED` : "\nALL TESTS PASS");
process.exit(fail ? 1 : 0);
