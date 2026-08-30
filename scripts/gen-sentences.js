/* Builds data/sentence-bank.json — THE SENTENCE LAYER.
   ============================================================================
   Reza, 2026-08-30, after reading a summary of how adults acquire a language:

     "should all the lessons be designed in this pattern? that first it gives a
      meaning, then i hear it in arabic, then i repeat it myself and then i
      practise variations of it … that would crucially imply no more vocab
      review, i just keep working with sentences only and as primary method."

   So the SENTENCE is now the atom of study, and the word is the unit of
   MEASUREMENT underneath it. His two conditions:

     "while i learn from setences and get tested on sentences, you have to
      maintain a vocab list for me which you test and get me to repeat in
      sentence format … you have to pick out words from there on what i am weak
      and design sentences in this way."
     "the only crinkle is grammar. if there are grammar rules which i do need to
      learn or understand then that needs to be added on from time to time."

   This generator therefore emits, for every sentence the site can teach:
     · the sentence itself (ar / en / tr),
     · EVERY word in it, each carrying the SRS key it already had, so his 228
       cards keep their history and a sentence answer can grade its words,
     · the grammar pattern it demonstrates, if any (surfaced once, when new),
     · how to vary it, if a verified mutation exists.

   NOTHING HERE IS INVENTED ARABIC. Every sentence comes from content already on
   the site and already voiced: the Qur'an surahs he is learning, the phrase
   deck, the story sentences, and the conjugation frames. Variations come from
   data/sentences.json, whose forms are generated from the verified conjugation
   table — a made-up mutation would teach him wrong Arabic, so where no verified
   variation exists the lesson simply skips that step.

   Run: node scripts/gen-sentences.js
   Then: python scripts/gen-audio.py   (voices anything new)
   ============================================================================ */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const verses = D("verses.json"), phrases = D("phrases.json"), core = D("quran-core.json");
const everyday = D("everyday.json"), families = D("families.json"), sentences = D("sentences.json");
const prompts = D("prompts.json"), grammar = D("grammar.json");
/* How much of real verb use each person/tense cell accounts for, measured by
   scripts/gen-frequency.js. Variants are ordered by it so he drills what he will
   actually meet — his rule: "i dont want to waste time going over variants which
   are not going to be used." */
let cellFreq = { cells: [] };
try { cellFreq = D("frequency.json"); } catch (e) { /* optional until it is generated */ }
const CELL_SHARE = Object.fromEntries((cellFreq.cells || []).map(c => [c.cell, c.share]));
/* The short surahs, imported from his own Qur'an site by
   scripts/import-quran-sentences.js. Optional: the site still builds without it,
   it just teaches 13 surahs instead of the whole of juz' 'Amma. */
let quranSents = { ayahs: [] };
try { quranSents = D("quran-sentences.json"); } catch (e) { console.log("  (no quran-sentences.json — run scripts/import-quran-sentences.js)"); }
const STORY_IDS = fs.readdirSync(path.join(ROOT, "data")).filter(f => /^story-\d+\.json$/.test(f)).map(f => f.replace(".json", "")).sort();
const stories = Object.fromEntries(STORY_IDS.map(id => [id, D(id + ".json")]));

/* ---------- word identity ----------
   normalizeAr from js/app.js, kept in step by scripts/test-sentences.js. A word
   is identified by its normalized form; the SRS key is whichever card the site
   ALREADY had for that form, so nothing he has learned is orphaned. */
const stripTashkeel = s => String(s).replace(/[ً-ٰـۖ-ۭ]/g, "");
const normalizeAr = s => stripTashkeel(s)
  .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي")
  .replace(/[؟،؛.!?,]/g, "")
  .replace(/[^؀-ۿ\s]/g, "")
  .replace(/\s+/g, " ").trim();

/* Every existing card, form -> key. Built in the order the site itself would
   prefer: frequency-ranked Qur'an core first, then verse words, then the decks.
   First writer wins, so a word he already meets as qc:3 stays qc:3. */
const formToKey = new Map();      // form -> the card the site would prefer
const formToKeys = new Map();     // form -> EVERY card for that form
const gloss = new Map();          // form -> best English gloss we know
const claim = (ar, key, en, tr) => {
  const f = normalizeAr(ar);
  if (!f) return;
  if (!formToKey.has(f)) formToKey.set(f, key);
  if (!formToKeys.has(f)) formToKeys.set(f, []);
  if (!formToKeys.get(f).includes(key)) formToKeys.get(f).push(key);
  if (en && !gloss.has(f)) gloss.set(f, { en, tr: tr || "" });
};

