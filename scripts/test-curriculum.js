/* Tests for the curriculum engine (js/curriculum.js). Contract: CURRICULUM.md.

   Run:  node scripts/test-curriculum.js [path-to-kv-payload.json]

   With a payload it also prints where the learner actually stands, which is the
   calibration check that matters: A1 must be reachable but not already free.
*/
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const C = require(path.join(ROOT, "js", "curriculum.js"));
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const curriculum = D("curriculum.json"), verses = D("verses.json");
let fails = 0;
const ok = m => console.log("  ✓ " + m);
const bad = m => { console.log("  ✗ " + m); fails++; };
const eq = (a, b, m) => (a === b ? ok(m) : bad(`${m} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`));
const yes = (c, m) => (c ? ok(m) : bad(m));

const NOW = Date.UTC(2026, 7, 29, 12, 0, 0);
const ctx = o => Object.assign({ curriculum, verses, log: [], srs: {}, progress: {}, now: NOW }, o);

/* ---------- baskets ---------- */
const salah = C.expandBasket("salah", ctx());
const fatiha = C.expandBasket("fatiha", ctx());
eq(salah.length, 141, "the salah basket is 141 tokens (matches gen-progress.js basketSize)");
eq(fatiha.length, 29, "Al-Fatiha is 29 tokens");
yes(salah[0].startsWith("qw:fatiha:0:"), "basket keys use the qw:<surah>:<verse>:<word> format the SRS uses");

/* ---------- criteria ---------- */
const earLog = n => fatiha.slice(0, n).map(k => ({ e: "alisten-grade", key: k, ok: true, t: NOW - 2 * 86400000 }));
{
  const c = { type: "earCoverage", basket: "fatiha", min: 0.6 };
  yes(!C.evalCriterion(c, ctx({ log: earLog(5) })).met, "earCoverage: 5/29 by ear does not meet 60%");
  yes(C.evalCriterion(c, ctx({ log: earLog(20) })).met, "earCoverage: 20/29 by ear meets 60%");
  const stale = fatiha.slice(0, 25).map(k => ({ e: "alisten-grade", key: k, ok: true, t: NOW - 200 * 86400000 }));
  yes(!C.evalCriterion(c, ctx({ log: stale })).met, "earCoverage: ear results older than 45 days no longer certify");
  const screen = fatiha.slice(0, 25).map(k => ({ e: "sheet", key: k, ok: true, t: NOW - 86400000 }));
  yes(!C.evalCriterion(c, ctx({ log: screen })).met, "earCoverage: SCREEN recall does not count as by-ear (the honest gap)");
}
{
  const srs = {}; for (let i = 0; i < 10; i++) srs["ph-greet:" + i] = { box: i < 9 ? 4 : 0 };
  const c = { type: "srsSolid", keys: ["ph-greet:"], box: 3, min: 0.8 };
  yes(C.evalCriterion(c, ctx({ srs })).met, "srsSolid: 9/10 at box>=3 meets 80%");
  yes(!C.evalCriterion(c, ctx({ srs: {} })).met, "srsSolid: an empty deck fails rather than dividing by zero into a pass");
}
{
  const ex = (s, n, t) => ({ e: "exam-done", n: n || 1, kind: "weekly", score: s, t: t || NOW });
  const c = { type: "examAvg", n: 2, min: 60 };
  yes(!C.evalCriterion(c, ctx({ log: [ex(90)] })).met, "examAvg: one exam cannot satisfy an average of two");
  yes(C.evalCriterion(c, ctx({ log: [ex(60, 1), ex(70, 2)] })).met, "examAvg: 60 and 70 across two weeks meets a 60 average");
  yes(!C.evalCriterion(c, ctx({ log: [ex(40, 1), ex(70, 2)] })).met, "examAvg: 40 and 70 misses a 60 average");
  // retakes must not be able to manufacture a level
  yes(!C.evalCriterion(c, ctx({ log: [ex(90, 1, NOW - 3), ex(95, 1, NOW - 2), ex(99, 1, NOW - 1)] })).met,
    "retaking ONE week three times still counts as one week — repetition cannot buy a level");
}
yes(!C.evalCriterion({ type: "wat", label: "x" }, ctx()).met, "an unknown criterion type fails CLOSED, never silently passes");

