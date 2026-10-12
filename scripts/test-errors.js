/* The error ledger — js/errors.js. Every miss is classified the moment it happens so
   the event says WHY (COACH-LOOP gap A, built 12 Oct). Run: node scripts/test-errors.js */
const path = require("path");
const E = require(path.join(__dirname, "..", "js", "errors.js"));
let fails = 0;
const ok = m => console.log("  ✓ " + m), fail = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : fail(m));
const c = (model, got, how) => E.classify(model, got, how || "typed");

console.log("-- spelling --");
yes(c("أُرِيدُ مَاءً", "اريد ماء").cat === "spelling" && c("أُرِيدُ مَاءً", "اريد ماء").sub === "hamza", "a hamza written as a plain alif is a spelling slip (hamza seat)");
yes(c("مَدْرَسَةٌ كَبِيرَةٌ", "مدرسه كبيره").sub === "ta-marbuta", "ه for ة is the tāʾ marbūṭa slip");
yes(c("ذَهَبْتُ إِلَى المَسْجِدِ", "ذهبت الي المسجد").sub === "hamza" || c("ذَهَبْتُ إِلَى المَسْجِدِ", "ذهبت الي المسجد").cat === "spelling", "إلى written الي is spelling, not a different word");
yes(c("أَنَا جَائِعٌ", "أَنَا جَائِعٌ") === null, "a letter-perfect answer has no error");

console.log("\n-- morphology --");
const m1 = c("ذَهَبْتُ إِلَى البَيْتِ", "ذهب الى البيت");
yes(m1.cat === "morphology" && m1.sub === "ending", "ذهب for ذهبتُ is a person-ending slip");
const m2 = c("أَشْرَبُ القَهْوَةَ", "يشرب القهوة");
yes(m2.cat === "morphology" && m2.sub === "prefix", "يشرب for أشرب is a tense/person prefix slip");

console.log("\n-- lexical and missing --");
const l1 = c("أَعُوذُ بِاللهِ", "اعود بالله");
yes(l1.cat === "lexical" && l1.model === "أَعُوذُ".replace(/[ً-ْ]/g, "") , `أعود for أعوذ is a different word (${l1.cat}: ${l1.model} ↔ ${l1.got})`);
yes(c("أُرِيدُ مَاءً مِنْ فَضْلِكَ", "اريد ماء").cat === "missing", "two words never produced: missing");
yes(c("صَبَاحُ الخَيْرِ", "").cat === "missing", "nothing typed: missing");
yes(c("أُرِيدُ مَاءً", "ماء اريد").cat === "order", "the right words backwards: order");

console.log("\n-- the mic: sounds --");
const p1 = c("عِنْدِي وَقْتٌ", "اندي وقت", "mic");
yes(p1.cat === "phonology" && p1.sub === "ع", `ع heard as ا is phonology (${p1.name})`);
const p2 = c("القَهْوَةُ حَارَّةٌ", "القهوه هاره", "mic");
yes(p2.cat === "phonology" && p2.sub === "ح", "ح heard as ه is phonology");
yes(c("عِنْدِي وَقْتٌ", "اندي وقت", "typed").cat !== "phonology", "…but typed answers are never 'phonology'");

console.log("\n-- the ledger --");
const log = [
  { e: "sent-drill", key: "a", ok: false, t: Date.now(), err: p1 },
  { e: "sent-drill", key: "a", ok: false, t: Date.now(), err: l1 },
  { e: "sent-drill", key: "b", ok: false, t: Date.now(), err: l1 },
  { e: "sent-drill", key: "b", ok: true, t: Date.now(), err: null },
  { e: "sent-drill", key: "c", ok: false, t: Date.now() - 90 * 86400000, err: p2 },
];
const L = E.ledger(log, 60);
yes(L.total === 3 && L.cats.lexical === 2 && L.cats.phonology === 1, `counts by category (${JSON.stringify(L.cats)})`);
yes(L.pairs.length === 1 && L.pairs[0].n === 2, "the confusion pair أعوذ ↔ أعود is counted twice");
yes(L.sounds.length === 1 && L.sounds[0].sound === "ع", "the slipping sound is ع");
yes(L.byKey.a && L.byKey.a.n === 2 && !L.byKey.c, "per key, within the window only");
yes(/hamza seat/.test(E.describe(c("أُرِيدُ", "اريد"))), "the learner gets one phrase: " + E.describe(c("أُرِيدُ", "اريد")));

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