core.words.forEach((w, i) => claim(w.ar, `qc:${i}`, w.en, w.tr));
verses.surahs.forEach(s => s.verses.forEach((v, vi) =>
  (v.words || []).forEach((w, wi) => claim(w[0], `qw:${s.id}:${vi}:${wi}`, w[2], w[1]))));
everyday.groups.forEach(g => g.members.forEach((m, i) => claim(m.ar, `ev-${g.id}:${i}`, m.en, m.tr)));
families.families.forEach(f => f.members.forEach((m, i) => claim(m.ar, `fam-${f.id}:${i}`, m.en, m.tr)));
STORY_IDS.forEach(sid => (stories[sid].vocab || []).forEach((w, i) => claim(w.ar, `${sid}:${i}`, w.en, w.tr)));
/* Words that occur ONLY in the imported short surahs still need an identity, a
   gloss and a card, or the corpus would teach words the site cannot name. */
(quranSents.ayahs || []).forEach(a => a.words.forEach((w, i) =>
  claim(w[0], `qs:${a.ref}:${i}`, w[2], w[1])));

/* A word with no card of its own is still a word: give it a form-based key so it
   can be scheduled, counted and reported on like any other. */
const wordKey = ar => {
  const f = normalizeAr(ar);
  if (!f) return null;
  return formToKey.get(f) || `w:${f}`;
};
/* THE SAME WORD IS OFTEN CARDED TWICE. ٱللَّهِ is qc:1 in the frequency list and
   qw:fatiha:0:1 inside Al-Fatiha — one word, two cards. A sentence containing it
   therefore has to count as teaching BOTH, or a lesson asking for the qw card
   looks uncovered while the sentence that plainly teaches it sits right there.
   (Caught on the live site, 2026-08-30: Al-Fatiha 1:1 was taught as a sentence
   and then ٱللَّهِ was ALSO shown as a bare word in the same lesson.)
   Grading follows the same rule — answer the sentence and every card for that
   word advances, so the two can never drift apart again. */
const wordKeysAll = ar => {
  const f = normalizeAr(ar);
  if (!f) return [];
  return formToKeys.get(f) || [`w:${f}`];
};

/* Function words carry structure, not meaning worth drilling on their own. They
   are still part of the sentence and still shown — they just never become the
   reason a sentence is chosen. */
const FUNCTION_WORDS = new Set(["من", "في", "علي", "الي", "عن", "مع", "ما", "لا", "ان", "و", "ب", "ل", "ك", "يا", "قد", "ثم", "او", "بل", "هل", "لم", "لن", "كل", "بين", "عند", "حتي", "اذا", "ان"]);

const words = (pairs) => pairs.map(([ar, en, tr]) => {
  const f = normalizeAr(ar);
  const known = gloss.get(f);
  return {
    ar: String(ar).trim(),
    en: en || (known ? known.en : ""),
    tr: tr || (known ? known.tr : ""),
    key: wordKey(ar),
    keys: wordKeysAll(ar),
    fn: FUNCTION_WORDS.has(f) || undefined,
  };
}).filter(w => normalizeAr(w.ar));

/* ---------- the grammar patterns a sentence can demonstrate ----------
   His condition: grammar has to appear "from time to time" when a rule genuinely
   needs understanding. Detection is deliberately conservative — a pattern is
   claimed only when its marker is unmistakable, because a wrong grammar note is
   worse than none. The notes themselves live in data/grammar.json. */
const PATTERN_TESTS = [
  ["inna", /^(إِنَّ|إِنَّا|إِنَّهُ|إِنَّكَ|إنا|إنه|إن\s)/],
  ["alladhina", /الَّذِين|الَّذِي|ٱلَّذِين|الذين|الذي/],
  ["negation", /(^|\s)(لَا|لا|مَا|ما|لَم|لم|لَن|لن)\s/],
  ["prep-pron", /(عَلَيْك|عَلَيْه|إِلَيْه|إِلَيْك|فِيه|لَه|لَك|بِه|مِنْه|عليك|عليه|إليه|فيه)/],
  ["tenses", /^(سَ|سَي|سَأ|سَن|يَ|تَ|أَ|نَ)/],
];
const patternFor = ar => {
  for (const [id, re] of PATTERN_TESTS) if (re.test(ar)) return id;
  return null;
};

