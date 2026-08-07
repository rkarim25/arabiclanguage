/* gen-progress.js — builds data/progress-series.json: the numbers behind the
   dashboard's Reality & Forecast chart and the weekly-email PNG.
   Usage:  node scripts/gen-progress.js <payload.json>
   where payload.json is a KV data blob {progress,srs,log,...} (the nightly coach
   already pulls it; snapshots in the data repo work too).

   Everything here delegates the maths to js/progress-model.js — this file only
   builds the goal BASKETS from the site's data files, picks the scenarios, and
   shapes the JSON. Run scripts/test-progress-model.js before deploying changes. */
"use strict";
const fs = require("fs");
const path = require("path");
const PM = require("../js/progress-model.js");
const DAY = PM.DAY;

const ROOT = path.join(__dirname, "..");
const readJ = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));

const payloadPath = process.argv[2];
if (!payloadPath) { console.error("usage: node scripts/gen-progress.js <payload.json>"); process.exit(2); }
const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

const verses = readJ("data/verses.json");
const everyday = readJ("data/everyday.json");
const phrases = readJ("data/phrases.json");
const qcore = readJ("data/quran-core.json");
const qref = PM.buildQrefIndex(verses);

/* ---- goal baskets (keep aligned with goalStages in js/app.js) ---- */
const SALAH_SURAH_IDS = ["fatiha", "ikhlas", "falaq", "nas", "kawthar", "asr", "qadr"];
const qwKeys = ids => verses.surahs
  .filter(s => !ids || ids.includes(s.id))
  .flatMap(s => s.verses.flatMap((v, vi) => v.words.map((w, wi) => `qw:${s.id}:${vi}:${wi}`)));
const QURAN_STAGES = [
  // mode "catch": memorized text — skill = words caught by ear in the stream (target 90%)
  // mode "comprehend": novel passages — coverage→comprehension curve (target 70%)
  { id: "salah", label: "Understand your salah as recited", mode: "catch",
    basket: qwKeys(SALAH_SURAH_IDS) },
  { id: "familiar", label: "Follow familiar passages", mode: "comprehend",
    basket: qwKeys(null) },
];
const EV_WORDS = everyday.groups.flatMap(g => (g.members || []).map((m, i) => `ev-${g.id}:${i}`));
const PH_KEYS = phrases.groups.flatMap(g => (g.members || []).map((m, i) => `ph-${g.id}:${i}`));
const CONV_STAGES = [
  { id: "umrah", label: "Speak for Umrah", words: EV_WORDS, phrases: PH_KEYS },
];

/* ---- measured rhythm (for the "current pace" scenario) ---- */
function measuredRhythm(log) {
  const times = (log || []).filter(e => e.t > 16e11 && e.e !== "time").map(e => e.t).sort((a, b) => a - b);
  if (times.length < 10) return { minPerStudyDay: 10, daysPerWeek: 3 };
  let mins = 0;
  for (let i = 1; i < times.length; i++) { const g = times[i] - times[i - 1]; mins += g <= 3 * 60000 ? g / 60000 : 0.5; }
  const days = new Set(times.map(t => new Date(t).toDateString())).size;
  const weeks = Math.max(1, (times[times.length - 1] - times[0]) / (7 * DAY));
  return {
    minPerStudyDay: Math.max(3, Math.round(mins / days)),
    daysPerWeek: Math.min(7, Math.max(1, Math.round((days / weeks) * 10) / 10)),
  };
}
/* spread n study-days across the week (0=Sun..6=Sat) */
const SPREAD = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
const weeklyPattern = (minutes, daysPerWeek) => {
  const w = [0, 0, 0, 0, 0, 0, 0];
  (SPREAD[Math.round(daysPerWeek)] || SPREAD[3]).forEach(d => (w[d] = minutes));
  return w;
};
const addDaily = (w, extra) => w.map(x => x + extra);

/* downsample a daily series for the JSON: weekly points + the last point */
const thin = series => series.filter((p, i) => i % 7 === 0 || i === series.length - 1);

/* ---- SKILL-AXIS tracks (2026-08-07 redesign): the chart plots the skill —
   listening comprehension (Quran) / speaking deployability (conversation) —
   with exactly THREE forecasts: current pace, one higher, one lower. ---- */
