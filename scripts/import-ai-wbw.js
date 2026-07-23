#!/usr/bin/env node
/*
 * Merge the AI word-by-word meanings from Reza's Quran site
 * (https://rkarim25.github.io/Quran/ — docs/data/ai_wbw/surah_<n>.json)
 * into data/verses.json as word[5] (the "concept" meaning shown in study mode).
 *
 * Word slots stay [ar, tr, en, grammar, root, aiMeaning]: the short gloss (en)
 * is still what Test mode grades against — the AI meaning is a teaching layer.
 *
 * Safety: a surah's ayah is only merged when the AI word count equals ours;
 * mismatches are reported and left untouched. Re-running is idempotent.
 */
const fs = require("fs");
const path = require("path");

const SURAH_NUM = {
  fatiha: 1, ikhlas: 112, falaq: 113, nas: 114, kawthar: 108, asr: 103,
  nasr: 110, qadr: 97, kafirun: 109, masad: 111, quraysh: 106, fil: 105, kursi: 2,
};
const AI_BASE = "https://rkarim25.github.io/Quran/data/ai_wbw/";
const VERSES = path.join(__dirname, "..", "data", "verses.json");

async function main() {
  const data = JSON.parse(fs.readFileSync(VERSES, "utf8"));
  let merged = 0, skipped = [];
  for (const s of data.surahs) {
    const n = SURAH_NUM[s.id];
    if (!n) { skipped.push(`${s.id}: no surah number mapping`); continue; }
    const res = await fetch(`${AI_BASE}surah_${n}.json`);
    if (!res.ok) { skipped.push(`${s.id}: ai_wbw fetch ${res.status}`); continue; }
    const wbw = await res.json();
    for (const verse of s.verses) {
      const ayah = verse.ref.split(":")[1];
      const ai = wbw[ayah];
      if (!ai) { skipped.push(`${verse.ref}: no AI ayah`); continue; }
      if (Object.keys(ai).length !== verse.words.length) {
        skipped.push(`${verse.ref}: word count ai=${Object.keys(ai).length} ours=${verse.words.length}`);
        continue;
      }
      verse.words.forEach((word, i) => {
        const meaning = (ai[String(i + 1)] || {}).meaning;
        if (!meaning) return;
        while (word.length < 5) word.push("");
        word[5] = String(meaning).trim();
        merged++;
      });
    }
  }
  fs.writeFileSync(VERSES, JSON.stringify(data, null, 2) + "\n");
  console.log(`merged AI meanings into ${merged} words`);
  if (skipped.length) console.log("SKIPPED (untouched):\n  " + skipped.join("\n  "));
  else console.log("no skips — full coverage");
}
main().catch(e => { console.error(e); process.exit(1); });
