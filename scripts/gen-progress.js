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
  { id: "salah", label: "Your salah, fully understood",
    basket: qcore.words.slice(0, 60).map((w, i) => "qc:" + i).concat(qwKeys(SALAH_SURAH_IDS)) },
  { id: "familiar", label: "Follow familiar passages",
    basket: qcore.words.map((w, i) => "qc:" + i).concat(qwKeys(null)) },
];
const CONV_STAGES = [
  { id: "umrah", label: "Umrah-transactional Arabic",
    basket: everyday.groups.flatMap(g => (g.members || []).map((m, i) => `ev-${g.id}:${i}`))
      .concat(phrases.groups.flatMap(g => (g.members || []).map((m, i) => `ph-${g.id}:${i}`))) },
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

function buildTrack(stages, log, srs, now) {
  // active stage = first whose basket isn't held at target yet
  const cards = PM.replay(log, now, qref);
  let stage = stages[stages.length - 1];
  for (const st of stages) {
    if (PM.recallMass(cards, st.basket, now) < PM.CAL.RECALL_TARGET * st.basket.length) { stage = st; break; }
  }
  const basket = stage.basket;
  const stream = PM.gradedStream(log, qref);
  const fromT = stream.length ? stream[0].t : now - 30 * DAY;
  const reality = PM.realitySeries(log, basket, fromT, now, qref);
  const r = measuredRhythm(log);
  const current = weeklyPattern(r.minPerStudyDay, r.daysPerWeek);
  const HORIZON = 550;
  const scen = (id, label, weekly) => {
    const s = PM.simulate(cards, basket, weekly, HORIZON, now);
    return { id, label, weekly, completion: s.completion, series: thin(s.series) };
  };
  return {
    stage: stage.id, label: stage.label, basketSize: basket.length,
    target: PM.CAL.RECALL_TARGET,
    rhythm: r,
    reality,
    todayMass: reality.length ? reality[reality.length - 1].mass : 0,
    basket, // shipped so the site can compute a LIVE point from local SRS
    scenarios: [
      scen("current", `your current rhythm (~${r.minPerStudyDay} min, ${r.daysPerWeek} d/wk)`, current),
      scen("plus5", "+5 min every day", addDaily(current, 5)),
      scen("plus10", "+10 min every day", addDaily(current, 10)),
      scen("ten7", "10 min, every day", weeklyPattern(10, 7)),
      scen("miss1", "10 min, missing 1 day/wk", weeklyPattern(10, 6)),
      scen("miss2", "10 min, missing 2 days/wk", weeklyPattern(10, 5)),
      scen("miss3", "10 min, missing 3 days/wk", weeklyPattern(10, 4)),
      scen("miss4", "10 min, missing 4 days/wk", weeklyPattern(10, 3)),
    ],
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

const out = {
  generated: new Date(now).toISOString(),
  cal: PM.CAL,
  note: "All maths in js/progress-model.js (calibrated from the learner's own answers). Solid = replayed reality; dotted = expected-value simulation of the site's own scheduler. 'Done' = holding ≥90% of the basket recallable on any given day.",
  tracks: {
    quran: buildTrack(QURAN_STAGES, payload.log, payload.srs, now),
    conv: buildTrack(CONV_STAGES, payload.log, payload.srs, now),
  },
  skills: buildSkills(payload.log, now),
};
const outPath = path.join(ROOT, "data", "progress-series.json");
fs.writeFileSync(outPath, JSON.stringify(out));
const t = out.tracks;
console.log(`progress-series.json written (${Math.round(fs.statSync(outPath).size / 1024)} KB)`);
for (const [k, tr] of Object.entries(t)) {
  console.log(`  ${k}: stage "${tr.label}" — today ${tr.todayMass}/${tr.basketSize} recallable (${(100 * tr.todayMass / tr.basketSize).toFixed(1)}%)`);
  tr.scenarios.forEach(s => console.log(`    ${s.id.padEnd(8)} → ${s.completion || "not within 18 months"}`));
}
const sk = out.skills;
console.log(`  listening (salah tokens): isolated ${(100 * sk.listening.isolatedCov).toFixed(0)}% → in-stream ${(100 * sk.listening.connectedCov).toFixed(0)}% → comprehension ~${(100 * sk.listening.comprehension).toFixed(0)}% (ear factor ${sk.listening.earFactor}, evidence n=${sk.listening.earEvidenceN}; certified ${sk.listening.certifiedWords} words)`);
console.log(`  speaking: proven ${sk.speaking.provenItems} · deployable ~${sk.speaking.deployable}/${sk.speaking.basketSize} (output ${sk.speaking.outputMinutes} min, hours-gate ${sk.speaking.hoursGate})`);