/* ---------- levels ---------- */
{
  const L = C.levels(ctx());
  eq(L.quran.earned.length, 0, "a brand-new learner has earned no Qur'an level");
  eq(L.quran.next.label, "A1", "the next Qur'an level is A1");
  eq(L.conv.next.label, "A1", "the next Conversation level is A1");
  yes(L.quran.next.can.length > 10, "the next level carries a can-do sentence, not just a letter");
  yes(L.quran.nextPct >= 0 && L.quran.nextPct <= 1, "progress toward the next level is a fraction");
  const partial = C.levels(ctx({ log: earLog(20) })).quran;
  yes(partial.nextPct > C.levels(ctx()).quran.nextPct, "partial work moves the bar before the level lands");
}

/* ---------- exam kinds ---------- */
eq(C.examKind(1), "weekly", "week 1 is a weekly exam");
eq(C.examKind(4), "monthly", "week 4 is the monthly checkpoint");
eq(C.examKind(13), "quarterly", "week 13 is the quarterly level test");
eq(C.examKind(26), "semiannual", "week 26 is the half-year review");
eq(C.examKind(52), "annual", "week 52 is the annual review");
eq(C.examKind(8), "monthly", "week 8 is monthly, not quarterly");
yes(C.examScope("quarterly").levelTest, "quarterly and above include a level test");
yes(!C.examScope("weekly").levelTest, "the weekly exam does not include a level test");

/* ---------- week sizing + the adjustment loop ---------- */
{
  const base = C.weekSize(ctx());
  eq(base.mins, 35, "with no history the week assumes his observed floor, not his aspiration");
  yes(base.items >= 6 && base.items <= 40, "week size is clamped to a sane range");

  // ~7 active min/day: a real-looking rhythm that is not pinned to the clamp
  // ceiling, so growth and shrink are both observable
  const busy = [];
  for (let d = 1; d <= 21; d++) for (let i = 0; i < 8; i++) busy.push({ e: "sheet", t: NOW - d * 86400000 + i * 60000 });
  const wk = w => ({ e: "week-start", n: w, title: "w" + w, from: "x", to: "y", keys: ["a"], t: NOW - 8 * 86400000 });
  const done = (w, s) => ({ e: "exam-done", n: w, kind: "weekly", score: s, t: NOW - 7 * 86400000 });

  const steady = C.weekSize(ctx({ log: busy })).items;
  const afterBad = C.weekSize(ctx({ log: [...busy, wk(1), done(1, 45)] })).items;
  const afterGood = C.weekSize(ctx({ log: [...busy, wk(1), done(1, 92)] })).items;
  yes(afterBad < steady, "a bad exam SHRINKS the next week (shrink fast)");
  yes(afterGood > steady, "a strong exam grows the next week");
  yes((steady - afterBad) > (afterGood - steady), "shrink is more aggressive than growth — an abandoned week is worse than a slow one");
  yes(/lighter/.test(C.weekSize(ctx({ log: [...busy, wk(1), done(1, 45)] })).basis), "the sizing explains itself in words he can read");

  // re-entry: busy fortnight, then a dead week — the wall that made him stop
  const lapsed = busy.filter(e => e.t < NOW - 7 * 86400000);
  const back = C.weekSize(ctx({ log: lapsed }));
  yes(back.items < steady, "returning after a quiet week gives a SMALLER week, not his best fortnight's");
  yes(/easing back in/.test(back.basis), "and it says why, so a light week doesn't read as a demotion");
}

