/* Build data/lexicon.json — the site-wide Arabic→gloss dictionary behind
   tap-any-word. Merges every gloss the site already teaches, keyed by
   normalized Arabic (tashkeel stripped, hamza seats folded, leading ال off).
   First writer wins, so order sources by gloss quality: the curated core and
   everyday lists beat one-off contextual verse glosses.
   Run after adding/regenerating any data file: node scripts/gen-lexicon.js */

const fs = require("fs");
const path = require("path");
const DATA = path.join(__dirname, "..", "data");

function stripTashkeel(s) { return String(s).replace(/[ً-ٰـۖ-ۭ]/g, ""); }
function normalizeAr(s) {
  return stripTashkeel(s)
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^؀-ۿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const lex = {};
const aliases = [];
let added = 0;
function put(ar, tr, en, src) {
  if (!ar || !en) return;
  const full = normalizeAr(ar);
  if (!full || full.length < 2) return;
  const entry = [String(ar).trim(), String(tr || "").trim(), String(en).trim().slice(0, 120), src];
  
  // Index by exact stripped form (preserves distinct hamza seats like أن vs إن)
  const bareAr = stripTashkeel(ar).replace(/[^؀-ۿ\s]/g, "").trim();
  if (bareAr && bareAr.length >= 2 && !lex[bareAr]) {
    lex[bareAr] = entry;
  }

  if (!lex[full]) {
    lex[full] = entry;
  }
  added++;
  // remember an article-less alias, applied AFTER all real words are in so an
  // alias can never shadow a real word (الله must not file under له)
  const bare = full.replace(/^ال/, "");
  if (bare.length >= 2 && bare !== full) aliases.push([bare, entry]);
}
const read = f => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));

// 1. Quran core frequency list — canonical glosses
read("quran-core.json").words.forEach(w => put(w.ar, w.tr, w.en, "core"));
// 2. everyday clusters
read("everyday.json").groups.forEach(g => g.members.forEach(m => put(m.ar, m.tr, m.en, "everyday")));
// 3. root families
read("families.json").families.forEach(f => f.members.forEach(m => put(m.ar, m.tr, m.en, "root " + normalizeAr(f.root))));
// 4. story vocab
fs.readdirSync(DATA).filter(f => /^story-\d+\.json$/.test(f)).forEach(f => {
  const s = read(f);
  (s.vocab || []).forEach(w => put(w.ar, w.tr, w.en, s.title ? "story" : "story"));
});
// 5. sentence-practice verbs and objects
{
  const d = read("sentences.json");
  d.verbs.forEach(v => {
    put(v.obj.ar, "", v.obj.en, "sentences");
    Object.entries(v.forms || {}).forEach(([person, tenses]) => Object.entries(tenses).forEach(([tense, form]) =>
      put(form, "", `${({ana:"I",nahnu:"we",hum:"they"})[person] || person} ${tense === "past" ? v.past : tense === "fut" ? "will " + v.base : v.base}`, "verb " + v.base)));
  });
}
// 5c. conjugation library — every past/present form of every verb, glossed by
//     person ("we said", "they say"). After the drill verbs so those keep
//     their gloss; before story text so a curated form beats a contextual one.
{
  const d = read("conjugations.json");
  const s3 = b => b === "be" ? "is" : String(b).replace(/^(\S+)/, w => /(o|ch|sh|ss|x|z)$/.test(w) ? w + "es" : w + "s");
  const bePast = k => (k === "ana" || k === "huwa" || k === "hiya") ? "was" : "were";
  const bePres = k => k === "ana" ? "am" : (k === "huwa" || k === "hiya") ? "is" : "are";
  d.verbs.forEach(v => {
    d.persons.forEach(p => {
      const who = p.en;
      const pastEn = v.base === "be" ? `${who} ${bePast(p.key)}` : `${who} ${v.pastEn}`;
      const presEn = v.base === "be" ? `${who} ${bePres(p.key)}`
        : (p.key === "huwa" || p.key === "hiya") ? `${who} ${s3(v.base)}` : `${who} ${v.base}`;
      put(v.past[p.key], "", `${pastEn} (${v.en})`, "conj " + v.id);
      put(v.pres[p.key], "", `${presEn} (${v.en})`, "conj " + v.id);
    });
  });
}
// 5b. story sentence words — every inflected form in the running text, glossed
//     in context (يَزُورَانِنَا "they (two) visit us"). Tap-any-word must answer
//     for the text itself, not just the vocab list (his note, 2026-07-21).
fs.readdirSync(DATA).filter(f => /^story-\d+\.json$/.test(f)).forEach(f => {
  const s = read(f);
  (s.sentences || []).forEach(sen => (sen.words || []).forEach(w => put(w[0], "", w[1], s.id + " text")));
});
// 6. Quran verse words (contextual — lowest priority)
read("verses.json").surahs.forEach(s => s.verses.forEach(v => v.words.forEach(w => put(w[0], w[1], w[2], s.id))));
// 6b. the imported short surahs (Al-Fatiha + juz' 'Amma) — word-by-word for
//     every ayah. Their verse tie-ins appear inside class lessons, so
//     tap-any-word must answer for them (wtap miss on مَّرْفُوعَةٞ, his note
//     2026-08-31: "the word by word should work"). Same contextual tier as
//     verses.json, which stays ahead of it. No tr: the corpus transliteration
//     ("l-naba-i", "mukh'talifūna") is not the site's own convention and would
//     not be accepted typed back — same rule as story text (source 5b).
read("quran-sentences.json").ayahs.forEach(a => a.words.forEach(w => put(w[0], "", w[2], a.ref)));
// 7. conversational phrases — single-word entries land as tappable words;
//    multi-word keys are harmless (taps only ever look up one word)
read("phrases.json").groups.forEach(g => g.members.forEach(m => put(m.ar, m.tr, m.en, "phrase")));

// 8. the site's own UI Arabic — page titles etc. are tappable too, so the
//    dictionary must answer for them (wtap hit:false on المدرب, 2026-07-18).
//    Last so a curated gloss always wins if one ever appears upstream.
[
  ["مُدَرِّب", "mudarrib", "coach; trainer"],
  ["صَوْتِيّ", "ṣawtī", "audio; sound- (from صَوْت voice)"],
  ["بِنَاء", "bināʾ", "building; construction"],
  ["جُمْلَة", "jumla", "sentence"],
  ["جُمَل", "jumal", "sentences (plural of جُمْلَة)"],
  ["فَاعِل", "fāʿil", "doer; subject (the one doing the verb)"],
  ["مُحَادَثَة", "muḥādatha", "conversation"],
  ["سُورَة", "sūra", "sura — a chapter of the Qurʾan"],
].forEach(([ar, tr, en]) => put(ar, tr, en, "site"));

aliases.forEach(([bare, entry]) => { if (!lex[bare]) lex[bare] = entry; });

// Homographs that tashkeel-stripping collapses into one key: first-writer-wins
// left مَنْ (who) showing "from; of". Show both readings honestly.
lex["من"] = ["مِنْ / مَنْ", "min / man", "min: from · man: who?", "homograph"];

fs.writeFileSync(path.join(DATA, "lexicon.json"), JSON.stringify(lex), "utf8");
console.log("lexicon.json:", added, "entries,", Object.keys(lex).length, "keys with aliases");
