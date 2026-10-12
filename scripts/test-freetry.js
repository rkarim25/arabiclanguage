/* Free try — the engine that chooses what he tries next (js/freetry.js).
   Pins: sentences he mostly holds, stretched by at most one new word; a target
   success rate near 3 in 4 from a logistic ability model replayed from his own
   log; passes raise the level, misses lower it; due words and homework words
   jump the queue; a sentence passed today is not asked again today, a missed one
   comes back first; and a batch is never empty while anything is doable.
   Run: node scripts/test-freetry.js */
const path = require("path");
const F = require(path.join(__dirname, "..", "js", "freetry.js"));
const DAY = 86400000;
let fails = 0;
const ok = m => console.log("  ✓ " + m), fail = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : fail(m));
const NOW = Date.parse("2026-10-12T09:00:00Z");

/* a little bank: words a…l, sentences of growing length and rarity */
const W = ["أنا", "أريد", "ماء", "من", "فضلك", "الكتاب", "البيت", "كبير", "ذهبت", "إلى", "المسجد", "قرية"];
const card = (r, extra) => Object.assign({ s: 10, u: NOW - (r === "due" ? 60 : 1) * DAY, box: 3, n: 2, g: "yes" }, extra || {});
const srs = {};
W.slice(0, 9).forEach(w => { srs["k:" + w] = card("known"); });          // first nine known (recall ≈ 0.99)
srs["k:" + W[9]] = card("due");                                           // إلى — due (recall ≈ 0.66^… <0.6)
// W[10], W[11] never carded → new
const mk = (key, toks, pattern, track, use) => ({ key, ar: toks.join(" "), en: key, wk: toks.map(t => ["k:" + t]), pattern: pattern || "-", track: track || "conv", use: use || 1 });
const pool = [
  mk("s1", [W[0], W[1], W[2]], "nominal"),                  // all known, 3 words
  mk("s2", [W[1], W[2], W[3], W[4]], "nominal"),            // all known, 4
  mk("s3", [W[0], W[1], W[5]], "nominal"),                  // all known
  mk("s4", [W[8], W[9], W[10]], "tenses"),                  // 1 due (إلى) + 1 new (المسجد)
  mk("s5", [W[8], W[9], W[6]], "tenses"),                   // 1 due, rest known → stretch
  mk("s6", [W[0], W[10], W[11], W[2]], "nominal"),          // 2 new → gated out
  mk("s7", [W[5], W[6], W[7]], "nominal"),                  // all known
  mk("s8", [W[0], W[1], W[2], W[3], W[4], W[5], W[6], W[7], W[8]], "alladhina", "quran"), // long, hard frame, quran
  mk("s9", [W[1], W[2], W[3]], "nominal", "conv", 5),       // very useful, all known
  mk("s10", [W[6], W[7]], "nominal"),
  mk("s11", [W[2], W[6]], "have"),
  mk("s12", [W[0], W[7]], "nominal"),
];
const freq = { "أنا": 60, "أريد": 20, "ماء": 15, "من": 320, "فضلك": 5, "الكتاب": 30, "البيت": 25, "كبير": 40, "ذهبت": 8, "إلى": 150, "المسجد": 12, "قرية": 2 };
const ctx = (extra) => Object.assign({ now: NOW, srs, log: [], freq, homework: new Set(), size: 6 }, extra || {});

console.log("\n-- words: known, due, new --");
{
  yes(F.wordState(["k:" + W[0]], srs, NOW).state === "known", "a fresh card with 10-day stability is known today");
  yes(F.wordState(["k:" + W[9]], srs, NOW).state === "due", "a 10-day card not seen for 60 days has gone due");
  yes(F.wordState(["k:" + W[10]], srs, NOW).state === "new", "a word never carded is new");
  yes(F.wordState(["k:x"], { "k:x": { b: "never", box: 5 } }, NOW).state === "known", "a ⊘ word counts as held");
  yes(F.rarity("من", freq) === 0 && F.rarity("قرية", freq) > 0.6 && F.rarity("zzz", freq) === 1, "rarity: 0 for the commonest, high for rare, 1 for unseen");
}