/* ---------- week progress + self-seed ---------- */
{
  // legacy flat shape must still work — old coach payloads are in the wild
  const week = { n: 1, items: [{ key: "a" }, { key: "b" }, { key: "c" }, { key: "d" }] };
  const p = C.weekProgress(week, { a: { box: 5 }, b: { box: 3 }, c: { box: 1 } }, NOW);
  eq(p.solid, 2, "an item counts as solid at box >= 3");
  eq(p.total, 4, "items with no card yet still count toward the total");

  const srs = {};
  for (let i = 0; i < 60; i++) srs["qc:" + i] = { box: i % 6, due: NOW - (i < 30 ? 86400000 : -86400000) };
  for (let i = 0; i < 8; i++) srs["ph-food:" + i] = { box: 1, due: NOW - 86400000 };
  const seed = C.weekSelfSeed(ctx({ srs }));
  yes(C.weekKeys(seed).length > 0, "a self-seeded week is never empty");
  yes(seed.objectives.length > 0, "a self-seeded week is expressed as OBJECTIVES, not a flat list");
  yes(seed.objectives.every(o => o.title && o.keys.length), "every objective is a described thing with real keys");
  yes(seed.selfSeeded === true, "a self-seeded week is flagged, so the coach knows to replace it");
  eq(seed.n, 1, "the first week is week 1");
  yes(C.weekKeys(seed).every(k => srs[k]), "self-seeded items are real SRS keys");

  const hist = [{ e: "week-start", n: 7, title: "t", objectives: [{ id: "a", title: "A", keys: ["qc:0"] }], t: NOW }];
  eq(C.weekSelfSeed(ctx({ srs, log: hist })).n, 8, "week numbers continue from history and are never reused");
}

/* ---------- mastery is the target; time is the variable ---------- */
{
  const week = {
    n: 1, from: "2026-08-23", to: "2026-08-29",
    objectives: [
      { id: "surah:fatiha", title: "Al-Fatiha, verses 1-2 — by ear", keys: ["qw:fatiha:0:0", "qw:fatiha:0:1"] },
      { id: "ph-food", title: "Ordering food", keys: ["ph-food:0", "ph-food:1"] },
    ],
  };
  const p = C.weekProgress(week, { "qw:fatiha:0:0": { box: 4 }, "qw:fatiha:0:1": { box: 4 }, "ph-food:0": { box: 4 } }, NOW);
  eq(p.objectiveCount, 2, "the week is measured in objectives");
  eq(p.mastered, 1, "an objective is mastered only when ALL of its words are solid");
  yes(!p.complete, "a half-finished objective does not complete the week");
  yes(p.objectives[0].mastered && !p.objectives[1].mastered, "mastery is reported per objective, so he can see which thing is done");

  // time is the variable: what isn't mastered comes BACK, it is not written off
  const log = [{ e: "week-start", n: 1, title: "w1", objectives: week.objectives, t: NOW - 6 * 86400000 }];
  const srs2 = { "qw:fatiha:0:0": { box: 4 }, "qw:fatiha:0:1": { box: 4 }, "ph-food:0": { box: 4 }, "ph-food:1": { box: 1 } };
  const next = C.weekSelfSeed(ctx({ srs: srs2, log }));
  const carried = next.objectives.find(o => /carried over/.test(o.why || ""));
  yes(carried, "an unfinished objective is CARRIED into the next week, never failed for being slow");
  yes(carried.keys.includes("ph-food:1") && !carried.keys.includes("ph-food:0"),
    "…and only the parts he hasn't mastered come back");
  yes(!next.objectives.some(o => o.id === "surah:fatiha" && /carried/.test(o.why || "")),
    "a mastered objective does not come back");
}

