/* gen-slots.js — built sentences, not only selected ones (COACH-LOOP gap B, 12 Oct)
   data/slot-frames.json: vetted frames × fillers that carry their own case ending and gender
   → data/generated-sentences.json (src "gen"). gen-sentences.js folds them into the bank, so
   Free try, the commute and the Master Bank all see them; the lexical gate still applies, so
   a built sentence only appears when he holds its words. Rules: ≤ 7 words, no duplicate of
   anything already in the bank, every line tagged by js/frames.js.
   Run: node scripts/gen-slots.js   (before gen-sentences.js) */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const Frames = require(path.join(ROOT, "js", "frames.js"));
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const norm = s => String(s || "").replace(/[ً-ٰـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[؟،؛.!?,]/g, "").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();
const frames = D("slot-frames.json").frames;
let existing = new Set();
try { D("sentence-bank.json").sentences.forEach(s => { if (s.src !== "gen") existing.add(norm(s.ar)); }); } catch (e) {}
try { D("myday.json").sentences.forEach(s => existing.add(norm(s.ar))); } catch (e) {}

const fill = (tpl, vals) => tpl.replace(/\{(\w+)\}/g, (m, k) => (vals[k] != null ? vals[k] : m));
const tidy = s => s.replace(/\s+/g, " ").replace(/ ؟/g, "؟").trim();
const enTidy = s => { s = s.replace(/\s+/g, " ").trim(); return s.charAt(0).toUpperCase() + s.slice(1) + (/[?.!]$/.test(s) ? "" : "."); };
const out = [];
const seen = new Set();
const push = (fr, ar, en, extra) => {
  ar = tidy(ar);
  const n = norm(ar);
  const words = ar.replace(/[.،؟!]/g, "").split(/\s+/).filter(Boolean).length;
  if (!n || seen.has(n) || existing.has(n) || words > 7) return;
  seen.add(n);
  const det = Frames.detect(ar);
  out.push(Object.assign({ id: `gen:${fr.id}:${out.length}`, frameId: fr.id, ar, en: enTidy(en), tr: "", pattern: det.pattern, frames: det.frames, theme: fr.theme || "built for you", gender: fr.gender || null }, extra || {}));
};
frames.forEach(fr => {
  if (fr.pairs) {
    fr.pairs.forEach(p => p.a.forEach(a => {
      const vals = { s: p.s.ar, a: a.ar, v: a.ar, d: "", n: "" };
      // the 'hadha' frame carries demonstrative + noun in s
      const ar = fr.id === "hadha" ? `${p.s.ar} ${a.ar}` : fill(fr.ar, vals);
      const m = fr.id === "hadha" ? p.s.en.match(/^(a|an) (.+)$/) : null;
      const en = fr.id === "hadha" ? (m ? `This is ${/^[aeiou]/i.test(a.en) ? "an" : "a"} ${a.en} ${m[2]}` : `This is ${a.en} ${p.s.en}`) : fill(fr.en, { s: p.s.en, a: a.en, v: a.en });
      push(fr, ar, en);
    }));
    return;
  }
  const names = Object.keys(fr.slots);
  const combos = (i, vals) => {
    if (i === names.length) { push(fr, fill(fr.ar, vals.ar), fill(fr.en, vals.en)); return; }
    fr.slots[names[i]].forEach(f => combos(i + 1, { ar: Object.assign({}, vals.ar, { [names[i]]: f.ar }), en: Object.assign({}, vals.en, { [names[i]]: f.en }) }));
  };
  combos(0, { ar: {}, en: {} });
});
const json = { version: 1, built: new Date().toISOString().slice(0, 10), note: "built by scripts/gen-slots.js from data/slot-frames.json — do not hand-edit", sentences: out };
fs.writeFileSync(path.join(ROOT, "data", "generated-sentences.json"), JSON.stringify(json, null, 1));
const byFrame = {};
out.forEach(s => { byFrame[s.frameId] = (byFrame[s.frameId] || 0) + 1; });
console.log(`generated-sentences.json: ${out.length} sentences · ${JSON.stringify(byFrame)}`);