/* ---------- Qur'an: the ayah IS the sentence unit ----------
   Measured on his own 57 verses: 5.2 words on average, and 49 of 57 are six
   words or fewer. So an ayah is already the right size and is NOT chopped up by
   default — he has these memorised as whole ayat and splitting them would fight
   the memory he already has. Only genuinely long verses are split, at a clause
   boundary (a conjunction or a relative pronoun), never mid-clause. */
/* Splitting is HAND-AUTHORED, never mechanical. An automatic split has to build
   the English from the individual word glosses, which produces things like
   "Allah (the divine name) nominative case ending (damma) · no / not (negation)"
   — worse than useless as the "meaning" step of a lesson. So a verse is split
   only where a real clause translation has been written for each part, by word
   index into the verse's own words array (so the Arabic always comes from the
   mushaf text, never retyped).

   Measured on his 57 verses: only ONE needs it. Ayat al-Kursi is 50 words; every
   other verse is nine words or fewer and stays whole, which is also how he
   memorised them. */
const SPLITS = {
  "kursi:0": [
    [0, 7, "Allah — there is no god but Him, the Ever-Living, the All-Sustaining."],
    [7, 12, "Neither drowsiness nor sleep overtakes Him."],
    [12, 19, "To Him belongs whatever is in the heavens and whatever is on the earth."],
    [19, 26, "Who is there that can intercede with Him, except by His permission?"],
    [26, 32, "He knows what lies before them and what lies behind them."],
    [32, 40, "And they encompass nothing of His knowledge except what He wills."],
    [40, 44, "His Kursī extends over the heavens and the earth."],
    [44, 47, "And guarding them both does not weary Him."],
    [47, 50, "And He is the Most High, the Most Great."],
  ],
};

const bank = [];
const seen = new Set();
const add = u => {
  const f = normalizeAr(u.ar);
  if (!f || seen.has(f)) return;
  seen.add(f);
  bank.push(u);
};

/* --- Qur'an units --- */
verses.surahs.forEach(surah => {
  surah.verses.forEach((v, vi) => {
    const ws = v.words || [];
    if (!ws.length) return;
    const cuts = SPLITS[`${surah.id}:${vi}`];
    const parts = cuts ? cuts.map(([a, b, en]) => ({ ws: ws.slice(a, b), en })) : [{ ws, en: v.en }];
    parts.forEach((part0, pi) => {
      const part = part0.ws;
      const ar = part.map(w => w[0]).join(" ");
      const whole = parts.length === 1;
      add({
        id: `q:${surah.id}:${vi}${whole ? "" : ":" + pi}`,
        key: `s:q:${surah.id}:${vi}${whole ? "" : ":" + pi}`,
        track: "quran",
        ar,
        en: part0.en,
        // the whole ayah's meaning always travels with the part, so a clause is
        // never studied without the verse it belongs to
        verseEn: v.en,
        part: whole ? undefined : `${pi + 1} of ${parts.length}`,
        ref: v.ref,
        tr: part.map(w => w[1]).join(" "),
        words: words(part.map(w => [w[0], w[2], w[1]])),
        // the per-word grammar notes in verses.json are the best explanations on
        // the site — carry the first substantial one as this unit's note
        note: (part.find(w => w[3] && w[3].length > 40) || [])[3] || null,
        pattern: patternFor(ar),
        src: "quran",
        surah: surah.nameEn.split("—")[0].trim(),
      });
    });
  });
});

/* --- the short surahs (juz' 'Amma + Al-Fatiha) ---
   THE finite corpus behind "I understand the short suras". Real text, real
   translations, straight from the Qur'an. Ayat already in verses.json were
   filtered out at import time, so nothing is taught twice. */
(quranSents.ayahs || []).forEach(a => add({
  id: `qs:${a.ref}`,
  key: `s:qs:${a.ref}`,
  track: "quran",
  ar: a.ar, en: a.en,
  tr: a.words.map(w => w[1]).filter(Boolean).join(" "),
  ref: a.ref,
  words: words(a.words.map(w => [w[0], w[2], w[1]])),
  pattern: patternFor(a.ar),
  src: "quran",
  surah: a.surahName,
}));

/* --- the phrase deck: already whole utterances, already carded --- */
phrases.groups.forEach(g => g.members.forEach((m, i) => add({
  id: `ph:${g.id}:${i}`,
  key: `ph-${g.id}:${i}`,               // his existing card — history preserved
  track: "conv",
  ar: m.ar, en: m.en, tr: m.tr || "",
  words: words(String(m.ar).split(/\s+/).map(w => [w])),
  pattern: patternFor(m.ar),
  src: "phrases",
  theme: g.theme.split("—")[0].trim(),
})));

