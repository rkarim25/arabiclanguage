#!/usr/bin/env node
/* Conjugation builder for data/conjugations.json.
   Authoring 8 past + 8 present forms per verb by hand invites errors, and this
   file is a reference surface — an error here teaches an error. So the forms are
   DERIVED by rule, and the rules are proved by regenerating every verb that was
   already verified: `node scripts/gen-conj.js --check` must report 0 mismatches.

   Per verb you supply only what a rule cannot know:
     past3 / pres3  — the 3rd-person masculine singular of each tense
     pastC          — the past stem before consonant endings (-tu, -ta, -na),
                      needed for hollow (qāla -> qul-) and doubled (aḥabba ->
                      aḥbab-) verbs; defaults to the past stem itself
     forms          — explicit overrides for anything genuinely irregular
   Weak-lām (defective) verbs — daʿā, mashā, hadā — do not follow the suffix
   rules at all, so their tables are given in full and only sanity-checked.  */

const fs = require("fs");
const path = require("path");

const PERSONS = ["ana", "anta", "anti", "huwa", "hiya", "nahnu", "antum", "hum"];
const FATHA = "َ", DAMMA = "ُ", KASRA = "ِ", SUKUN = "ْ", SHADDA = "ّ";

/* This file writes a short vowel BEFORE any shadda (kun-nā = ك ُ ن َ ّ ا), so a
   "final vowel" may sit one slot in from the end. Both helpers respect that. */
const VOWEL = `[${FATHA}${DAMMA}${KASRA}]`;
const setFinalVowel = (s, v) => s.replace(new RegExp(`${VOWEL}(${SHADDA}?)$`), v + "$1");
const dropFinalVowel = s => s.replace(new RegExp(`${VOWEL}(${SHADDA}?)$`), "$1");
/* A hamza takes its seat from the vowel it carries: qara'-ū -> قَرَؤُوا (wāw seat),
   taqra'-īna -> تَقْرَئِينَ (yā' seat). */
const seat = s => s.replace(new RegExp(`أ(${DAMMA})$`), "ؤ$1").replace(new RegExp(`أ(${KASRA})$`), "ئ$1");

function pastTable(v) {
  const cons = v.pastC || dropFinalVowel(v.past3);  // stem before -tu/-ta/-nā
  const t = {
    huwa: v.past3,
    hiya: v.past3 + "ت" + SUKUN,                        // -at
    hum: seat(setFinalVowel(v.past3, DAMMA)) + "وا",  // -ū
    ana: cons + SUKUN + "ت" + DAMMA,                    // -tu
    anta: cons + SUKUN + "ت" + FATHA,                   // -ta
    anti: cons + SUKUN + "ت" + KASRA,                   // -ti
    antum: cons + SUKUN + "ت" + DAMMA + "م" + SUKUN,    // -tum
    nahnu: cons + SUKUN + "ن" + FATHA + "ا",            // -nā
  };
  // a stem-final nūn merges with the nūn of -nā into one doubled nūn: kun -> kunnā
  if (new RegExp("ن$").test(cons)) t.nahnu = cons + FATHA + SHADDA + "ا";
  return t;
}

function presTable(v) {
  const rest = v.pres3.slice(1);          // drop the yā' prefix, keep the vowel under it
  const withT = "ت" + rest;
  let ana = ("أ" + rest).replace(new RegExp(`^أ${FATHA}أ${SUKUN}`), "آ"); // 'a-'kulu -> ākulu
  return {
    ana,
    anta: withT,
    hiya: withT,
    nahnu: "ن" + rest,
    huwa: v.pres3,
    anti: seat(setFinalVowel(withT, KASRA)) + "ين" + FATHA,      // -īna
    antum: seat(setFinalVowel(withT, DAMMA)) + "ون" + FATHA,     // -ūna
    hum: seat(setFinalVowel(v.pres3, DAMMA)) + "ون" + FATHA,     // -ūna
  };
}

function build(v) {
  const out = {
    id: v.id, root: v.root, en: v.en, base: v.base, pastEn: v.pastEn,
    past3: v.past3, pres3: v.pres3,
    past: v.past || pastTable(v),
    pres: v.pres || presTable(v),
  };
  if (v.forms) { Object.assign(out.past, v.forms.past || {}); Object.assign(out.pres, v.forms.pres || {}); }
  for (const p of PERSONS) {
    if (!out.past[p] || !out.pres[p]) throw new Error(`${v.id}: missing ${p}`);
  }
  return out;
}

