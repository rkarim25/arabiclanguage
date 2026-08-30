#!/usr/bin/env node
/* MOSQUE AND HARAM ARABIC, as sentences.
   ============================================================================
   Half of his own definition of done, 2026-08-30:

     "minimum sufficient for me to be considered basic fluent in arabic and in
      quran (meaning i understand the short suras, duas and what might be said in
      a mosque in Makkah/Madinah)"

   and, asked whether it should jump the queue ahead of the duas: "yes do that."

   The words existed — ev-haram, ev-masjid, ev-khutba — but seventeen of the
   twenty-nine had no sentence anywhere in the bank, so the lesson engine had to
   fall back to teaching them as bare one-word cards, which is the exact thing the
   site is built not to do. These are the sentences.

   TWO KINDS, and the distinction matters more here than anywhere else on the site:

     · what he HEARS — the imam's commands before prayer, the iqama, the khutbah
       openers. He never says these. They arrive fast, in a crowd, and the only
       useful skill is recognising them instantly. Marked heard:true.
     · what he SAYS — asking the way to the Kaaba, asking where sa'i starts,
       telling someone he is in ihram.

   Every sentence is ordinary Hijazi-register MSA of the kind actually used in
   the Haram, not literary Arabic. Nothing here is scripture; the khutbah stock
   phrases already in ev-khutba are quotations and stay as they are.

   Run: node scripts/add-masjid-sentences.js && node scripts/gen-sentences.js
   ============================================================================ */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const F = f => path.join(ROOT, "data", f);
const D = f => JSON.parse(fs.readFileSync(F(f), "utf8"));

const LESSON = "Masjid and Haram";
const norm = s => String(s).replace(/[ً-ٰـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي")
  .replace(/[؟،؛]/g, "").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

const ev = D("everyday.json").groups;
const keyOf = new Map();
ev.forEach(g => g.members.forEach((m, i) => { if (!keyOf.has(norm(m.ar))) keyOf.set(norm(m.ar), `ev-${g.id}:${i}`); }));
const phraseKeys = [...keyOf.entries()].filter(([f]) => f.includes(" "));
const keysFor = ar => {
  const out = new Set();
  String(ar).split(/\s+/).forEach(w => { const k = keyOf.get(norm(w)); if (k) out.add(k); });
  phraseKeys.forEach(([f, k]) => { if (norm(ar).includes(f)) out.add(k); });
  return [...out];
};

const NEW = [
  /* ---- what the imam says: he only ever needs to RECOGNISE these ---- */
  ["Straighten up, and close the gaps!", "اِسْتَوُوا وَسُدُّوا الخَلَلَ", true],
  ["Straighten your rows — straight rows are part of the prayer.", "سَوُّوا صُفُوفَكُمْ، فَإِنَّ تَسْوِيَةَ الصُّفُوفِ مِنْ تَمَامِ الصَّلَاةِ", true],
  ["Align yourselves and move forward.", "اِعْتَدِلُوا وَتَقَدَّمُوا", true],
  ["Complete the first row, then the one after it.", "أَتِمُّوا الصَّفَّ الأَوَّلَ ثُمَّ الَّذِي يَلِيهِ", true],
  ["The iqama has been given — the prayer has begun.", "قَدْ قَامَتِ الصَّلَاةُ", true],
  ["We are waiting for the iqama.", "نَنْتَظِرُ الإِقَامَةَ", false],
  ["Congregational prayer is gathering!", "الصَّلَاةُ جَامِعَةٌ", true],
  ["After the prayer there is a funeral prayer.", "بَعْدَ الصَّلَاةِ صَلَاةُ الجِنَازَةِ", true],
  ["Please move forward, there is a place in the first row.", "تَقَدَّمْ مِنْ فَضْلِكَ، هُنَاكَ مَكَانٌ فِي الصَّفِّ الأَوَّلِ", false],

  /* ---- inside the Haram: what he needs to SAY ---- */
  ["Where is the Kaaba from here?", "أَيْنَ الكَعْبَةُ مِنْ هُنَا؟", false],
  ["I want to perform tawaf around the Kaaba.", "أُرِيدُ أَنْ أَطُوفَ حَوْلَ الكَعْبَةِ", false],
  ["Where does the tawaf begin?", "مِنْ أَيْنَ يَبْدَأُ الطَّوَافُ؟", false],
  ["The tawaf area is crowded now.", "المَطَافُ مُزْدَحِمٌ الآنَ", false],
  ["Where does the sa'i begin?", "مِنْ أَيْنَ يَبْدَأُ السَّعْيُ؟", false],
  ["The sa'i is between Safa and Marwa.", "السَّعْيُ بَيْنَ الصَّفَا وَالمَرْوَةِ", false],
  ["I am performing Umrah today.", "أَنَا أُؤَدِّي العُمْرَةَ اليَوْمَ", false],
  ["I am in ihram.", "أَنَا مُحْرِمٌ", false],
  ["Where do I put on the ihram?", "أَيْنَ أَلْبَسُ الإِحْرَامَ؟", false],
  ["Where is the Station of Ibrahim?", "أَيْنَ مَقَامُ إِبْرَاهِيمَ؟", false],
  ["Is there Zamzam water here?", "هَلْ يُوجَدُ مَاءُ زَمْزَمَ هُنَا؟", false],
  ["Excuse me — where is the exit to the Haram?", "لَوْ سَمَحْتَ، أَيْنَ المَخْرَجُ إِلَى الحَرَمِ؟", false],
  ["What time is the prayer in the Haram?", "مَتَى الصَّلَاةُ فِي الحَرَمِ؟", false],
];

const prompts = D("prompts.json");
let added = 0, skipped = 0;
NEW.forEach(([en, ar, heard]) => {
  if (prompts.prompts.some(p => norm(p.ar) === norm(ar))) { skipped++; return; }
  prompts.prompts.push({
    en, ar, keys: keysFor(ar), source: "built", lesson: LESSON,
    // heard-only lines are never asked as production: he will not be shouting
    // "straighten your rows" at anyone, and testing him on producing it would
    // be testing the wrong skill
    ...(heard ? { heard: true } : {}),
  });
  added++;
});
fs.writeFileSync(F("prompts.json"), JSON.stringify(prompts, null, 1));

const covered = new Set(NEW.flatMap(([, ar]) => keysFor(ar)));
console.log(`added ${added} masjid/Haram sentences (${skipped} already present), covering ${covered.size} cards`);
console.log(`  ${NEW.filter(x => x[2]).length} are heard-only (the imam's commands, the iqama)`);
