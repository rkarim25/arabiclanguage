/* The one grader for spoken answers — js/match.js. Pins the 12 Oct audit fixes:
   the mic used to be a bag of words with a pass mark of half ("لا" passed for
   "لَا أَعْرِفُ"), word order was ignored, and the folding differed from the typed
   path. Run: node scripts/test-match.js */
const path = require("path");
const M = require(path.join(__dirname, "..", "js", "match.js"));
let fails = 0;
const ok = m => console.log("  ✓ " + m), fail = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : fail(m));

console.log("-- folding --");
yes(M.fold("أَنَا جَائِعٌ.") === "انا جااع", "vowels, hamza seats and punctuation fold away");
yes(M.fold("مَدْرَسَة") === M.fold("مدرسه"), "ة and ه are the same letter to the ear");
yes(M.fold("إِلَى") === M.fold("الي"), "ى and ي, إ and ا");

console.log("\n-- one- and two-word sentences need every word --");
yes(!M.spoken("لا", "لَا أَعْرِفُ").ok, "\"لا\" alone does NOT pass \"لَا أَعْرِفُ\"");
yes(M.spoken("لا اعرف", "لَا أَعْرِفُ").ok, "both words pass");
yes(M.spoken("صباح الخير", "صَبَاحُ الخَيْرِ").exact, "an exact answer is exact");

console.log("\n-- order matters, three in four is enough --");
const t = "أُرِيدُ مَاءً مِنْ فَضْلِكَ";
yes(M.spoken("اريد ماء من فضلك", t).ok && M.spoken("اريد ماء من فضلك", t).score === 1, "all four in order: 1.0");
yes(M.spoken("اريد ماء فضلك", t).ok && M.spoken("اريد ماء فضلك", t).score === 0.75, "three of four in order: passes at 0.75");
yes(!M.spoken("اريد ماء", t).ok, "two of four does not pass");
yes(!M.spoken("فضلك من ماء اريد", t).ok, "the same words backwards do not pass (order is the grammar)");
yes(!M.spoken("اريد ماء من فضلك انا اريد ماء من فضلك الان", t).ok, "a long ramble around the right words does not pass (more than two extra words)");
yes(M.spoken("انا اريد ماء من فضلك", t).ok, "one extra word is fine");

console.log("\n-- empties --");
yes(!M.spoken("", t).ok && M.spoken("", t).score === 0, "nothing heard: 0, not ok");
yes(!M.spoken("شيء", "").ok, "no model: not ok");

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
