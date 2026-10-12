#!/usr/bin/env node
/* GRAMMAR FRAMES ON EVERY SENTENCE — scripts/gen-frames.js
   ============================================================================
   Reza, 2026-10-12: "build out the grammar profile in terms of content fully".

   Runs the shared tagger (js/frames.js) over the content that is NOT built by
   gen-sentences.js and stamps each sentence with
     pattern — the one frame it may be explained by (kept if hand-set)
     frames  — every frame it exercises (always recomputed)
   so that his passes and misses on ANY sentence count as grammar evidence and
   Free try can aim sentences at the frame he is weak in.

     data/chapters.json     → sentences[].pattern / frames   (+ the inline CHAPTERS
                               block in index.html is regenerated from the file,
                               so the Daily Reader and the data file never drift)
     data/prompts.json      → prompts[].pattern (filled only when missing) / frames
     data/story-NN.json     → sentences[].frames (stories are read, not drilled;
                               the bank copy carries the pattern)

   Run: node scripts/gen-frames.js   (then node scripts/gen-sentences.js,
        node scripts/gen-classes.js — they copy these fields forward)
   ============================================================================ */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const Frames = require(path.join(ROOT, "js", "frames.js"));
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const W = (f, o) => fs.writeFileSync(path.join(ROOT, "data", f), JSON.stringify(o, null, 1) + "\n");
const counts = {};
const stamp = (s, keepPattern) => {
  const d = Frames.detect(s.ar);
  if (!keepPattern || !s.pattern || s.pattern === "-") s.pattern = d.pattern;
  s.frames = d.frames;
  if (s.pattern && !s.frames.includes(s.pattern)) s.frames.unshift(s.pattern);
  counts[s.pattern || "-"] = (counts[s.pattern || "-"] || 0) + 1;
};

/* 1. chapters — and the Daily Reader's inline copy */
const chapters = D("chapters.json");
let nChap = 0;
chapters.chapters.forEach(c => (c.sentences || []).forEach(s => { stamp(s, true); nChap++; }));
W("chapters.json", chapters);
{
  const f = path.join(ROOT, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const m = html.match(/const CHAPTERS = (\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("index.html: inline CHAPTERS block not found");
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.stringify(chapters.chapters, null, 2).replace(/\n/g, eol);
  html = html.slice(0, m.index) + "const CHAPTERS = " + json + ";" + html.slice(m.index + m[0].length);
  fs.writeFileSync(f, html);
  // the two copies must parse to the same thing
  const back = JSON.parse(fs.readFileSync(f, "utf8").match(/const CHAPTERS = (\[[\s\S]*?\n\]);/)[1]);
  if (JSON.stringify(back) !== JSON.stringify(chapters.chapters)) throw new Error("inline CHAPTERS does not match chapters.json after rewrite");
}

/* 2. prompts — hand-set frames (constructed sentences) are kept */
const prompts = D("prompts.json");
let nPrompt = 0;
prompts.prompts.forEach(p => { stamp(p, true); nPrompt++; });
W("prompts.json", prompts);

/* 3. stories */
let nStory = 0;
fs.readdirSync(path.join(ROOT, "data")).filter(f => /^story-\d+\.json$/.test(f)).forEach(f => {
  const st = D(f);
  (st.sentences || []).forEach(s => { stamp(s, true); nStory++; });
  W(f, st);
});

console.log(`frames: ${nChap} chapter sentences, ${nPrompt} prompts, ${nStory} story sentences stamped`);
console.log("  labels:", Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
