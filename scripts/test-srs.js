/* The scheduler that owns the interval — js/srs.js. Pins the promises made to
   Reza on 2026-10-09: he gives a verdict (✗ ≈ ✓ ★), the site sets the date;
   time actually spent away drives the schedule; same-day repeats cannot inflate;
   a stumble never promotes; one tap never makes a word "solid"; legacy cards
   migrate without losing their box; batches balance new and old and never come
   back empty while there is anything to show.
   Run: node scripts/test-srs.js */
const path = require("path");
const SRS = require(path.join(__dirname, "..", "js", "srs.js"));
const DAY = 86400000;
let fails = 0;
const ok = m => console.log("  ✓ " + m);
const fail = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : fail(m));
const T0 = Date.parse("2026-10-01T09:00:00Z");

console.log("\n-- verdicts set the date, he doesn't --");
{
  let c = SRS.next(null, "yes", T0);
  yes(c.s === 2 && c.box <= 1 && (c.due - T0) / DAY > 1.5, "a new ✓ card comes back in ~2 days and sits in box ≤ 1");
  c = SRS.next(null, "no", T0);
  yes(c.box === 0 && c.due - T0 === 10 * 60000 && c.l === 1, "a new ✗ card comes back in 10 minutes, box 0, one lapse");
  c = SRS.next(null, "solid", T0);
  yes(c.s === 5 && c.box === 1, "ONE ★ tap on a new word is a claim: box stays ≤ 1 (not solid)");
  const c2 = SRS.next(c, "solid", T0 + 1 * DAY);
  yes(c2.n === 2 && c2.box >= 2 && c2.s > 8, "★ again the next day is proof: box ≥ 2, stability > 8 d");
}

console.log("\n-- time away drives the schedule --");
{
  const base = SRS.next(SRS.next(null, "yes", T0), "yes", T0 + 2 * DAY);   // s ≈ 5 d
  const onTime = SRS.next(base, "yes", base.u + base.s * DAY);
  const late = SRS.next(base, "yes", base.u + 6 * base.s * DAY);
  yes(late.s > onTime.s * 1.5, `a ✓ after a LONG gap grows stability more than an on-time ✓ (${late.s} vs ${onTime.s})`);
  let same = base;
  for (let i = 0; i < 5; i++) same = SRS.next(same, "yes", base.u + (i + 1) * 60000);
  yes(same.s < base.s * 1.35, `five ✓ within minutes barely move stability (${base.s} → ${same.s})`);
  yes(same.n === base.n, "…and do not add distinct-day proofs");
  const early = SRS.next(base, "yes", base.u + 0.2 * base.s * DAY);
  yes(early.s >= base.s * 1.05, "an early ✓ still never shrinks stability");
}

console.log("\n-- ✗ and ≈ --");
{
  let c = { box: 4, due: T0 + 14 * DAY, u: T0, s: 14, d: 5, n: 3, r: 4, l: 0, g: "yes", ls: T0 };
  const miss = SRS.next(c, "no", T0 + 10 * DAY);
  yes(miss.box === 0 && miss.s < 2 && miss.due - (T0 + 10 * DAY) === 600000, "✗ on a 14-day word collapses it and asks again in 10 min");
  const re = SRS.next(miss, "yes", miss.u + 11 * 60000);
  yes(re.s >= 1 && re.box <= 1, "✓ eleven minutes after a ✗ graduates to a day, not a week");
  const stumble = SRS.next(c, "maybe", T0 + 10 * DAY);
  yes(stumble.box === 4 && stumble.s >= 14 && stumble.s < 30, "≈ holds the band — never promotes, never resets");
  const s3 = { box: 2, due: T0 + 5 * DAY, u: T0, s: 5, d: 5, n: 2, r: 3, l: 0, g: "yes", ls: T0 };
  yes(SRS.next(s3, "maybe", T0 + 5 * DAY).box === 2, "≈ at the top of a band stays in the band");
  const retired = SRS.rate("k", "yes", { srs: { k: { box: 5, due: SRS.NEVER_DUE, b: "never", u: T0 } } });
  yes(retired.b === "never", "a ⊘ word stays retired on ✓ (only a real ✗ un-retires)");
  const unret = SRS.next({ box: 5, due: SRS.NEVER_DUE, b: "never", u: T0 }, "no", T0 + DAY);
  yes(!unret.b && unret.box === 0, "…and a ✗ un-retires it");
}