function buildSkillTrack(kind, stages, log, srs, now) {
  const cards = PM.replay(log, now, qref);
  const mix = PM.practiceMix(log);
  const evAll = PM.earEvidence(log);
  const efNow = PM.earFactor(log, cards, now);
  const cfNow = PM.connectedFactorCalibrated(log, now);
  const floorNow = PM.productiveFloorCalibrated(log, now);
  // active stage = first whose SKILL isn't at ITS target yet (skill-axis, not retention)
  const targetOf = st => kind === "listen" ? PM.listenTargetOf(st.mode) : PM.SKILL_CAL.SPEAK_TARGET;
  const skillNow = st => {
    if (kind === "listen") {
      let iso = 0;
      for (const k of st.basket) iso += PM.earRecallP(k, cards, evAll, efNow.p, now);
      const asym = st.mode === "catch" ? PM.SKILL_CAL.CONN_ASYM_FAMILIAR : PM.SKILL_CAL.CONN_CAP;
      return PM.listenSkillOf((iso / st.basket.length) * Math.min(asym, cfNow.p), st.mode);
    }
    const sp = PM.speakingEstimate(log, cards, st.words, st.phrases, now);
    return sp.deployable / sp.basketSize;
  };
  let stage = stages[stages.length - 1];
  for (const st of stages) { if (skillNow(st) < targetOf(st)) { stage = st; break; } }
  const target = targetOf(stage);

  const stream = PM.gradedStream(log, qref);
  const fromT = stream.length ? stream[0].t : now - 30 * DAY;
  const reality = kind === "listen"
    ? PM.listeningSkillSeries(log, stage.basket, fromT, now, qref, stage.mode)
    : PM.speakingSkillSeries(log, stage.words, stage.phrases, fromT, now, qref);
  const r = measuredRhythm(log);
  const current = weeklyPattern(r.minPerStudyDay, r.daysPerWeek);
  const HORIZON = 550;
  const basket = kind === "listen" ? stage.basket : stage.words.concat(stage.phrases);
  const provenSet = new Set();
  for (const e of log || []) {
    if (!e || !e.t || e.t < 16e11) continue;
    if (e.e === "speak" && (e.score !== undefined ? e.score : e.sim || 0) >= PM.SKILL_CAL.SPEAK_OK && e.key) provenSet.add(e.key);
    else if (e.e === "sheet" && e.mode === "produce" && e.ok && e.key) provenSet.add(e.key);
  }
  const scen = (id, label, weekly, mixOverride) => {
    const s = PM.simulateSkill(kind, cards, basket, {
      weeklyMinutes: weekly, horizonDays: HORIZON, startT: now,
      mix: mixOverride || mix, conn0: cfNow.p, mode: stage.mode,
      earF: efNow.p, outMin0: PM.outputMinutes(log), floor: floorNow,
      provenSet, phraseSet: new Set(stage.phrases || []),
    });
    return { id, label, completion: s.completion, series: thin(s.series) };
  };
  // three lines only (his ask): current · one higher · one lower. The higher
  // lever is the one that moves THIS skill (by-ear share for the ear, out-loud
  // share for the mouth) at 15 min/day — the measured capacity cliff: 10 min/day
  // can only maintain ~⅓ of the Umrah basket, 15 holds all of it.
  const scenarios = kind === "listen" ? [
    scen("current", `your current rhythm (~${r.minPerStudyDay} min, ${r.daysPerWeek} d/wk)`, current),
    scen("higher", "15 min every day, half of it by ear", weeklyPattern(15, 7), { earShare: 0.5, outShare: mix.outShare }),
    scen("lower", "slipping to 2 days/wk", weeklyPattern(r.minPerStudyDay, 2)),
  ] : [
    scen("current", `your current rhythm (~${r.minPerStudyDay} min, ${r.daysPerWeek} d/wk)`, current),
    scen("higher", "15 min every day, half out loud", weeklyPattern(15, 7), { earShare: mix.earShare, outShare: 0.5 }),
    scen("lower", "slipping to 2 days/wk", weeklyPattern(r.minPerStudyDay, 2)),
  ];
  // placement-test anchors for the chart
  const pt = PM.ptestEvidence(log)[kind === "listen" ? "listen" : "speak"]
    .map(e => ({ d: new Date(e.t).toISOString().slice(0, 10), skill: Math.round(e.score * 1000) / 1000 }));
  return {
    kind, stage: stage.id, label: stage.label, basketSize: basket.length,
    target, rhythm: r, mix: { earShare: Math.round(mix.earShare * 100) / 100, outShare: Math.round(mix.outShare * 100) / 100 },
    factors: { ear: Math.round(efNow.p * 100) / 100, conn: Math.round(cfNow.p * 100) / 100, floor: Math.round(floorNow * 100) / 100, tests: pt.length },
    reality, tests: pt,
    todaySkill: reality.length ? reality[reality.length - 1].skill : 0,
    scenarios,
  };
}

const now = Date.now();

/* ---- conservative skills extrapolation (listening & speaking) ----
   Listening is evaluated on the salah surahs' TOKENS (each qw: key is one word
   as it occurs in recitation — token coverage falls straight out). Speaking is
   evaluated on the conversation basket, words vs phrases separated. */