/* --- story sentences: real connected prose, with per-word glosses --- */
STORY_IDS.forEach(sid => (stories[sid].sentences || []).forEach((s, i) => add({
  id: `st:${sid}:${i}`,
  key: `s:st:${sid}:${i}`,
  track: "conv",
  ar: s.ar, en: s.en, tr: s.tr || "",
  words: words((s.words || []).map(w => [w[0], w[1]])),
  pattern: patternFor(s.ar),
  src: sid,
  theme: stories[sid].titleEn,
  grammarNote: stories[sid].grammar || null,
})));

/* --- the speaking prompts: English in, verified Arabic out ---
   These already carry the SRS keys of the vocabulary they use, which is exactly
   the sentence↔word link this whole design needs, so their keys are trusted over
   form matching. Short, practical, and the reason everyday coverage is possible
   at all. */
prompts.prompts.forEach((p, i) => add({
  id: `pr:${i}`,
  key: `s:pr:${i}`,
  track: "conv",
  ar: p.ar, en: p.en, tr: p.tr || "",
  words: words(String(p.ar).split(/\s+/).map(w => [w])),
  declaredKeys: p.keys || [],
  pattern: patternFor(p.ar),
  src: "prompts",
  theme: "something to say",
}));

/* --- grammar examples: a pattern shown in a real sentence ---
   Each one exists to demonstrate its rule, so it is tagged with that rule and
   will pull the explanation up with it the first time it appears. */
grammar.patterns.forEach(pat => (pat.examples || []).forEach((e, i) => add({
  id: `gx:${pat.id}:${i}`,
  key: `s:gx:${pat.id}:${i}`,
  track: /\(\d+:\d+\)|\d+:\d+/.test(e.en) ? "quran" : "conv",
  ar: e.ar, en: e.en, tr: "",
  words: words(String(e.ar).split(/\s+/).map(w => [w])),
  pattern: pat.id,
  note: pat.what,
  src: "grammar",
  theme: pat.name,
})));

/* --- conjugation frames: these ARE the variation engine ---
   One frame per verb (the "I …" past form), carrying the whole verified
   person×tense table so a lesson can mutate it without inventing anything. */
/* The persons actually drilled are decided by measured frequency and written
   into data/sentences.json by scripts/gen-verb-frames.js — read them from there
   rather than assuming, or the variants silently collapse to whichever ones
   happen to be hardcoded here. */
const PERSON_EN = { ana: "I", anta: "you", anti: "you", huwa: "he", hiya: "she", nahnu: "we", antum: "you all", hum: "they" };
const PERSONS = ((sentences.persons || []).map(p => [p.key, PERSON_EN[p.key] || p.en || p.key]));
if (!PERSONS.length) PERSONS.push(["ana", "I"], ["nahnu", "we"], ["hum", "they"]);
sentences.verbs.forEach((v, vi) => {
  const form = v.forms.ana && v.forms.ana.past;
  if (!form) return;
  // a frame may have no object at all — "I sat" is a whole sentence — so join
  // and trim rather than leaving a trailing space in the Arabic and the English
  const j = (a, b) => [a, b].filter(x => String(x || "").trim()).join(" ").trim();
  const ar = j(form, v.obj.ar);
  add({
    id: `vb:${vi}`,
    key: `s:vb:${vi}`,
    track: "conv",
    ar,
    en: j(`I ${v.past}`, v.obj.en),
    tr: "",
    words: words([[form, `I ${v.past}`], ...String(v.obj.ar).split(/\s+/).map(w => [w])]),
    pattern: "tenses",
    src: "sentences",
    root: v.root,
    // every verified mutation of this frame — person and tense, nothing invented
    vary: PERSONS.flatMap(([pk, pen]) => ["past", "pres", "fut"].map(tk => {
      const f = v.forms[pk] && v.forms[pk][tk];
      if (!f) return null;
      // he/she takes the -s in the present: "he worships", not "he worship"
      const third = pk === "huwa" || pk === "hiya";
      const pres = third ? String(v.base).replace(/(s|sh|ch|x|o)$/, "$1e").replace(/y$/, "ie") + "s" : v.base;
      const en = tk === "fut" ? j(`${pen} will ${v.base}`, v.obj.en)
        : j(`${pen} ${tk === "past" ? v.past : pres}`, v.obj.en);
      return { ar: j(f, v.obj.ar), en: String(en).replace(/\s+/g, " ").trim(), person: pk, tense: tk, verb: f,
               // the future is سَ + present, so it inherits the present's share,
               // heavily discounted: it is far rarer than either base tense
               share: tk === "fut" ? +(((CELL_SHARE[`${pk}:pres`] || 0) * 0.2).toFixed(2))
                                   : (CELL_SHARE[`${pk}:${tk}`] || 0) };
    }).filter(Boolean)
      // commonest first: he drills what he will actually meet
      .sort((a, b) => b.share - a.share)),
  });
});

