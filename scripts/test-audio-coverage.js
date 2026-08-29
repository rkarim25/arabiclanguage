/* Every Arabic string the site SPEAKS must resolve to a real clip.
   Two real bugs live here, both silent (they degrade to the robot voice Reza
   hates, with no error anywhere):

   1. gen-audio.py collected story VOCAB but never story SENTENCES, questions
      or tappable words — story.html speaks all of them. (his pen note on the
      story-02 page, "again the audio doesn't work", 2026-08-13)
   2. gen-audio.py's norm_ar drifted from js/app.js normalizeAr: ؟ ، ؛ sit
      INSIDE the Arabic unicode block, so the [^؀-ۿ\s] filter can't drop them.
      Keys that keep them are keys the browser can never look up — 100 clips,
      including the Umrah phrases, were unreachable.

   Run: node scripts/test-audio-coverage.js
*/
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

// use the REAL normalizeAr out of js/app.js — the browser's lookup, not a copy
const appSrc = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
const fnSrc = ["stripTashkeel", "normalizeAr"].map(n => {
  const m = appSrc.match(new RegExp("^function " + n + "\\([\\s\\S]*?^}", "m"));
  if (!m) throw new Error("could not find " + n + "() in js/app.js");
  return m[0];
}).join("\n");
eval(fnSrc);

const man = D("audio-manifest.json");
const strip = s => String(s).replace(/[.،«»!؟]/g, "");
let fails = 0;
const fail = m => { console.log("  ✗ " + m); fails++; };
const ok = m => console.log("  ✓ " + m);

/* 1 — no manifest key may carry punctuation normalizeAr strips (the drift signature) */
const dead = Object.keys(man.ar).filter(k => /[؟،؛]/.test(k));
dead.length ? fail(`${dead.length} unreachable manifest keys (norm_ar drifted from normalizeAr): ${dead.slice(0, 3).join(" | ")}`)
            : ok("every manifest key is one the browser can actually look up");

/* 2 — everything story.html speaks */
let sent = 0, quest = 0, tok = 0;
const missing = [];
for (const f of fs.readdirSync(path.join(ROOT, "data")).filter(f => /^story-\d+\.json$/.test(f))) {
  const st = D(f);
  for (const s of st.sentences || []) {
    sent++;
    if (!man.ar[normalizeAr(s.ar)]) missing.push(`${f} sentence "${s.ar.slice(0, 24)}…"`);
    for (const [w] of s.words || []) {
      const c = strip(w); if (!c) continue;
      tok++; if (!man.ar[normalizeAr(c)]) missing.push(`${f} word ${c}`);
    }
  }
  for (const q of st.questions || []) {
    quest++;
    if (!man.ar[normalizeAr(q.q)]) missing.push(`${f} question "${q.q.slice(0, 24)}…"`);
    for (const o of q.options || []) for (const w of o.split(/\s+/)) {
      const c = strip(w); if (!c) continue;
      tok++; if (!man.ar[normalizeAr(c)]) missing.push(`${f} option word ${c}`);
    }
  }
}
missing.length ? fail(`${missing.length} spoken story strings have no clip: ${missing.slice(0, 3).join(", ")}`)
               : ok(`all ${sent} story sentences, ${quest} questions and ${tok} tappable words have a clip`);

/* 3 — the phrase deck: whole sentences, spoken on every card */
const phMiss = D("phrases.json").groups.flatMap(g => g.members).filter(m => !man.ar[normalizeAr(m.ar)]);
phMiss.length ? fail(`${phMiss.length} phrases have no clip: ${phMiss.slice(0, 3).map(m => m.ar).join(" | ")}`)
              : ok("every phrase-deck sentence has a clip");

/* 4 — the manifest never promises a file that isn't there */
const gone = [];
for (const lang of ["ar", "en"])
  for (const [k, name] of Object.entries(man[lang]))
    if (!fs.existsSync(path.join(ROOT, "audio", lang, name + ".mp3"))) gone.push(`${lang}:${k}`);
gone.length ? fail(`${gone.length} manifest entries point at a missing file: ${gone.slice(0, 3).join(", ")}`)
            : ok(`all ${Object.keys(man.ar).length + Object.keys(man.en).length} manifest entries resolve to a real file`);

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