function buildSkills(log, now) {
  const cards = PM.replay(log, now, qref);
  const salahTokens = qwKeys(SALAH_SURAH_IDS);
  const evWords = everyday.groups.flatMap(g => (g.members || []).map((m, i) => `ev-${g.id}:${i}`));
  const phKeys = phrases.groups.flatMap(g => (g.members || []).map((m, i) => `ph-${g.id}:${i}`));
  return {
    note: "Conservative by design: screen-knowledge is discounted for the ear (Goh 2000; Field 2008), isolated-word recognition is discounted for connected speech, coverage→comprehension is non-linear (van Zeeland & Schmitt 2013; Nation 2006), production is floored at the bottom of the receptive→productive range (Laufer 1998; Webb 2008) and capped by logged output time (DeKeyser). These numbers should UNDERSTATE.",
    listening: PM.listeningEstimate(log, cards, salahTokens, now),
    speaking: PM.speakingEstimate(log, cards, evWords, phKeys, now),
  };
}

/* ---- the weekly narrative: 4 sentences, regenerated every nightly run, shown
   under the charts and quoted in the weekly email. Data-written, so it changes
   exactly as fast as his reality does. ---- */
function weekDelta(reality) {
  if (reality.length < 2) return 0;
  const last = reality[reality.length - 1];
  const cutoff = new Date(last.d).getTime() - 7 * DAY;
  const older = reality.filter(p => new Date(p.d).getTime() <= cutoff);
  const then = older.length ? older[older.length - 1] : reality[0];
  return 100 * (last.skill - then.skill);
}
const fmtDate = iso => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
function narrative(q, c) {
  const dq = weekDelta(q.reality), dc = weekDelta(c.reality);
  const move = (d, name) =>
    d >= 0.5 ? `your ${name} rose ${d.toFixed(1)} points` :
    d <= -0.5 ? `your ${name} slipped ${Math.abs(d).toFixed(1)} points (fading, not failing — it comes back faster than it left)` :
    `your ${name} held steady`;
  const qh = q.scenarios.find(s => s.id === "higher"), qc = q.scenarios.find(s => s.id === "current");
  const ch = c.scenarios.find(s => s.id === "higher"), cc = c.scenarios.find(s => s.id === "current");
  const eta = s => s && s.completion ? `around ${fmtDate(s.completion)}` : "beyond 18 months";
  const s = [];
  s.push(`This week: ${move(dq, "listening")}; ${move(dc, "speaking")}.`);
  s.push(`🎧 You'd catch ~${(100 * q.todaySkill).toFixed(0)}% of your salah by ear today. At your current rhythm the ${Math.round(100 * q.target)}% goal is ${eta(qc)}; on the higher path (${qh.label}) it's ${eta(qh)}.`);
  s.push(`🗣 ~${(100 * c.todaySkill).toFixed(0)}% of the Umrah set is speech-ready. ${ch.label} reaches the goal ${eta(ch)}${cc.completion ? `; your current rhythm ${eta(cc)}` : "; your current rhythm doesn't reach it within 18 months"}.`);
  const tests = (q.factors.tests || 0) + (c.factors.tests || 0);
  s.push(tests === 0
    ? "No placement test yet, so these forecasts run on deliberately cautious assumptions — one 5-minute listening test would sharpen every line."
    : `${tests} placement test${tests > 1 ? "s" : ""} anchoring the model — keep one coming every week or two.`);
  return s.join(" ");
}

const out = {
  generated: new Date(now).toISOString(),
  cal: PM.CAL,
  note: "All maths in js/progress-model.js (calibrated from the learner's own answers). Solid = replayed reality; dotted = expected-value simulation of the site's own scheduler. 'Done' = holding ≥90% of the basket recallable on any given day.",
  tracks: {
    quran: buildSkillTrack("listen", QURAN_STAGES, payload.log, payload.srs, now),
    conv: buildSkillTrack("speak", CONV_STAGES, payload.log, payload.srs, now),
  },
  skills: buildSkills(payload.log, now),
};
out.narrative = narrative(out.tracks.quran, out.tracks.conv);
const outPath = path.join(ROOT, "data", "progress-series.json");
fs.writeFileSync(outPath, JSON.stringify(out));
const t = out.tracks;
console.log(`progress-series.json written (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
for (const [k, tr] of Object.entries(t)) {
  console.log(`  ${k}: stage "${tr.label}" — today ${(100 * tr.todaySkill).toFixed(1)}% (target ${100 * tr.target}%; factors ${JSON.stringify(tr.factors)})`);
  tr.scenarios.forEach(s => console.log(`    ${s.id.padEnd(8)} → ${s.completion || "not within 18 months"}`));
}
const sk = out.skills;
console.log(`  listening (salah tokens): isolated ${(100 * sk.listening.isolatedCov).toFixed(0)}% → in-stream ${(100 * sk.listening.connectedCov).toFixed(0)}% → comprehension ~${(100 * sk.listening.comprehension).toFixed(0)}% (ear factor ${sk.listening.earFactor}, evidence n=${sk.listening.earEvidenceN}; certified ${sk.listening.certifiedWords} words)`);
console.log(`  speaking: proven ${sk.speaking.provenItems} · deployable ~${sk.speaking.deployable}/${sk.speaking.basketSize} (output ${sk.speaking.outputMinutes} min, hours-gate ${sk.speaking.hoursGate})`);