console.log("\n-- difficulty is structural and ordered --");
{
  const c = ctx();
  const d = k => F.difficulty(pool.find(s => s.key === k), c);
  yes(d("s10") < d("s1") && d("s1") < d("s2"), "longer sentences are harder");
  yes(d("s8") > d("s2") + 2, "a long Qur'anic sentence with a hard frame is much harder");
  const f4 = F.features(pool.find(s => s.key === "s4"), c);
  yes(f4.fresh === 1 && f4.due === 1 && f4.known === 1, "features count new / due / known words correctly");
}

console.log("\n-- ability moves with the evidence --");
{
  const c0 = ctx();
  yes(F.ability(pool, c0).theta === F.P.theta0, "no tries → the starting level");
  const passes = ["s1", "s2", "s3", "s7", "s9"].map((k, i) => ({ e: "sent-drill", key: k, ok: true, how: "typed", t: NOW - (5 - i) * 3600000 }));
  const up = F.ability(pool, ctx({ log: passes })).theta;
  yes(up > F.P.theta0, `five passes raise the level (${F.P.theta0} → ${up.toFixed(2)})`);
  const misses = passes.map(x => Object.assign({}, x, { ok: false }));
  const down = F.ability(pool, ctx({ log: misses })).theta;
  yes(down < F.P.theta0, `five misses lower it (→ ${down.toFixed(2)})`);
  const selfOnly = F.ability(pool, ctx({ log: passes.map(x => Object.assign({}, x, { how: "self" })) })).theta;
  yes(selfOnly < up, "self-graded passes move it less than typed or spoken ones");
  const hardPass = F.ability(pool, ctx({ log: [{ e: "sent-drill", key: "s8", ok: true, how: "mic", t: NOW - 1000 }] })).theta;
  const easyPass = F.ability(pool, ctx({ log: [{ e: "sent-drill", key: "s10", ok: true, how: "mic", t: NOW - 1000 }] })).theta;
  yes(hardPass > easyPass, "passing a hard sentence raises the level more than passing an easy one");
  yes(F.ability(pool, ctx({ log: [{ e: "sent-drill", key: "s1", ok: true, how: "mic", t: NOW - 100 * DAY }] })).theta === F.P.theta0, "tries older than the look-back window are ignored");
}

console.log("\n-- the plan --");
{
  const p = F.plan(pool, ctx());
  yes(p.list.length === 6, `a batch of ${p.list.length} comes back`);
  yes(!p.list.some(s => s.key === "s6"), "a sentence with two new words is not offered (i+1, not i+2)");
  yes(p.list.every(s => s._try && s._try.why), "every sentence says why it was chosen");
  yes(p.list.some(s => s.key === "s5" || s.key === "s4"), "a sentence carrying a due word is in the batch (review inside a sentence)");
  const hw = F.plan(pool, ctx({ homework: new Set(["k:" + W[7]]) }));
  yes(hw.list.slice(0, 3).some(s => s.key === "s7" || s.key === "s10" || s.key === "s12"), "homework words jump the queue");
  const passedToday = [{ e: "sent-drill", key: "s1", ok: true, how: "typed", t: NOW - 3600000 }];
  yes(!F.plan(pool, ctx({ log: passedToday })).list.some(s => s.key === "s1"), "a sentence passed today is not asked again today");
  const missedToday = [{ e: "sent-drill", key: "s12", ok: false, how: "typed", t: NOW - 3600000 }];
  yes(F.plan(pool, ctx({ log: missedToday })).list[0].key === "s12", "a sentence missed today comes back first");
  const strong = F.plan(pool, ctx({ log: ["s1", "s2", "s3", "s7", "s9", "s11", "s10", "s12"].map((k, i) => ({ e: "sent-drill", key: k, ok: true, how: "mic", t: NOW - (10 - i) * DAY })) }));
  yes(strong.theta > p.theta, `after a week of passes the level is higher (${p.theta} → ${strong.theta})`);
  const retired = Object.assign({}, srs, { s9: { b: "never", box: 5, u: NOW } });
  yes(!F.plan(pool, ctx({ srs: retired })).list.some(s => s.key === "s9"), "a ⊘ sentence is never offered");
  const nothingKnown = F.plan(pool, ctx({ srs: {} }));
  yes(nothingKnown.list.length > 0 && nothingKnown.relaxed > 0, `with nothing held the gates relax (level ${nothingKnown.relaxed}) rather than return nothing`);
  const ps = p.list.map(s => s._try.p);
  yes(ps.every(x => x >= 50), `every chosen sentence is one he should pass more often than not (P ≥ 50%: ${ps.join(", ")})`);
}