/* ---------- coverage: which sentence teaches the most new ground ----------
   The one real argument for word lists is frequency — a few hundred words cover
   most of the Qur'an. Drop the word lists and coverage becomes accidental, so it
   is engineered here instead: every sentence is scored by the words it carries
   and how common they are, and the selector in js/curriculum.js picks the
   sentence that buys the most ground he has not yet covered. */
const freq = new Map();
core.words.forEach(w => freq.set(normalizeAr(w.ar), w.n || 0));
verses.surahs.forEach(s => s.verses.forEach(v => (v.words || []).forEach(w => {
  const f = normalizeAr(w[0]);
  freq.set(f, (freq.get(f) || 0) + 1);
})));

bank.forEach(u => {
  const content = u.words.filter(w => !w.fn);
  u.wordKeys = [...new Set(u.words.flatMap(w => w.keys || [w.key]).filter(Boolean).concat(u.declaredKeys || []))];
  // a source that states which cards it teaches is believed over form matching
  /* A sentence teaches its own card too. The phrase deck and the story
     sentences ARE cards in their own right (ph-*, story-*), and a lesson that
     owns one is asking for that whole utterance — not for its parts. */
  u.teaches = [...new Set(content.flatMap(w => w.keys || [w.key]).filter(Boolean)
    .concat(u.declaredKeys || [])
    .concat(u.key ? [u.key] : []))];
  delete u.declaredKeys;
  u.weight = content.reduce((a, w) => a + Math.log1p(freq.get(normalizeAr(w.ar)) || 1), 0);
  /* HOW OFTEN THIS SENTENCE IS WORTH KNOWING. weight is a SUM, so it rewards
     length — a nine-word ayah of rare words outranks مَا هَذَا؟. The list he works
     through has to be ordered by usefulness, not by size, so `use` is the MEAN:
     the average commonness of the words in it.

     His instruction, 2026-08-30: "i want to see a list by frequency of use and it
     should be quranic or MSA, i.e. the list will be working through in order." */
  u.use = content.length ? +(u.weight / content.length).toFixed(3) : 0;
});

// the bank IS the order he works through: commonest first, within each track
bank.sort((a, b) => (a.track === b.track ? 0 : a.track === "quran" ? -1 : 1) || b.use - a.use || b.weight - a.weight);

const out = {
  version: 1,
  note: "GENERATED by scripts/gen-sentences.js — do not hand-edit. The sentence is the unit of study; the word keys under each sentence are the unit of measurement. See CURRICULUM.md.",
  generated: bank.length,
  tracks: {
    quran: bank.filter(u => u.track === "quran").length,
    conv: bank.filter(u => u.track === "conv").length,
  },
  sentences: bank,
};
fs.writeFileSync(path.join(ROOT, "data", "sentence-bank.json"), JSON.stringify(out, null, 1));

const withPattern = bank.filter(u => u.pattern).length;
const withVary = bank.filter(u => u.vary && u.vary.length).length;
const variants = bank.reduce((a, u) => a + ((u.vary || []).length || 0), 0);
const conv = bank.filter(u => u.track === "conv");
const convVariants = conv.reduce((a, u) => a + Math.max(1, (u.vary || []).length), 0);
const newWords = new Set(bank.flatMap(u => u.wordKeys).filter(k => k && k.startsWith("w:")));
console.log(`sentence bank: ${bank.length} units (${out.tracks.quran} Qur'an, ${out.tracks.conv} everyday)`);
console.log(`  ${withPattern} demonstrate a grammar pattern, ${withVary} carry verified variations`);
/* His framing, 2026-08-30: "X sentences and Y variants. so X x Y to be mastered."
   Stated honestly per track, because they differ in kind: an ayah is fixed text
   and is never conjugated, so the Qur'an track's count is ayat, full stop. */
console.log(`  TO MASTER — Qur'an: ${out.tracks.quran} ayat (fixed text, no variants by design)`);
console.log(`              everyday: ${conv.length} sentences, ${variants} verified variants => ${convVariants} utterances`);
console.log(`  ${new Set(bank.flatMap(u => u.wordKeys)).size} distinct words underneath, ${newWords.size} of them not previously carded`);