/* ---------- a week number is minted once, and a thing appears once ---------- */
{
  const srs = {};
  for (let i = 0; i < 8; i++) srs["ph-food:" + i] = { box: 1, due: NOW - 86400000 };
  for (let i = 0; i < 8; i++) srs["story-02:" + i] = { box: 1, due: NOW - 86400000 };

  const b = C.weekBounds(NOW);
  const first = C.weekSelfSeed(ctx({ srs }));
  eq(first.n, 1, "the first self-seeded week is week 1");

  // simulate the page having announced it, then loading again
  const log = [{ e: "week-start", n: first.n, title: first.title, from: first.from, to: first.to,
                 objectives: first.objectives, keys: C.weekKeys(first), t: NOW }];
  const second = C.weekSelfSeed(ctx({ srs, log }));
  eq(second.n, 1, "reloading the page does NOT mint a new week number");
  eq(JSON.stringify(second.objectives), JSON.stringify(first.objectives), "…and the same week comes back unchanged");

  // next calendar week: carried-over work must not appear twice
  const lastWeek = [{ e: "week-start", n: 1, title: "Week 1", from: "2026-08-16", to: "2026-08-22",
                      objectives: [{ id: "ph-food", title: "Eating & drinking", keys: ["ph-food:0", "ph-food:1"] }],
                      keys: ["ph-food:0", "ph-food:1"], t: NOW - 9 * 86400000 }];
  const nextWk = C.weekSelfSeed(ctx({ srs, log: lastWeek }));
  eq(nextWk.n, 2, "a genuinely new calendar week gets the next number");
  const ids = nextWk.objectives.map(o => o.id);
  eq(ids.length, new Set(ids).size, "no group appears twice — a carried objective absorbs its new words");
  const food = nextWk.objectives.filter(o => o.id === "ph-food");
  eq(food.length, 1, "'Eating & drinking' appears exactly once, not once carried and once fresh");
  yes(food[0].keys.length > 2, "…and it absorbed the newly-slipping words from the same group");
  eq(new Set(C.weekKeys(nextWk)).size, C.weekKeys(nextWk).length, "no word is listed under two objectives");
}

/* ---------- exam construction ---------- */
{
  const items = []; for (let i = 0; i < 30; i++) items.push({ key: "qw:fatiha:0:" + i });
  const prev = [];
  for (let w = 1; w <= 3; w++) prev.push({ e: "week-start", n: w, title: "w", keys: ["qc:" + w, "qc:" + (w + 90)], t: NOW });
  const week = { n: 4, items };
  const ex = C.examBuild(week, ctx({ log: prev }));
  eq(ex.kind, "monthly", "week 4 builds a monthly exam");
  yes(ex.items.length <= ex.total && ex.items.length > 0, "the exam has items and respects its size");
  yes(ex.items.some(i => i.section === "carry"), "carried items from earlier weeks are included");
  yes(ex.items.some(i => i.section === "week"), "this week's items are included");

  const wk = C.examBuild({ n: 5, items }, ctx({ log: prev }));
  const carry = wk.items.filter(i => i.section === "carry").length;
  yes(carry <= Math.round(20 * 0.2) && carry > 0, "a weekly exam is ~80% this week / 20% carried (his choice)");
  const q = wk.items.filter(i => i.key.startsWith("qw:") || i.key.startsWith("qc:"));
  const ear = q.filter(i => i.form === "ear").length;
  yes(ear >= Math.floor(q.length / 2), "at least half the Qur'an-track questions are answered BY EAR");

  const a = C.examBuild({ n: 5, items }, ctx({ log: prev }));
  eq(JSON.stringify(a.items), JSON.stringify(wk.items), "an exam is deterministic — refreshing mid-exam does not reshuffle it");
}