console.log("\n-- grammar: weak frames get more, unmet essential frames get one, no frame floods the batch --");
{
  // a bigger bank: 8 sentences per frame, all words known
  const big = [];
  ["nominal", "tenses", "negation", "have", "questions"].forEach(p => { for (let i = 0; i < 8; i++) big.push(mk(`${p}-${i}`, [W[i % 9], W[(i + 1) % 9], W[(i + 2) % 9]], p)); });
  const c = ctx({ size: 10 });
  const base = F.plan(big, c);
  const byPat = list => list.reduce((a, s) => { a[s.pattern] = (a[s.pattern] || 0) + 1; return a; }, {});
  yes(Object.values(byPat(base.list)).every(n => n <= 4), `no frame takes more than 4 of 10 (${JSON.stringify(byPat(base.list))})`);
  const unseenFirst = F.grammarProfile(big, c);
  yes(unseenFirst.introduce === "nominal" && unseenFirst.focus === "nominal", "with no evidence the first essential frame is introduced");
  // he keeps missing negation, passes tenses
  const log = [];
  for (let i = 0; i < 6; i++) log.push({ e: "sent-drill", key: `negation-${i}`, ok: i === 0, how: "typed", t: NOW - (i + 1) * 3600000 * 30 });
  for (let i = 0; i < 6; i++) log.push({ e: "sent-drill", key: `tenses-${i}`, ok: true, how: "typed", t: NOW - (i + 1) * 3600000 * 30 });
  const prof = F.grammarProfile(big, ctx({ log }));
  yes(prof.profile.negation.weakness > 0.7 && prof.profile.tenses.weakness < 0.1, `miss rate per frame: negation ${prof.profile.negation.weakness}, tenses ${prof.profile.tenses.weakness}`);
  yes(prof.focus === "negation", "the focus is the weakest frame with real evidence");
  const planned = F.plan(big, ctx({ log, size: 10 }));
  const n = byPat(planned.list);
  yes((n.negation || 0) >= 3, `the weak frame gets ≥ 3 sentences (${n.negation || 0})`);
  yes(planned.list.some(s => /grammar focus: negation/.test(s._try.why)), "…and the batch says so");
  yes(planned.grammar.introduce && n[planned.grammar.introduce] >= 1, `an unmet essential frame (${planned.grammar.introduce}) still gets one sentence`);
  const tested = F.grammarProfile(big, ctx({ log: [{ e: "gtest-done", g: "have", score: 1, total: 3, t: NOW - DAY }] }));
  yes(tested.profile.have.weakness > 0.6 && tested.profile.have.evidence === 1, "a poor grammar-page test counts as evidence of weakness");
}

console.log("\n-- the content: every essential frame has short sentences to practise on --");
{
  const fs = require("fs");
  const D = f => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", f), "utf8"));
  const bank = D("sentence-bank.json").sentences;
  const chapters = D("chapters.json").chapters.flatMap(c => c.sentences.map((s, i) => Object.assign({}, s, { key: `chap:${c.num}:${i}` })));
  const cov = F.coverage(bank.concat(chapters), 5);
  const FLOOR = 7;
  const thin = F.ESSENTIAL.filter(p => cov[p].short < FLOOR);
  yes(!thin.length, thin.length ? `frames with fewer than ${FLOOR} short sentences: ${thin.map(p => `${p} (${cov[p].short})`).join(", ")}` : `every essential frame has ≥ ${FLOOR} sentences of ≤ 5 words (min ${Math.min(...F.ESSENTIAL.map(p => cov[p].short))})`);
  const untagged = bank.filter(s => !s.frames || !s.frames.length).length;
  yes(untagged < bank.length * 0.03, `${bank.length - untagged} of ${bank.length} bank sentences carry frames`);
  yes(chapters.every(s => s.frames && s.frames.length), "every chapter sentence carries frames");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
