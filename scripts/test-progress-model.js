/* Validation suite for js/progress-model.js — run: node scripts/test-progress-model.js [payload.json]
   The chart is the bedrock of the site; this must pass before any deploy that
   touches the model. Three layers:
     1. synthetic sanity (known-answer cases for decay/replay/sim)
     2. replay-vs-actual: replaying the real log must reproduce the real KV srs
     3. fan monotonicity: more study → earlier completion; missed days → later */
const PM = require("../js/progress-model.js");
const fs = require("fs");
const DAY = PM.DAY;
let fails = 0;
const ok = (name, cond, detail) => { console.log((cond ? "  ✓ " : "  ✗ ") + name + (detail ? " — " + detail : "")); if (!cond) fails++; };

console.log("1. Synthetic sanity");
{
  const t0 = Date.UTC(2026, 0, 1);
  // a box-0 card halves in H0 days
  const p = PM.recallP({ box: 0, last: t0 }, t0 + PM.CAL.H0 * DAY);
  ok("box-0 card halves in H0 days", Math.abs(p - 0.5) < 1e-9, "p=" + p.toFixed(3));
  // a box-5 card holds ≥ ~87% over its full 30-day interval
  const p5 = PM.recallP({ box: 5, last: t0 }, t0 + 30 * DAY);
  ok("box-5 card ≥ 85% at its 30d due date", p5 >= 0.85, "p=" + p5.toFixed(3));
  // retired card = 1 forever
  ok("retired card recalls at 1", PM.recallP({ box: 5, last: t0, retired: true }, t0 + 400 * DAY) === 1);
  // replay: good grades climb boxes, a miss resets
  const log = [
    { e: "sheet", key: "x:1", ok: true, t: t0 },
    { e: "sheet", key: "x:1", ok: true, t: t0 + DAY },
    { e: "review", card: "x:1", g: "again", t: t0 + 2 * DAY },
    { e: "bucket", key: "x:2", b: "know", t: t0 },
    { e: "bucket", key: "x:3", b: "never", t: t0 },
    { e: "qfill", surah: "fatiha", ref: "1:2", w: 3, ok: true, t: t0 },
  ];
  const cards = PM.replay(log);
  ok("miss resets to box 0", cards["x:1"].box === 0);
  ok("know-bucket → box 5", cards["x:2"].box === 5 && !cards["x:2"].retired);
  ok("never-bucket → retired", cards["x:3"].retired === true);
  ok("qfill key rebuilt as qw:fatiha:2:3", !!cards["qw:fatiha:2:3"]);
  // no study → mass decays; the reality series must FALL (his sketch's sag)
  const basket = ["x:1", "x:2", "qw:fatiha:2:3"];
  const rs = PM.realitySeries(log, basket, t0, t0 + 20 * DAY);
  ok("reality series sags with no study", rs[rs.length - 1].mass < rs[3].mass,
    rs[3].mass + " → " + rs[rs.length - 1].mass);
  // daily study on a tiny basket reaches and HOLDS the 90% target
  const today = { "y:0": { box: 1, last: t0 } };
  const daily = PM.simulate(today, ["y:0", "y:1", "y:2"], [10, 10, 10, 10, 10, 10, 10], 120, t0);
  ok("daily 10min on a 3-word basket completes", !!daily.completion, "at " + daily.completion);
  const zero = PM.simulate(today, ["y:0", "y:1", "y:2"], [0, 0, 0, 0, 0, 0, 0], 120, t0);
  ok("zero minutes never completes and decays", !zero.completion &&
    zero.series[119].mass < zero.series[0].mass);
  // expectation conservation: component mass per card stays ≤ 1
  const simState = PM.simulate(today, ["y:0"], [5, 5, 5, 5, 5, 5, 5], 60, t0);
  ok("sim mass never exceeds basket size", simState.series.every(s => s.mass <= 1.0001));
}

