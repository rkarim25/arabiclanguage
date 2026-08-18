#!/usr/bin/env node
/* gen-quran-word-audio.js — build data/quran-word-audio.json: real qari audio
   for every word in the Quran word-by-word view (Reza's 2026-08-17 pen note).

   Our verses.json word tokens come from Reza's Quran-site AI import and do NOT
   always match the canonical Uthmani word boundaries (some tokens are merged
   canonical words, some are fragments), so position-based lookup against the
   quran.com word audio (audio.qurancdn.com/wbw/SSS_VVV_WWW.mp3, a real human
   voice) would play the WRONG clip. Instead we align by characters:

   1. normalize both sides (strip harakat/quranic marks, ٱ→ا) and concatenate —
      per verse the two concatenations must be IDENTICAL strings;
   2. each canonical word then owns a char range; assign it to whichever of our
      tokens contains the majority of that range;
   3. a token maps to the ordered list of canonical clips it owns (possibly
      several for merged tokens, none for pure fragments → runtime TTS fallback).

   Output: { base, map: { <surahId>: [ per-verse: [ per-token: [urls]|null ] ] } }
   Rerun whenever verses.json words change. Requires network (quran.com API). */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const verses = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "verses.json"), "utf8"));

// strip everything that is not a base Arabic letter; unify alif wasla
function norm(s) {
  return String(s)
    .replace(/[ٱآ]/g, "ا") // wasla + madda → plain alif
    .replace(/ى/g, "ي") // alif maqsura ↔ ya spelling variance
    .replace(/[ً-ٰٟـۖ-ۭ࣓-ࣿؐ-ؚ]/g, "")
    .replace(/\s+/g, "");
}

function fetchJson(url) {
  return fetch(url, { headers: { accept: "application/json" } }).then(r => {
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  });
}

(async () => {
  const map = {};
  let mapped = 0, fallback = 0, badVerses = 0;
  for (const s of verses.surahs) {
    map[s.id] = [];
    for (const v of s.verses) {
      const api = await fetchJson(
        `https://api.quran.com/api/v4/verses/by_key/${v.ref}?words=true&word_fields=text_uthmani,audio_url`);
      const canon = api.verse.words.filter(w => w.char_type_name === "word");
      // char offsets of each canonical word / each of our tokens in the joined string
      const cJoin = canon.map(w => norm(w.text_uthmani));
      const tJoin = v.words.map(w => norm(w[0]));
      const cAll = cJoin.join(""), tAll = tJoin.join("");
      const perToken = v.words.map(() => null);
      if (cAll !== tAll) {
        badVerses++;
        console.log(`  MISMATCH ${v.ref}: canon "${cAll}" vs ours "${tAll}" — whole verse falls back to TTS`);
      } else {
        // token char ranges
        const tStart = []; let acc = 0;
        for (const t of tJoin) { tStart.push(acc); acc += t.length; }
        const tEnd = tStart.map((st, i) => st + tJoin[i].length);
        let cPos = 0;
        canon.forEach((w, ci) => {
          const st = cPos, en = cPos + cJoin[ci].length; cPos = en;
          // owner = token holding the majority of [st,en)
          let best = -1, bestOv = 0;
          for (let ti = 0; ti < tJoin.length; ti++) {
            const ov = Math.min(en, tEnd[ti]) - Math.max(st, tStart[ti]);
            if (ov > bestOv) { bestOv = ov; best = ti; }
          }
          if (best >= 0 && w.audio_url) {
            (perToken[best] = perToken[best] || []).push(w.audio_url);
          }
        });
      }
      perToken.forEach(x => (x ? mapped++ : fallback++));
      map[s.id].push(perToken);
    }
    console.log(`${s.id}: ${s.verses.length} verses aligned`);
  }
  const out = { base: "https://audio.qurancdn.com/", map };
  fs.writeFileSync(path.join(ROOT, "data", "quran-word-audio.json"), JSON.stringify(out));
  console.log(`DONE — ${mapped} tokens with real audio, ${fallback} TTS-fallback tokens, ${badVerses} unaligned verses`);
})();