console.log("\n-- legacy cards --");
{
  const old = { box: 3, due: T0 + 7 * DAY, u: T0 };
  const m = SRS.migrate(Object.assign({}, old), T0 + DAY);
  yes(Math.abs(m.s - 7) < 0.01 && m.n === 2, "a box-3 card migrates to s = 7 d with two proofs (keeps its standing)");
  const after = SRS.next(old, "yes", T0 + 7 * DAY);
  yes(after.box >= 3, "…and a ✓ on it does not demote it");
  const r = SRS.retrievability(SRS.migrate({ box: 5, due: T0 + 30 * DAY, u: T0 }), T0 + 30 * DAY);
  yes(Math.abs(r - 0.9) < 0.001, "recall at the due date is the 90% target");
  yes(SRS.boxFromS(30, 5) === 5 && SRS.boxFromS(0.5, 5) === 0 && SRS.boxFromS(30, 1) === 1, "box projection: 30 d → 5, <1 d → 0, unproven → ≤ 1");
  yes(SRS.FROM_LEGACY.good === "yes" && SRS.FROM_LEGACY.hard === "maybe" && SRS.FROM_LEGACY.strong === "solid" && SRS.TO_LEGACY.no === "repeat", "old grades and buckets map both ways");
}

console.log("\n-- batches --");
{
  const now = T0 + 30 * DAY;
  const srs = {};
  const pool = [];
  for (let i = 0; i < 30; i++) {
    pool.push({ key: "k" + i });
    if (i < 10) srs["k" + i] = { box: 2, due: now - DAY, u: now - 5 * DAY, s: 4, d: 5, n: 2, r: 2, l: 0, g: "yes", ls: now - 5 * DAY };          // due
    else if (i < 20) srs["k" + i] = { box: 3, due: now + 10 * DAY, u: now - DAY, s: 11, d: 5, n: 2, r: 3, l: 0, g: "solid", ls: now - DAY };    // ahead
  }
  srs.k3.g = "no"; srs.k3.box = 0; srs.k3.s = 0.3;
  const b = SRS.buildBatch(pool, { size: 10, srs, now });
  const nDue = b.filter(x => +x.key.slice(1) < 10).length, nNew = b.filter(x => +x.key.slice(1) >= 20).length;
  yes(b.length === 10 && nDue === 7 && nNew === 3, `balanced = 7 due + 3 new (${nDue}/${nNew})`);
  const w = SRS.buildBatch(pool, { size: 10, srs, now, mode: "weakest" });
  yes(w[0].key === "k3", "weakest-first leads with the ✗ card");
  const redo = SRS.buildBatch(pool, { size: 10, srs, now, mode: "redo", redoKeys: b.map(x => x.key) });
  yes(redo.length === 10 && redo.every(x => b.some(y => y.key === x.key)) && redo[0].key === "k3", "redo keeps the same ten, re-ordered weakest first");
  const noneDue = SRS.buildBatch(pool.slice(10, 20), { size: 10, srs, now });
  yes(noneDue.length === 10, "nothing due and nothing new → the ten closest to fading, never an empty batch");
  const cool = new Set(b.map(x => x.key));
  const nxt = SRS.buildBatch(pool, { size: 10, srs, now, exclude: cool });
  yes(nxt.every(x => !cool.has(x.key)), "session cooldown keeps the last batch out of the next one");
  const boosted = SRS.buildBatch(pool, { size: 10, srs, now, boost: k => (k === "k9" ? 100 : 0) });
  yes(boosted[0].key === "k9", "a recent test miss jumps the queue");
}

console.log("\n-- bounds & labels --");
{
  let c = null;
  for (let i = 0; i < 40; i++) c = SRS.next(c, "solid", (c ? c.due : T0) + DAY);
  yes(c.s <= SRS.P.sMax && isFinite(c.due), "stability is capped and due is finite after 40 ★");
  c = null;
  for (let i = 0; i < 20; i++) c = SRS.next(c, "no", T0 + i * 60000);
  yes(c.s >= SRS.P.sMin && c.l === 20, "stability has a floor after 20 ✗ and lapses are counted");
  yes(/min/.test(SRS.nextLabel({ due: Date.now() + 600000 })) && /tomorrow/.test(SRS.nextLabel({ due: Date.now() + DAY })) && /wk/.test(SRS.nextLabel({ due: Date.now() + 21 * DAY })), "next-date labels read as minutes / tomorrow / weeks");
  const html = SRS.rateBarHtml("ev-x:1", "rateWord", [3]);
  yes(/✗/.test(html) && /★/.test(html) && /rateWord\('ev-x:1', 'solid', 3\)/.test(html) && /⊘/.test(html), "the inline bar carries the four symbols + ⊘ and the handler call");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