console.log("2. Replay vs the real KV blob");
{
  const payloadPath = process.argv[2] || __dirname + "/../../snaps/data-2026-08-06.json";
  if (!fs.existsSync(payloadPath)) {
    console.log("  (skipped — no payload at " + payloadPath + ")");
  } else {
    const d = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
    const qref = PM.buildQrefIndex(JSON.parse(fs.readFileSync(__dirname + "/../data/verses.json", "utf8")));
    const replayed = PM.replay(d.log, null, qref);
    const actual = d.srs || {};
    const keys = Object.keys(actual);
    let boxMatch = 0, withinOne = 0, covered = 0;
    for (const k of keys) {
      const r = replayed[k];
      if (!r) continue;
      covered++;
      if (r.box === actual[k].box || (actual[k].b === "never" && r.retired)) boxMatch++;
      if (Math.abs((r.box || 0) - (actual[k].box || 0)) <= 1 || (actual[k].b === "never" && r.retired)) withinOne++;
    }
    console.log(`  actual cards: ${keys.length} · replay covers: ${covered} · exact box: ${boxMatch} · within ±1: ${withinOne}`);
    ok("replay covers ≥ 85% of real cards", covered / keys.length >= 0.85, (100 * covered / keys.length).toFixed(0) + "%");
    ok("≥ 80% of covered cards within ±1 box", withinOne / Math.max(1, covered) >= 0.8, (100 * withinOne / Math.max(1, covered)).toFixed(0) + "%");
    const missing = keys.filter(k => !replayed[k]).slice(0, 8);
    if (missing.length) console.log("  sample uncovered keys:", missing.join(", "));
  }
}

console.log("3. Fan monotonicity (the fan must never lie about direction)");
{
  const t0 = Date.UTC(2026, 7, 6);
  const basket = []; const cardsToday = {};
  for (let i = 0; i < 120; i++) {
    basket.push("b:" + i);
    if (i < 40) cardsToday["b:" + i] = { box: (i % 5) + 1, last: t0 - (i % 9) * DAY };
  }
  const flat = m => [m, m, m, m, m, m, m];
  const missPattern = (m, k) => { // m min/day with k rest days spread through the week
    const skip = [[], [0], [0, 3], [0, 2, 4], [0, 2, 4, 6]][k];
    return flat(m).map((x, i) => (skip.includes(i) ? 0 : x));
  };
  const dayOf = c => (c ? Math.round((new Date(c).getTime() - t0) / DAY) : Infinity);
  const cur = PM.simulate(cardsToday, basket, missPattern(11, 4), 700, t0);   // ~his 2.8d/wk
  const p5 = PM.simulate(cardsToday, basket, flat(5).map((x, i) => x + missPattern(11, 4)[i]), 700, t0);
  const p10 = PM.simulate(cardsToday, basket, flat(10).map((x, i) => x + missPattern(11, 4)[i]), 700, t0);
  ok("+5 min/day completes before current pace", dayOf(p5.completion) < dayOf(cur.completion),
    `${p5.completion || "never"} < ${cur.completion || "never"}`);
  ok("+10 min/day completes before +5", dayOf(p10.completion) < dayOf(p5.completion),
    `${p10.completion || "never"} < ${p5.completion || "never"}`);
  let prev = null, monotone = true, detail = [];
  for (let k = 0; k <= 4; k++) {
    const s = PM.simulate(cardsToday, basket, missPattern(10, k), 700, t0);
    detail.push(`miss${k}=${s.completion || "never"}`);
    if (prev !== null && dayOf(s.completion) < dayOf(prev)) monotone = false;
    prev = s.completion;
  }
  ok("each extra missed day pushes completion later (or equal)", monotone, detail.join(" "));
}