/* ---- sanity checks that catch a fat-fingered table ---- */
function audit(v) {
  const problems = [];
  const arabicOnly = /^[؀-ۿ\s]+$/;
  for (const tense of ["past", "pres"]) {
    for (const p of PERSONS) {
      const f = v[tense][p];
      if (!arabicOnly.test(f)) problems.push(`${v.id}.${tense}.${p}: non-Arabic "${f}"`);
      if (/\s/.test(f)) problems.push(`${v.id}.${tense}.${p}: contains a space`);
    }
    const vals = PERSONS.map(p => v[tense][p]);
    if (new Set(vals).size < 5) problems.push(`${v.id}.${tense}: suspiciously few distinct forms`);
  }
  if (v.past.huwa !== v.past3) problems.push(`${v.id}: past.huwa != past3`);
  if (v.pres.huwa !== v.pres3) problems.push(`${v.id}: pres.huwa != pres3`);
  // every present form must start with one of the four imperfect prefixes
  for (const p of PERSONS) {
    if (!/^[أآتين]/.test(v.pres[p])) problems.push(`${v.id}.pres.${p}: bad prefix`);
  }
  return problems;
}


// hollow/doubled past stems used before consonant endings, for the existing verbs
const PAST_C = {
  qala: "قُل", zara: "زُر", kana: "كُن",
  ahabba: "أَحْبَب",
  istaana: "اسْتَعَن",
};
// weak-lām verbs: the suffix rules genuinely do not apply
const EXPLICIT = new Set(["salla", "raa", "hada"]);

module.exports = { build, audit, pastTable, presTable, PERSONS, PAST_C, EXPLICIT };

if (require.main === module && process.argv.includes("--check")) {
  const file = path.join(__dirname, "..", "data", "conjugations.json");
  const cur = JSON.parse(fs.readFileSync(file, "utf8"));
  // specs carry the facts a rule cannot infer (pastC, and hand-written tables)
  const specs = {};
  for (const s of require("./new-verbs.js")) specs[s.id] = s;
  let bad = 0, ok = 0; const explicit = [];
  for (const v of cur.verbs) {
    const spec = specs[v.id] || {};
    if (EXPLICIT.has(v.id) || spec.past || spec.pres || spec.forms) { explicit.push(v.id); continue; }
    let gen;
    try { gen = build({ ...v, pastC: spec.pastC || PAST_C[v.id], past: undefined, pres: undefined }); }
    catch (e) { console.log("BUILD FAIL", v.id, e.message); bad++; continue; }
    const diffs = [];
    for (const t of ["past", "pres"]) for (const p of PERSONS) {
      if (gen[t][p] !== v[t][p]) diffs.push(`${t}.${p}: rule="${gen[t][p]}" file="${v[t][p]}"`);
    }
    if (!diffs.length) ok++;
    else if (EXPLICIT.has(v.id)) explicit.push(v.id);
    else { bad++; console.log(`MISMATCH ${v.id} (${v.past3}):`); diffs.forEach(d => console.log("   " + d)); }
  }
  console.log(`\nrule-generated exactly: ${ok}/${cur.verbs.length}`);
  console.log(`declared irregular (kept verbatim): ${explicit.join(", ") || "none"}`);
  console.log(bad ? `\n${bad} UNEXPLAINED MISMATCH(ES)` : "\n0 unexplained mismatches — rules agree with every verified verb");
  process.exit(bad ? 1 : 0);
}

if (require.main === module && process.argv.includes("--write")) {
  const file = path.join(__dirname, "..", "data", "conjugations.json");
  const cur = JSON.parse(fs.readFileSync(file, "utf8"));
  const have = new Set(cur.verbs.map(v => v.id));
  const problems = [];
  let added = 0;
  for (const spec of require("./new-verbs.js")) {
    if (have.has(spec.id)) { console.log("skip (already present):", spec.id); continue; }
    let built;
    try { built = build(spec); } catch (e) { problems.push(`${spec.id}: ${e.message}`); continue; }
    const p = audit(built);
    if (p.length) { problems.push(...p); continue; }
    cur.verbs.push(built); have.add(spec.id); added++;
  }
  // all-or-nothing: one bad table must not ship alongside good ones
  if (problems.length) { console.log("AUDIT FAILURES:\n" + problems.join("\n")); process.exit(1); }
  const ids = cur.verbs.map(v => v.id);
  if (new Set(ids).size !== ids.length) { console.log("duplicate verb ids"); process.exit(1); }
  fs.writeFileSync(file, JSON.stringify(cur, null, 2) + "\n");
  console.log(`added ${added} verbs — ${cur.verbs.length} total, every audit clean`);
}