/* ---------- learn -> test: carrying on past the target must be TESTED ---------- */
{
  const week = { n: 2, from: "2026-08-23", to: "2026-08-29", objectives: [{ id: "g", title: "G", keys: ["qc:1", "qc:2"] }] };
  const inWeek = Date.UTC(2026, 7, 26);
  const srs = {
    "qc:1": { box: 4, u: inWeek }, "qc:2": { box: 4, u: inWeek },
    "qc:9": { box: 4, u: inWeek },                       // extra work, never on the list
    "qc:8": { box: 4, u: Date.UTC(2026, 6, 1) },         // solid, but learnt long ago
    "qc:7": { box: 1, u: inWeek },                       // touched this week but not solid
  };
  const learned = C.weekLearned(week, srs, NOW).map(l => l.key).sort();
  yes(learned.includes("qc:9"), "work beyond the pre-set target counts as learnt");
  yes(!learned.includes("qc:8"), "material learnt in an earlier week is not re-counted as this week's");
  yes(!learned.includes("qc:7"), "something touched but not brought to solid is not 'learnt'");

  const prog = C.weekProgress(week, srs, NOW);
  eq(prog.solid, 2, "progress against the pre-set target is still reported");
  eq(prog.extra, 1, "extra work beyond the target is counted, not capped away");
  eq(prog.learnedTotal, 3, "the total actually learnt is target plus extra");

  const ex = C.examBuild(week, ctx({ srs, log: [], now: NOW }));
  const keys = ex.items.map(i => i.key);
  yes(keys.includes("qc:9"), "LEARN -> TEST: the exam covers the extra work, not just the list");
  yes(keys.includes("qc:1") && keys.includes("qc:2"), "…and still covers the week's target");

  // the union matters: testing only the MASTERED part would score ~100% every
  // time and hide the movement he wants to watch
  const early = {
    n: 4, from: "2026-08-23", to: "2026-08-29",
    objectives: [{ id: "g", title: "G", keys: ["qc:1", "qc:2", "qc:3", "qc:4", "qc:5"] }],
  };
  const earlySrs = { "qc:1": { box: 4, u: inWeek } };            // only one mastered so far
  const earlyEx = C.examBuild(early, ctx({ srs: earlySrs, now: NOW }));
  eq(earlyEx.items.length, 5, "early in the week the test still covers the WHOLE target, so the score can start low and climb");

  const fresh = C.examBuild({ n: 3, from: "2026-08-23", to: "2026-08-29", objectives: [{ id: "g", title: "G", keys: ["qc:1"] }] }, ctx({ srs: {}, now: NOW }));
  yes(fresh.items.length > 0, "before anything is solid the exam is still built, never empty");
}

/* ---------- the verdict: a result is described, not just scored ---------- */
{
  const answers = [
    { key: "qw:fatiha:0:0", ok: true, section: "week", form: "ear" },
    { key: "qw:fatiha:0:1", ok: true, section: "week", form: "ear" },
    { key: "qw:fatiha:0:2", ok: true, section: "week", form: "mean" },
    { key: "ph-help:1", ok: false, section: "week", form: "prod" },
    { key: "ph-help:2", ok: false, section: "carry", form: "prod" },
  ];
  const r = C.examScoreOf(answers);
  const v = C.examVerdict(r, answers, { nameFor: g => ({ "surah:fatiha": "Al-Fatiha", "ph-help": "asking for help" }[g] || g) });
  yes(v.held.includes("Al-Fatiha"), "the verdict names what he HELD, in content terms");
  yes(v.shaky.includes("asking for help"), "the verdict names what is still shaky, in content terms");
  yes(v.lines.length >= 3, "the verdict is several sentences of description, not a bare number");
  yes(/re-teaches|carries|steps up/.test(v.nextWeek), "the verdict closes the loop by saying what next week will DO");
  yes(v.lines.some(l => /by[- ]ear/i.test(l)), "the by-ear performance is described explicitly");

  eq(C.groupOf("qw:asr:1:2"), "surah:asr", "keys group by surah");
  eq(C.groupOf("ph-food:3"), "ph-food", "keys group by phrase set");
  eq(C.groupOf("story-02:5"), "story-02", "keys group by story");

  const L = C.levelSummary(ctx());
  eq(L.length, 2, "the level summary covers both tracks");
  yes(/working toward A1/.test(L[0].line), "course lingo (A1) and the can-do line are reported together");
}

/* ---------- scoring ---------- */
{
  const ans = [
    { ok: true, section: "week", form: "ear" }, { ok: false, section: "week", form: "ear" },
    { ok: true, section: "week", form: "mean" }, { ok: true, section: "carry", form: "mean" },
  ];
  const r = C.examScoreOf(ans);
  eq(r.score, 75, "score is correct/total as a percentage");
  eq(r.sections.ear, 50, "the by-ear section is reported separately, never hidden in the headline");
  eq(r.sections.carry, 100, "the carried section is reported separately");
  eq(C.examBand(90).band, "strong", "90 is strong");
  eq(C.examBand(72).band, "solid", "72 is solid");
  eq(C.examBand(62).band, "shaky", "62 is shaky");
  eq(C.examBand(30).band, "not yet", "30 is not yet — and the wording re-teaches rather than scolds");
}

