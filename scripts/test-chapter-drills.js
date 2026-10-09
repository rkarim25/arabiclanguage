/* 🎯 Sentence variation drills — guards data/chapter-drills.json against drift.
   Every Daily Reader sentence that has drills must have exactly three rungs
   (1 swap a word · 2 change who / ask · 3 build on it), every rung a short,
   fully vowelled Arabic line with a clip the browser can actually play, and
   the file must be wired into the audio generator and the service worker.
   Run: node scripts/test-chapter-drills.js */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const T = f => fs.readFileSync(path.join(ROOT, f), "utf8");

// the REAL normalizeAr out of js/app.js — the browser's audio lookup, not a copy
const appSrc = T("js/app.js");
const fnSrc = ["stripTashkeel", "normalizeAr"].map(n => {
  const m = appSrc.match(new RegExp("^function " + n + "\\([\\s\\S]*?^}", "m"));
  if (!m) throw new Error("could not find " + n + "() in js/app.js");
  return m[0];
}).join("\n");
eval(fnSrc);

let fails = 0;
const fail = m => { console.log("  ✗ " + m); fails++; };
const ok = m => console.log("  ✓ " + m);

const drills = D("chapter-drills.json").chapters || {};
const chapters = D("chapters.json").chapters || [];
const man = D("audio-manifest.json");
const html = T("index.html");

/* 1 — shape: every drilled chapter exists, one entry per sentence, rungs 1-2-3 */
let items = 0, bad = [];
const seenAr = new Map();
for (const [cid, sents] of Object.entries(drills)) {
  const ch = chapters.find(c => c.id === cid);
  if (!ch) { bad.push(`${cid}: not a chapter`); continue; }
  if (!Array.isArray(sents) || sents.length !== ch.sentences.length) { bad.push(`${cid}: ${sents.length} entries for ${ch.sentences.length} sentences`); continue; }
  sents.forEach((rungs, i) => {
    const got = rungs.map(d => d.rung).sort().join(",");
    if (got !== "1,2,3") bad.push(`${cid}#${i}: rungs ${got}`);
    rungs.forEach(d => {
      items++;
      const tag = `${cid}#${i} r${d.rung}`;
      if (!d.ar || !d.en || !d.tr || !d.swap) bad.push(`${tag}: missing ar/en/tr/swap`);
      if (d.ar && !/[ً-ْ]/.test(d.ar)) bad.push(`${tag}: no tashkeel`);
      const words = String(d.ar || "").replace(/[.،؟!]/g, "").split(/\s+/).filter(Boolean);
      if (words.length > 8) bad.push(`${tag}: ${words.length} words (max 8)`);
      if (d.ar === ch.sentences[i].ar) bad.push(`${tag}: identical to the base sentence`);
      const k = normalizeAr(d.ar || "");
      if (seenAr.has(k)) bad.push(`${tag}: duplicate of ${seenAr.get(k)}`); else seenAr.set(k, tag);
    });
  });
}
bad.length ? fail(`${bad.length} shape problems: ${bad.slice(0, 4).join(" | ")}`)
           : ok(`${items} drill lines across ${Object.keys(drills).length} chapters — three rungs each, short, vowelled, unique`);

/* 2 — a clip for every line the 🔊 and the reveal will speak */
const noClip = [];
for (const sents of Object.values(drills)) for (const rungs of sents) for (const d of rungs) {
  if (d.ar && !man.ar[normalizeAr(d.ar)]) noClip.push(d.ar);
}
noClip.length ? fail(`${noClip.length} drill lines have no audio clip — run python scripts/gen-audio.py: ${noClip.slice(0, 3).join(" | ")}`)
              : ok("every drill line has a generated clip");

/* 3 — wiring: loader, generator, offline cache, plan credit */
html.includes('fetch("data/chapter-drills.json")') ? ok("index.html loads the drills") : fail("index.html does not fetch data/chapter-drills.json");
T("scripts/gen-audio.py").includes("chapter-drills.json") ? ok("gen-audio.py reads the drills") : fail("gen-audio.py does not read chapter-drills.json — new lines would ship silent");
T("sw.js").includes("data/chapter-drills.json") ? ok("sw.js caches the drills for the commute") : fail("sw.js CORE is missing data/chapter-drills.json");
/"sent-drill"/.test(T("js/plan.js")) ? ok("a drill pass credits the plan's speak block") : fail("plan.js does not count sent-drill events");
["renderDayDrillHtml", "drillMic", "drillCheckTyped", "drillSelf", "drillRungDone"].forEach(fn => {
  new RegExp("function " + fn + "\\(").test(html) ? ok(`index.html defines ${fn}()`) : fail(`index.html is missing ${fn}()`);
});

/* 4 — the inline <script> still parses with the engine in it */
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let parseErr = null;
for (const s of scripts) { try { new Function(s); } catch (e) { parseErr = e.message; break; } }
parseErr ? fail(`index.html inline script does not parse: ${parseErr}`) : ok(`index.html inline scripts parse (${scripts.length})`);

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
