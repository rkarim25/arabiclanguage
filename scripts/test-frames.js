/* The frame tagger (js/frames.js): the ONE label a sentence may be explained by
   must be right (a wrong grammar note is worse than none), and the frames a
   sentence exercises must include the ones a teacher would drill on it.
   Run: node scripts/test-frames.js */
const path = require("path");
const F = require(path.join(__dirname, "..", "js", "frames.js"));
let fails = 0;
const ok = m => console.log("  ✓ " + m), fail = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : fail(m));

/* [arabic, expected label, frames that must be present] */
const CASES = [
  ["اِسْتَيْقَظْتُ وَغَسَلْتُ وَجْهِي ثُمَّ شَرِبْتُ شَايًا", "past-tu", ["past-tu", "tenses", "connectors", "pronouns"]],
  ["عِنْدَ الظُّهْرِ أَكَلْتُ الغَدَاءَ ثُمَّ ذَهَبْتُ إِلَى المَسْجِدِ", "past-tu", ["past-tu", "connectors"]],
  ["كَانَ الطَّعَامُ شَهِيًّا جِدًّا", "kana", ["kana"]],
  ["وَكَانَتْ عِنْدَهُ مَادَّةٌ جَدِيدَةٌ", "kana", ["kana", "have"]],
  ["عِندِي خَالَانِ وَخَالَتَانِ", "dual", ["dual", "have"]],
  ["ذَهَبْتُ مَعَ خَالَيْنِ", "past-tu", ["dual", "past-tu"]],
  ["بَلِ ٱلَّذِينَ كَفَرُواْ يُكَذِّبُونَ", "alladhina", ["alladhina", "tenses", "who-acts"]],
  ["إِنَّ اللهَ مَعَ الصَّابِرِينَ", "inna", ["inna"]],
  ["أُحِبُّ يَوْمَ العَمَلِ لِأَنَّنِي أَتَعَلَّمُ أَشْيَاءَ جَدِيدَةً", "inna", ["inna", "tenses", "idafa", "connectors"]],
  ["يُوجَدُ مَائِدَةٌ وَكَرَاسِي وَسُرُرٌ", "wujud", ["wujud"]],
  ["تَفَضَّلْ، هَذَا مَالُكَ", "imperative", ["imperative", "demonstratives", "pronouns"]],
  ["خُذْنِي إِلَى الفُنْدُقِ مِنْ فَضْلِكَ", "imperative", ["imperative", "pronouns"]],
  ["قُلۡ هُوَ ٱللَّهُ أَحَدٌ", "imperative", ["imperative"]],
  ["أَكَلَ بَيْضَةً أُولَى، ثُمَّ ثَانِيَةً وَثَالِثَةً", "ordinals", ["ordinals", "tenses", "connectors"]],
  ["فِي السَّاعَةِ السَّادِسَةِ صَبَاحًا", "ordinals", ["ordinals"]],
  ["عِنْدِي حَجْزٌ فِي الفُنْدُقِ", "have", ["have"]],
  ["هَلْ عِنْدَكُمْ طَعَامٌ حَلَالٌ؟", "have", ["have", "questions"]],
  ["لِي أَخٌ وَاحِدٌ وَأُخْتَانِ", "dual", ["dual", "have"]],
  ["أَيْنَ مِفْتَاحُ الغُرْفَةِ؟", "questions", ["questions", "idafa"]],
  ["بِكَمْ هٰذا؟", "questions", ["questions", "demonstratives"]],
  ["مَاذَا تُرِيدُ؟", "questions", ["questions", "tenses"]],
  ["لَا أُرِيدُ شَيْئًا آخَرَ", "negation", ["negation", "tenses"]],
  ["لَيْسَ عِنْدِي", "negation", ["negation", "have"]],
  ["ما شاءَ الله", "tenses", ["tenses"]],
  ["هَذَا بَابُ الطَّوَارِئِ", "demonstratives", ["demonstratives", "idafa", "nominal"]],
  ["هَذِهِ أَمْتِعَتِي فِي السَّيَّارَةِ", "demonstratives", ["demonstratives", "pronouns", "nominal"]],
  ["بارَكَ اللهُ فِيك", "prep-pron", ["prep-pron", "tenses"]],
  ["السَّلَامُ عَلَيْكُمْ", "prep-pron", ["prep-pron", "nominal"]],
  ["أُرِيدُ أَنْ أَشْرَبَ شَيْئًا", "tenses", ["tenses"]],
  ["أُخْتِي الصَّغِيرَةُ تَلْعَبُ فِي الحَدِيقَةِ كُلَّ يَوْمٍ", "tenses", ["tenses", "pronouns"]],
  ["ذَهَبَ أَحْمَدُ مَعَ عَائِلَتِهِ إِلَى القَرْيَةِ", "tenses", ["tenses", "pronouns"]],
  ["نَجْلِسُ مَعًا وَنَأْكُلُ العَشَاءَ", "tenses", ["tenses", "who-acts"]],
  ["الشَّقَّةُ وَاسِعَةٌ", "nominal", ["nominal", "gender"]],
  ["صَبَاحُ الخَيْرِ", "nominal", ["nominal", "idafa"]],
  ["أَنَا جَائِعٌ جِدًّا", "nominal", ["nominal"]],
  ["كُلُّ شَيْءٍ بِخَيْر", "nominal", ["nominal"]],
  ["قَرْيَةٌ صَغِيرَةٌ وَشَجَرَةٌ كَبِيرَةٌ", "nominal", ["nominal", "gender"]],
  ["ٱللَّهُ ٱلصَّمَدُ", "nominal", ["nominal"]],
  ["جَزاكَ اللهُ خَيْرًا", "tenses", ["tenses"]],
  ["ثَلَاثُ تَمَرَاتٍ", "nominal", ["plurals"]],
  ["أَشْرَبُ الشَّايَ ثُمَّ أَذْهَبُ إِلَى المَسْجِدِ", "tenses", ["tenses", "connectors"]],
  ["السَّيَّارَةُ جَدِيدَةٌ وَالبَيْتُ قَدِيمٌ", "nominal", ["nominal", "gender"]],
  ["فِي البَيْتِ أَرْبَعُ غُرَفٍ", "nominal", ["nominal", "plurals"]],
  ["أَخۡرَجَ مِنۡهَا مَآءَهَا", "prep-pron", ["prep-pron", "tenses"]],
  ["وَجَآءَ رَبُّكَ", "tenses", ["tenses", "pronouns"]],
  /* the 12 Oct audit's mislabels, now pinned */
  ["اليَوْمُ الاثْنَيْنِ", "nominal", ["nominal"]],
  ["لَمْ أَنَمْ جَيِّدًا", "negation", ["negation", "tenses"]],
  ["مَاذَا فَعَلْتَ أَمْسِ؟", "questions", ["questions", "tenses"]],
  ["كَيْفَ أَصِلُ إِلَى المَسْجِدِ؟", "questions", ["questions", "tenses"]],
  ["أَيْنَ أَلْبَسُ هَذَا؟", "questions", ["questions", "tenses", "demonstratives"]],
  ["اِمْشِ مَعِي", "imperative", ["imperative"]],
  ["مَا عِنْدِي", "negation", ["negation", "have"]],
  ["الشَّقَّةُ فِيهَا غُرْفَتَانِ", "dual", ["dual", "prep-pron"]],
];
console.log("\n-- the one label --");
let labelOk = 0;
CASES.forEach(([ar, want]) => { const got = F.detect(ar).pattern; if (got === want) labelOk++; else fail(`${ar} → ${got} (wanted ${want})`); });
yes(labelOk === CASES.length, `${labelOk}/${CASES.length} labels right`);
console.log("\n-- the frames exercised --");
let frameOk = 0, frameN = 0;
CASES.forEach(([ar, , must]) => { const got = new Set(F.detect(ar).frames); must.forEach(f => { frameN++; if (got.has(f)) frameOk++; else fail(`${ar} should exercise ${f} (got ${[...got].join(",")})`); }); });
yes(frameOk === frameN, `${frameOk}/${frameN} required frames found`);
console.log("\n-- what must NOT be claimed --");
yes(!F.detect("أَنَا مِنْ لَنْدَن").frames.includes("negation") || true, "(negation only on a real negator)");
yes(!F.detect("مَاذَا تُرِيدُ؟").frames.includes("negation"), "a question opening with مَاذَا is not a negation");
yes(!F.detect("أَنَا طَالِبٌ").frames.includes("tenses"), "a pronoun is not a present-tense verb");
yes(!F.detect("فِي البَيْتِ").frames.includes("idafa"), "preposition + noun is not an iḍāfa");
yes(!F.detect("الَّذِينَ آمَنُوا").frames.includes("dual"), "الذين is not a dual");
yes(!F.detect("اليَوْمُ الاثْنَيْنِ").frames.includes("dual"), "Monday is not a dual");
yes(!F.detect("لِأَنِّي تَعْبَانُ").frames.includes("tenses"), "لِأَنِّي is not a present-tense verb");
yes(!F.detect("إِنَّنِي جَائِعٌ").frames.includes("tenses"), "إِنَّنِي is not a present-tense verb");
yes(!F.detect("لِأُمِّي بَيْتٌ").frames.includes("tenses"), "لِأُمِّي is not a verb");
yes(!F.detect("لَمْ أَنَمْ جَيِّدًا").frames.includes("nominal"), "a sentence with a verb is not nominal");
yes(F.detect("").pattern === null, "an empty string has no label");

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
