#!/usr/bin/env node
/* Grow the everyday half of the sentence bank into an X × Y system.
   ============================================================================
   Reza, 2026-08-30:

     "i also want to know the list of sentences then the times of its variants.
      so something like X sentences and Y variants. so X x Y to be mastered"

   That framing only works where a sentence CAN be varied, which is the everyday
   track — an ayah is fixed text and is never conjugated. So the everyday half
   needs frames, and each frame needs its verified variants.

   The supply is already in the repo and needs no authoring: data/conjugations.json
   holds 82 verbs with their FULL verified person×tense tables (the same tables
   behind the tap-a-word popover). data/sentences.json framed only 18 of them.
   This frames the rest.

   WHAT IS COMPOSED HERE, AND WHY IT IS SAFE:
     · the verb form — taken verbatim from the verified table, never derived;
     · the future — سَ + the present form, which is a rule the site already
       teaches in the conjugation table's own footer;
     · the English — built from the verb's own `base` / `pastEn` fields;
     · the object — ONLY from the hand-checked table below, and only where a
       natural object exists in the site's own vocabulary. Every object is
       written in the accusative, which for a definite noun is a final fatha.
       A verb with no entry gets NO object: "I sat" is a complete Arabic
       sentence and a perfectly good thing to drill a conjugation on.

   Run: node scripts/gen-verb-frames.js
   Then: node scripts/gen-sentences.js && python scripts/gen-audio.py
   ============================================================================ */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const F = f => path.join(ROOT, "data", f);
const D = f => JSON.parse(fs.readFileSync(F(f), "utf8"));

const conj = D("conjugations.json");
const sentences = D("sentences.json");

/* Objects, hand-checked, definite + accusative. Only verbs that plainly take one
   are listed; everything else is drilled bare. Keyed by root so a renamed verb
   id cannot silently detach its object.

   NO OBJECT MAY END IN ta marbuta. One carrying a case vowel comes back from
   romanization as alif, not ta marbuta, so a correctly-typed answer would be
   marked wrong - scripts/test-typing.js catches exactly this. Those verbs drill
   bare instead, which is honest: "I played" is a whole sentence. */
const OBJECTS = {
  "د ر س": { ar: "الدَّرْسَ", en: "the lesson" },
  "د ف ع": { ar: "الحِسَابَ", en: "the bill" },
  "ع ب د": { ar: "اللهَ", en: "Allah" },
  "هـ د ي": { ar: "النَّاسَ", en: "the people" },
  "ف ت ح": { ar: "البَابَ", en: "the door" },
  "غ ل ق": { ar: "البَابَ", en: "the door" },
  "ط ل ب": { ar: "المَاءَ", en: "water" },
  "ش ك ر": { ar: "المُعَلِّمَ", en: "the teacher" },
  "ح ف ظ": { ar: "القُرْآنَ", en: "the Qur'an" },
  "ن س ي": { ar: "الكِتَابَ", en: "the book" },
  "ت ر ك": { ar: "البَيْتَ", en: "the house" },
  "ب د أ": { ar: "الدَّرْسَ", en: "the lesson" },
  "ل ب س": { ar: "المِعْطَفَ", en: "the coat" },
  "ب ي ع": { ar: "البَيْتَ", en: "the house" },
  "ق ر أ": { ar: "القُرْآنَ", en: "the Qur'an" },
};

/* WHICH PERSONS, decided by measurement rather than by feel (his rule,
   2026-08-30: "i dont want to waste time going over variants which are not going
   to be used"). data/frequency.json counts every conjugated form against the
   whole Qur'an plus the site's own everyday sentences.

   The old set — ana / nahnu / hum — covered 40% of real verb use and never once
   drilled هُوَ, which is the commonest person in the language and the Qur'an's
   whole narrative voice. Taking the ranked cells to 90% coverage fixes that. */
let PERSONS = ["huwa", "hum", "ana", "nahnu"];
try {
  const freq = D("frequency.json");
  /* Rank by the PRESENT share only. Past-tense forms collide once vowels are
     stripped (قُلْتُ / قُلْتَ / قُلْتِ are one string), so a past-based ranking gave
     أَنْتِ the same score as أَنَا and put a person he will essentially never meet
     into the drill. Present forms are distinct per person, so they rank cleanly. */
  const pres = (freq.cells || []).filter(c => c.tense === "pres" && c.share > 0)
    .sort((a, b) => b.share - a.share).map(c => c.person);
  const picked = [...new Set(pres)].slice(0, 4);
  if (picked.length >= 3) PERSONS = picked;
} catch (e) { /* no frequency data yet — keep the sensible default */ }
/* REBUILD, don't append. The persons drilled are decided by measurement now, so
   the frames written under the old three-person assumption have to be rebuilt
   too — including the original eighteen, all of which are in the conjugation
   table. Their hand-checked objects are carried across by root, so nothing that
   was verified by hand is lost. */
const keepObj = new Map(sentences.verbs.map(v => [v.root, v.obj]).filter(([, o]) => o && o.ar));
const authored = new Map(sentences.verbs.map(v => [v.root, v]));

const added = [];
conj.verbs.forEach(v => {
  if (!v.past || !v.pres) return;
  const forms = {};
  let complete = true;
  PERSONS.forEach(p => {
    const past = v.past[p], pres = v.pres[p];
    if (!past || !pres) { complete = false; return; }
    // future = سَ + present. The site teaches this as a rule, not as stored data.
    forms[p] = { past, pres, fut: "سَ" + pres };
  });
  if (!complete) return;
  const prior = authored.get(v.root);
  const obj = OBJECTS[v.root] || keepObj.get(v.root) || { ar: "", en: "" };
  added.push({
    root: v.root,
    base: (prior && prior.base) || v.base || (v.en || "").replace(/^to\s+/, ""),
    past: (prior && prior.past) || v.pastEn || ((v.base || "") + "ed"),
    obj,
    forms,
    from: "conjugations",       // provenance: every form is table-derived
  });
});

const out = Object.assign({}, sentences, {
  note: String(sentences.note || "").split(" | Verbs")[0] +
    " | ALL verb frames are generated by scripts/gen-verb-frames.js from the verified conjugation table, with the persons chosen by measured frequency (data/frequency.json). Hand-checked objects are preserved by root. Re-run after editing data/conjugations.json.",
  persons: PERSONS.map(k => (conj.persons || []).find(p => p.key === k) || { key: k, en: k }),
  verbs: added,
});
fs.writeFileSync(F("sentences.json"), JSON.stringify(out, null, 1));

const withObj = added.filter(v => v.obj.ar).length;
const cells = PERSONS.length * 3;
console.log(`verb frames rebuilt: ${out.verbs.length} verbs x ${PERSONS.join("/")} x past/pres/fut`);
console.log(`  ${withObj} take a hand-checked object, ${added.length - withObj} drill the verb alone`);
console.log(`  X x Y  =  ${out.verbs.length} frames x ${cells} person/tense cells  =  ${out.verbs.length * cells} utterances`);