/* ---------- retakes: unlimited, and a learning tool in their own right ---------- */
{
  const at = (n, s, t) => ({ e: "exam-done", n, kind: "weekly", score: s, t });
  const log = [at(1, 45, 10), at(1, 62, 20), at(1, 81, 30), at(2, 70, 40)];

  eq(C.examAttempts(log, 1).length, 3, "every attempt at a week is kept");
  eq(C.examResults(log).length, 2, "but each week contributes exactly ONE score to the record");
  eq(C.examResults(log)[0].score, 81, "the week's score is its LATEST attempt, not its best or its first");

  const traj = C.examTrajectory(log, 1);
  eq(traj.attempts, 3, "the trajectory counts the attempts");
  eq(traj.first, 45, "the trajectory keeps the starting point");
  eq(traj.latest, 81, "…and where he got to");
  eq(traj.gain, 36, "…so 'how far along have I gone' is answerable in one number");
  yes(C.examTrajectory(log, 9) === null, "a week never tested has no trajectory rather than a fake zero");

  // a retake must be a different paper, or he learns the paper and not the words
  const items = []; for (let i = 0; i < 30; i++) items.push({ key: "qc:" + i });
  const week = { n: 5, from: "2026-08-23", to: "2026-08-29", items };
  const a1 = C.examBuild(week, ctx({ now: NOW }), { attempt: 1 });
  const a2 = C.examBuild(week, ctx({ now: NOW }), { attempt: 2 });
  const same = JSON.stringify(a1.items.map(i => i.key)) === JSON.stringify(a2.items.map(i => i.key));
  yes(!same, "a retake reshuffles — he cannot memorise the paper instead of the material");
  const a1again = C.examBuild(week, ctx({ now: NOW }), { attempt: 1 });
  eq(JSON.stringify(a1again.items), JSON.stringify(a1.items), "…but one attempt stays stable if he refreshes mid-test");
}

/* ---------- history ---------- */
{
  const log = [
    { e: "week-start", n: 1, title: "Week 1", from: "2026-08-30", to: "2026-09-05", keys: ["a"], t: 1 },
    { e: "exam-done", n: 1, kind: "weekly", score: 78, t: 2 },
    { e: "week-start", n: 2, title: "Week 2", keys: ["b"], t: 3 },
  ];
  const h = C.weekHistory(log);
  eq(h.length, 2, "history replays one entry per week from the log");
  eq(h[0].score, 78, "a week's exam score is joined onto its week-start");
  eq(h[1].score, undefined, "a week with no exam has no score — NOT a zero (a zero would lie about his knowledge)");
}

/* ---------- calibration against real data, if given ---------- */
const payloadPath = process.argv[2];
if (payloadPath && fs.existsSync(payloadPath)) {
  const d = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const real = ctx({ log: d.log, srs: d.srs, progress: d.progress, now: Date.now() });
  const L = C.levels(real);
  console.log("\n  ── where he actually stands ──");
  for (const t of Object.values(L)) {
    console.log(`  ${t.icon} ${t.name}: ${t.current ? t.current.label : "not yet " + t.next.label}` +
      (t.next ? ` → ${t.next.label} at ${Math.round(t.nextPct * 100)}%` : " (ladder complete)"));
    if (t.next) for (const c of t.next.criteria)
      console.log(`      ${c.met ? "✓" : "·"} ${c.label}: ${c.have}/${c.need} ${c.unit}`);
  }
  const seed = C.weekSelfSeed(real);
  console.log(`  self-seeded week ${seed.n} — ${seed.objectives.length} objectives, ${C.weekKeys(seed).length} words:`);
  for (const o of seed.objectives) console.log(`      · ${o.title} (${o.keys.length})`);

  yes(L.quran.earned.length === 0, "calibration: A1 is not already free (he has not earned it by doing nothing)");
  yes(L.quran.nextPct > 0.05, "calibration: A1 is visibly in reach, not a standing start");
  yes(seed.objectives.length >= 2, "calibration: a real week is several described objectives, not one blob");
  yes(C.weekKeys(seed).length >= 6, "calibration: a real self-seeded week has enough to do");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