/* ---- 4. Skills extrapolation: the conservatism invariants ----
   The whole point is "don't overshoot" — so overshooting is a test FAILURE. */
{
  console.log("4. Skills conservatism (listening/speaking must understate)");
  const t0 = Date.UTC(2026, 7, 1);
  const mkLog = (n, earOk) => {
    // n screen-known words, half ear-tested with the given outcome
    const log = [];
    for (let i = 0; i < n; i++) {
      log.push({ e: "sheet", key: "w:" + i, mode: "understand", ok: true, t: t0 + i * 1000 });
      if (i < n / 2) log.push({ e: "sheet", key: "w:" + i, mode: "ears", ok: earOk, t: t0 + 86400000 + i * 1000 });
    }
    return log;
  };
  const basket = Array.from({ length: 20 }, (_, i) => "w:" + i);
  const tEval = t0 + 2 * 86400000;

  // (a) zero data → near-zero claims, no NaN
  const empty = PM.listeningEstimate([], {}, basket, tEval);
  ok("no data → comprehension ≈ 0 and finite", empty.comprehension === 0 && isFinite(empty.isolatedCov), JSON.stringify(empty));

  // (b) listening chain only ever discounts: comprehension ≤ connected ≤ isolated ≤ screen
  const log1 = mkLog(20, true);
  const cards1 = PM.replay(log1, tEval);
  const screenCov = PM.recallMass(cards1, basket, tEval) / basket.length;
  const li = PM.listeningEstimate(log1, cards1, basket, tEval);
  ok("isolated-ear ≤ screen coverage", li.isolatedCov <= screenCov + 1e-9, `${li.isolatedCov} ≤ ${screenCov.toFixed(3)}`);
  ok("in-stream ≤ isolated", li.connectedCov <= li.isolatedCov + 1e-9, `${li.connectedCov} ≤ ${li.isolatedCov}`);
  ok("comprehension ≤ in-stream coverage", li.comprehension <= li.connectedCov + 1e-9, `${li.comprehension} ≤ ${li.connectedCov}`);

  // (c) failed ear tests DROP the estimate below the no-test extrapolation
  const liBad = PM.listeningEstimate(mkLog(20, false), PM.replay(mkLog(20, false), tEval), basket, tEval);
  ok("failed ear tests lower the estimate", liBad.isolatedCov < li.isolatedCov, `${liBad.isolatedCov} < ${li.isolatedCov}`);

  // (d) the coverage→comprehension curve is brutal below 90% — the non-linearity is the guard
  ok("60% coverage → ≤ 12% comprehension", PM.comprehensionAt(0.6) <= 0.12, PM.comprehensionAt(0.6).toFixed(3));
  ok("95% coverage → ≤ 70% comprehension", PM.comprehensionAt(0.95) <= 0.7 + 1e-9, PM.comprehensionAt(0.95).toFixed(3));
  ok("curve is monotonic", [0.1,0.3,0.5,0.7,0.8,0.9,0.95,1].every((c,i,a)=>!i||PM.comprehensionAt(c)>=PM.comprehensionAt(a[i-1])), "");

  // (e) ear factor: capped, and self-grades weigh half
  const ef = PM.earFactor(log1, cards1, tEval);
  ok("ear factor never exceeds cap 0.80", ef.p <= PM.SKILL_CAL.EAR_CAP + 1e-9, String(ef.p));

  // (f) speaking: no output logged → hours-gate ≈ 0 → deployable ≈ proven only
  const sp0 = PM.speakingEstimate(log1, cards1, basket, [], tEval);
  ok("no output minutes → extrapolated speaking ≈ 0", sp0.deployable <= sp0.provenItems + 0.5, JSON.stringify(sp0));
  // (g) proven production counts; unproven never exceeds the floor × gate
  const logSpeak = log1.concat(Array.from({ length: 30 }, (_, i) => ({ e: "convo", t: t0 + i * 60000 })),
    [{ e: "speak", key: "w:0", score: 0.9, t: t0 + 1000 }]);
  const sp1 = PM.speakingEstimate(logSpeak, cards1, basket, [], tEval);
  ok("speaking rises with proven output but stays ≤ screen mass", sp1.deployable > sp0.deployable && sp1.deployable <= PM.recallMass(cards1, basket, tEval), `${sp0.deployable} → ${sp1.deployable}`);
}

console.log(fails ? `\nFAILED: ${fails}` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
