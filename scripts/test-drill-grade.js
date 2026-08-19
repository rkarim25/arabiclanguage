/* Drill grading tiers — guards the 2026-08-19 change that stopped the rapid-fire
   drill reporting a near-miss phrase as a flat ✗ (his ph-help bail-out).
   The tier logic here MUST mirror vocab.html's submit():
     exact = arMatch(...)                       → perfect ✓
     else g = writeMatchAr(first alternate)
     ok   = exact || g.ok                       → counts as right (amber if by sound)
     part = !ok && g.right > 0                  → "n of m words", still a miss for SRS
   Run: node scripts/test-drill-grade.js */
const fs = require("fs"), vm = require("vm");
// app.js is browser code: stub just enough that it evaluates to the END of the
// file. A throw part-way leaves later `const`s in TDZ and the matchers break in
// confusing ways, so a load error here is fatal, not something to swallow.
const noop = () => {};
const el = () => ({ style: {}, classList: { add: noop, remove: noop, toggle: noop },
  addEventListener: noop, appendChild: noop, querySelector: () => null,
  querySelectorAll: () => [], setAttribute: noop, remove: noop });
const ctx = vm.createContext({
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}), text: () => Promise.resolve("") }),
  window: { addEventListener: noop, location: { href: "", search: "" }, matchMedia: () => ({ matches: false, addEventListener: noop }) },
  document: { addEventListener: noop, readyState: "complete", getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el() },
  navigator: { userAgent: "node", language: "en" },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  speechSynthesis: { getVoices: () => [], speak: noop, cancel: noop },
});
ctx.globalThis = ctx; ctx.self = ctx;
vm.runInContext(fs.readFileSync("js/app.js", "utf8"), ctx);
const { arMatch, writeMatchAr } = ctx;
if (!arMatch || !writeMatchAr) { console.error("app.js did not expose the matchers"); process.exit(1); }

function grade(typed, ar) {
  const exact = arMatch(typed, ar);
  const g = exact ? null : writeMatchAr(typed, String(ar).split("/")[0]);
  const ok = exact || (g && g.ok);
  if (exact) return { tier: "perfect", right: g ? g.right : null };
  if (ok) return { tier: "sound", right: g.right };
  if (g && g.right > 0) return { tier: "part", right: g.right, total: g.total };
  return { tier: "miss", right: 0 };
}

let fail = 0;
const t = (label, typed, ar, want) => {
  const r = grade(typed, ar);
  const good = r.tier === want;
  if (!good) fail++;
  console.log(`  ${good ? "✓" : "✗"} ${label} — ${r.tier}${r.total ? ` (${r.right}/${r.total})` : ""}${good ? "" : `  EXPECTED ${want}`}`);
};

console.log("His real drill inputs (2026-08-19, ph-help):");
// was: flat ✗ with no credit, and he quit two items later
t("'العَرَبِيَتِ بَصيت' for عَرَبِيَّتِي بَسِيطَة", "العَرَبِيَتِ بَصيت", "عَرَبِيَّتِي بَسِيطَة", "part");
t("blank for تَكَلَّمْ بِبُطْءٍ مِنْ فَضْلِك", "", "تَكَلَّمْ بِبُطْءٍ مِنْ فَضْلِك", "miss");

console.log("\nPerfect answers still read perfect (no regression):");
t("exact single word", "كِتاب", "كِتاب", "perfect");
t("exact phrase", "لا أَفْهَم", "لا أَفْهَم", "perfect");
t("exact, undiacritized", "لا افهم", "لا أَفْهَم", "perfect");
// the box runs attachInlineTranslit, so by submit time "kitab" is already كتاب
t("typed via inline translit", "كتاب", "كِتاب", "perfect");
// a single sound-alike slip was ALREADY forgiven at the top tier by arMatch
// (pre-dates this change) — pinned here so a future arMatch edit shows up
t("one ص→س slip stays perfect (arMatch)", "سَباح الخير", "صَباحُ الخَيْر", "perfect");

console.log("\nSound-right whole answers count (amber ✓, spelling shown):");
// two ذ→ز slips: too far for arMatch, every word right by sound — the new amber tier
t("ذ→ز twice in one phrase", "مازا يعني هزا", "ماذا يَعْنِي هٰذا؟", "sound");
// Mixed Latin/Arabic never reaches submit (the box converts as he types), but if
// it did it still earns word credit rather than a flat ✗
t("mixed script still earns credit", "maza yaعni haza", "ماذا يَعْنِي هٰذا؟", "part");

console.log("\nPartial credit where he earned it:");
t("1 of 2 words", "أَعِدْ فلان", "أَعِدْ مِنْ فَضْلِك", "part");

console.log("\nNonsense still misses (grading stays honest):");
t("unrelated word", "بيت", "لا أَعْرِف", "miss");
t("blank single word", "", "كِتاب", "miss");

console.log(fail ? `\n${fail} FAILED` : "\nALL TESTS PASS");
process.exit(fail ? 1 : 0);
