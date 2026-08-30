/* ============================================================================
   plan.js — the day-plan engine (2026-08-07, Reza's redesign of "What now?").

   THE IDEA: instead of five open-ended suggestion tiles, the site builds ONE
   plan per day — "Today: 3 blocks, ~15 minutes" — chosen by marginal skill
   value (the same reasoning as the forecast's green "higher" line: 15 min/day
   with the deficient modality prioritised), runs him through it with a sticky
   plan bar that always knows the next step, ends with an explicit "today is
   COMPLETE", and allows banking exactly ONE block from tomorrow (spacing beats
   massing — more than that fights the scheduler).

   Loaded on every page after app.js + tracker.js. renderNav() calls
   planMountBar(); index.html calls planRenderCard(container).

   Block completion, most-robust-first: (1) a mapped log event fires (plan.js
   wraps logEvent to observe), (2) enough focused time accrues on the block's
   page (15s ticks while visible), (3) the manual ✓ on the bar. No block can
   trap him — every path moves forward.
   ============================================================================ */
"use strict";

const PLAN_KEY = "ats-plan";
const PLAN_HIST_KEY = "ats-plan-hist";   // last few days: [{date, types:[], content:[]}]
const PLAN_BANK_KEY = "ats-plan-bank";   // date whose plan owes a block (was banked)
const PLAN_BLOCK_MIN = 5;
const PLAN_TARGET_SHARE = 0.5;           // the higher-line assumption: half of practice in the weak modality

/* deterministic per-day randomness — same plan all day, different tomorrow */
function planHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
const planToday = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

/* practice mix over the last 14 days — which modality is starving */
function planMix() {
  const cutoff = Date.now() - 14 * 86400000;
  let graded = 0, ear = 0, out = 0;
  for (const e of store.get("ats-log", [])) {
    if (!e || !e.t || e.t < cutoff) continue;
    if (e.e === "sheet") { graded++; if (e.mode === "ears") ear++; if (e.mode === "produce") out++; }
    else if (e.e === "review" || e.e === "qfill") graded++;
    else if (e.e === "alisten-grade" || e.e === "commute-check") { graded++; ear++; }
    else if (e.e === "vspeak" || e.e === "vspeak-self" || e.e === "spract" || e.e === "trans" || e.e === "prompt") { graded++; out++; }
  }
  return { earShare: graded ? ear / graded : 0, outShare: graded ? out / graded : 0, graded };
}
function planDaysSince(evName) {
  const log = store.get("ats-log", []);
  for (let i = log.length - 1; i >= 0; i--) if (log[i] && log[i].e === evName) return (Date.now() - log[i].t) / 86400000;
  return Infinity;
}

/* ---- the block catalog: everything a 5-minute unit can be ----
   done: the log event that completes it (observed via the logEvent wrap). */
const PLAN_BLOCKS = {
  /* REVIEW IS SENTENCES, NOT WORDS. His point, 2026-08-30: "shouldnt this also
     be clear some sentences as well, rather than just words. always good to
     review some sentences, dont you think?" — and he is right, because the whole
     site is built on the rule that a word is met inside a sentence and never on
     its own. The block was offering the one thing the lessons deliberately
     stopped doing. review.html mixes both when no `only` is passed, and the
     wording now says so. */
  review:    { icon: "🔁", title: n => `Review your ${n} due — in sentences`, sub: "Reviews first — they protect everything the other blocks build. Words come back inside the sentences they live in.", url: "review.html", page: "review", done: ["review-done"] },
  newwords:  { icon: "📝", title: () => "A few new words", sub: "Frequency-first — fill the column, check, stop.", url: "vocab.html?sheet=1", page: "vocab", done: ["sheet-done"] },
  audio:     { icon: "🎧", title: () => "Audio Coach round", sub: "Ears only — every word you name by sound is certified by ear and lifts the listening line. On the move? The 🚗 commute session counts fully.", url: "audio.html", page: "audio", done: ["alisten-done", "commute-done"] },
  salah:     { icon: "📖", title: c => `Surah ${c} — word by word`, sub: "The salah basket: meaning mapped onto sound you already recite.", url: c => `quran.html?s=${c}`, page: "quran", done: ["qtest-part", "qtest-done", "qlisten-test"] },
  speakdrill:{ icon: "🎤", title: () => "Speak round — mic on", sub: "Say them out loud. Spoken practice is the only thing that moves the speaking line.", url: "speaking.html", page: "speaking", done: ["drill-done", "prompt"] },
  sentences: { icon: "✍️", title: () => "Build 5 sentences", sub: "Conjugate and produce — I/we/they across the tenses.", url: "sentences.html", page: "sentences", done: ["spract-done"] },
  phrases:   { icon: "💬", title: c => "Phrases out loud — " + c, sub: "Whole sentences you'll actually say. Read each ALOUD before revealing.", url: c => `vocab.html?ph=${c}&mode=drill`, page: "vocab", done: ["drill-done", "fill-done"] },
  story:     { icon: "📖", title: c => `${c.title} · ${c.stepEn}`, sub: c => c.sub, url: c => `story.html?id=${c.id}&step=${c.step}`, page: "story", done: ["story-step"] },
  ptest:     { icon: "🎯", title: () => "5-minute listening test", sub: "A measurement, not a drill — it anchors your chart and corrects the forecast.", url: "placement.html", page: "placement", done: ["ptest-listen"] },
  homework:  { icon: "📚", title: () => "Teacher homework", sub: "", url: "vocab.html?view=lessons", page: "vocab", done: ["fill-done", "drill-done", "sheet-done"] }, // display fields overridden in planMakeBlock
  exam:      { icon: "🎤", title: () => "Oral exam (via any AI)", sub: "Ten minutes with an AI examiner — the score anchors your speaking line.", url: "converse.html?exam=1", page: "converse", done: ["ptest-speak"] },
};

const PHRASE_GIDS = ["greet", "intro", "ask", "need", "dir", "shop", "food", "time", "talk", "help", "state", "deen"];
const PLAN_SURAHS = ["fatiha", "ikhlas", "falaq", "nas", "kawthar", "asr", "qadr"];

/* ---- teacher-lesson homework contract (2026-08-07) ----
   Written into coach:<email> by the coach when Reza dumps a lesson:
   { label, lessonAt: ISO datetime, group: "ev-<gid>", keys: ["ev-x:0", ...],
     tasks: [{id, label}] }. The plan schedules BACKWARDS from lessonAt: a word
   is "solid" once it survives a spaced gap (box ≥ 2, or an explicit know
   bucket), so cramming the night before cannot fake readiness — the plan
   surfaces homework early precisely so the spacing fits before the lesson. */
function planHomework() {
  const hw = store.get("ats-homework", null);
  if (!hw || !hw.lessonAt) return null;
  const lessonT = new Date(hw.lessonAt).getTime();
  if (isNaN(lessonT)) return null;
  const daysLeft = (lessonT - Date.now()) / 86400000;
  if (daysLeft < -0.5) return { ...hw, past: true, daysLeft };
  const srs = getSrs();
  const keys = hw.keys || [];
  const solid = keys.filter(k => { const e = srs[k]; return e && (e.box >= 2 || e.b === "know"); });
  const started = keys.filter(k => srs[k]);
  const done = store.get("ats-hw-done", {});
  const tasks = (hw.tasks || []).map(t => ({ ...t, done: !!done[t.id] }));
  const tasksLeft = tasks.filter(t => !t.done).length;
  const wordReadiness = keys.length ? solid.length / keys.length : 1;
  const taskReadiness = tasks.length ? (tasks.length - tasksLeft) / tasks.length : 1;
  const readiness = Math.round(100 * (keys.length || tasks.length ? (wordReadiness * (keys.length ? 0.7 : 0) + taskReadiness * (tasks.length ? 0.3 : 0)) / ((keys.length ? 0.7 : 0) + (tasks.length ? 0.3 : 0)) : 1));
  return { ...hw, past: false, daysLeft, lessonT, keys, tasks, tasksLeft, readiness,
    solidN: solid.length, startedN: started.length, shakyN: keys.length - solid.length };
}
function planHwTaskDone(id) {
  const done = store.get("ats-hw-done", {});
  done[id] = true;
  store.set("ats-hw-done", done);
  logEvent({ e: "hw-task", id });
}

/* ---- ⚡ boost days (2026-08-09, his ask): forward-looking extra-time asks ----
   The SRS makes review load PREDICTABLE days ahead. When a wave of cards lands
   on one day (or lesson-readiness slips with the lesson close), ONE extra
   ~15-min session that day pays disproportionately — cards cleared the day
   they land stay in high boxes; left to pile up they decay to box 0 and cost
   double later. Rules: rare (≥4 days between asks), announced 1–3 days ahead
   on the plan card, opt-in on the day — the base 3 blocks still complete the
   day; boost blocks never gate plan-done. */
const BOOST_HIST_KEY = "ats-boost-hist";   // ISO dates boosts were OFFERED
const BOOST_WAVE_MIN = 12;                 // same-day due arrivals worth asking for
const BOOST_GAP_D = 4;                     // min days between asks

function planDueArrivals(dayOffset) {
  const srs = getSrs();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const a = start.getTime() + dayOffset * 86400000, b = a + 86400000;
  let n = 0;
  for (const k in srs) {
    const e = srs[k];
    if (e && e.b !== "never" && e.due >= a && e.due < b) n++;
  }
  return n;
}
/* the ONE upcoming boost day (offset 0..6), or null. Recomputed live from the
   same SRS every day, so the Saturday it announces stays Saturday when it comes. */
function planBoostDay() {
  const hist = store.get(BOOST_HIST_KEY, []);
  if (hist.length) {
    const last = new Date(hist[hist.length - 1] + "T12:00:00").getTime();
    if (Date.now() - last < BOOST_GAP_D * 86400000) return null;
  }
  const hw = planHomework();
  let best = null;
  for (let d = 0; d <= 6; d++) {
    let score = 0; const parts = [];
    const wave = planDueArrivals(d);
    if (wave >= BOOST_WAVE_MIN) { score += wave; parts.push(`${wave} reviews land together that day`); }
    if (hw && !hw.past && hw.readiness < 80 && hw.daysLeft - d >= 0 && hw.daysLeft - d <= 1.5) {
      score += 15; parts.push(`lesson prep at ${hw.readiness}% ready`);
    }
    if (score >= BOOST_WAVE_MIN && (!best || score > best.score)) {
      const dt = new Date(Date.now() + d * 86400000);
      best = { day: d, score, reason: parts.join(" + "),
               label: d === 0 ? "today" : d === 1 ? "tomorrow" : dt.toLocaleDateString(undefined, { weekday: "long" }) };
    }
  }
  return best;
}

function planHist() { return store.get(PLAN_HIST_KEY, []); }
function planRecentTypes() { return planHist().slice(-2).flatMap(h => h.types || []); }
function planRecentContent() { return planHist().slice(-3).flatMap(h => h.content || []); }

/* rotate content within a stream: pick the least-recently-used option, seeded */
function planPickContent(options, date) {
  const used = planRecentContent();
  const fresh = options.filter(o => !used.includes(o));
  const pool = fresh.length ? fresh : options;
  return pool[Math.floor(planHash(date + pool.join()) * pool.length) % pool.length];
}

/* The next story step waiting for him. His 2026-08-13 note: "in the lessons you
   are not directing me to do any of the stories, which was the foundation of the
   site" — he was right, there was no story block at all. Stories go step by step,
   so the plan points at the FIRST unfinished step of the earliest unfinished
   story and deep-links straight into it. */
const STORY_STEP_SUB = {
  listen: "Ears first — play it through before you read a word of it.",
  read: "Read it with the glosses; tap anything you don't know.",
  memorize: "The story's vocabulary, in a table — mark what holds.",
  quiz: "Five questions on meaning — proves the story actually landed.",
  speak: "Say every sentence out loud after the model.",
  write: "Produce it: dictation and translation, typed in Arabic.",
};
function planNextStory() {
  if (typeof STORY_LIST === "undefined" || typeof STEPS === "undefined") return null;
  for (const s of STORY_LIST.filter(s => !s.locked)) {
    const done = stepsDone(s.id);
    const step = STEPS.find(st => !done[st.key]);
    if (step) return { id: s.id, title: `Story ${s.n} — ${s.titleEn}`, step: step.key, stepEn: step.en, sub: STORY_STEP_SUB[step.key] || "" };
  }
  return null;
}

function planMakeBlock(type, date, dueN) {
  if (type === "homework") {
    const hw = planHomework();
    const preCheck = hw.daysLeft <= 1.5;
    return {
      type, content: hw.group || null,
      icon: "📚",
      title: preCheck ? "Pre-lesson check — prove the homework" : `Teacher homework — ${hw.label || "this week's lesson"}`,
      sub: preCheck
        ? `Test yourself on the lesson words before ${hw.teacher || "your teacher"} does — pass it and you walk in ready.`
        : `${hw.shakyN} word${hw.shakyN === 1 ? "" : "s"} not yet solid${hw.tasksLeft ? ` · ${hw.tasksLeft} task${hw.tasksLeft > 1 ? "s" : ""} left` : ""} — lesson ${hw.daysLeft < 1 ? "TOMORROW" : "in " + Math.ceil(hw.daysLeft) + " days"}.`,
      url: hw.group ? `vocab.html?ev=${hw.group.replace(/^ev-/, "")}&mode=${preCheck ? "fill" : "study"}` : "vocab.html?view=lessons",
      page: "vocab", mins: PLAN_BLOCK_MIN, done: false, sec: 0,
    };
  }
  const def = PLAN_BLOCKS[type];
  let content = null;
  if (type === "phrases") content = planPickContent(PHRASE_GIDS, date);
  if (type === "salah") content = planPickContent(PLAN_SURAHS, date);
  if (type === "story") content = planNextStory();
  return {
    type, content,
    icon: def.icon,
    title: typeof def.title === "function" ? def.title(type === "review" ? dueN : content) : def.title,
    sub: typeof def.sub === "function" ? def.sub(content) : def.sub,
    url: typeof def.url === "function" ? def.url(content) : def.url,
    page: def.page,
    mins: PLAN_BLOCK_MIN,
    done: false, sec: 0,
  };
}

/* ---- the planner: 3 blocks by marginal value, deterministic per day ---- */
function planBuild(date, noBoost) {
  const dueN = dueCards().length;
  const mix = planMix();
  const recent = planRecentTypes();
  const blocks = [];

  // block 1: protect the base
  blocks.push(planMakeBlock(dueN >= 4 ? "review" : "newwords", date, dueN));

  // teacher homework: scheduled BACKWARDS from the lesson. Urgency grows as
  // work-remaining meets days-remaining; near the deadline it owns a slot
  // outright (and the pre-lesson check takes over inside planMakeBlock).
  const hw = planHomework();
  if (hw && !hw.past && hw.readiness < 100) {
    const urgency = (hw.shakyN + hw.tasksLeft * 3) / Math.max(0.5, hw.daysLeft);
    if (hw.daysLeft <= 1.5 || urgency >= 2) blocks.push(planMakeBlock("homework", date, dueN));
  }

  // blocks 2+3: marginal value with mix-gap weighting + rotation + test cadence
  const listenGap = Math.max(0.12, PLAN_TARGET_SHARE - mix.earShare);
  const speakGap = Math.max(0.12, PLAN_TARGET_SHARE - mix.outShare);
  const cand = [
    { type: "audio", w: listenGap * 1.1 },          // certifies by ear — the strongest listening move
    { type: "salah", w: listenGap * 0.85 },
    { type: "speakdrill", w: speakGap * 1.2 },      // the mic beats typing for the speaking line
    { type: "phrases", w: speakGap * 1.0 },
    { type: "sentences", w: speakGap * 0.8 },
    { type: "newwords", w: dueN >= 4 ? 0.15 : 0 },  // only worth a slot when reviews didn't take block 1
  ];
  // stories: the site's spine — one step at a time, and the longer since the last
  // step the louder it gets (capped so it never crowds out ear/mouth work)
  if (planNextStory()) cand.push({ type: "story", w: 0.30 + Math.min(0.35, planDaysSince("story-step") / 25) });
  // moderate-urgency homework competes on weight (steady progress beats a scramble)
  if (hw && !hw.past && hw.readiness < 100 && !blocks.some(b => b.type === "homework")) {
    cand.push({ type: "homework", w: 0.3 + 0.15 * ((hw.shakyN + hw.tasksLeft * 3) / Math.max(1, hw.daysLeft)) });
  }
  // placement cadence: listening test ~every 8 days; oral exam ~every 14 (it's longer — weekend-ish slot)
  if (planDaysSince("ptest-listen") >= 8) cand.push({ type: "ptest", w: 9 });
  else if (planDaysSince("ptest-speak") >= 14 && [0, 5, 6].includes(new Date(date + "T12:00:00").getDay())) cand.push({ type: "exam", w: 8 });
  for (const c of cand) {
    if (recent.includes(c.type)) c.w *= 0.45;       // don't repeat yesterday's shape
    c.w += planHash(date + c.type) * 0.05;          // seeded tie-break → days differ
  }
  cand.sort((a, b) => b.w - a.w);
  for (const c of cand) {
    if (blocks.length >= 3) break;
    if (c.w <= 0 || blocks.some(b => b.type === c.type)) continue;
    blocks.push(planMakeBlock(c.type, date, dueN));
  }

  // a banked block yesterday shrinks today (never below 2)
  if (store.get(PLAN_BANK_KEY, null) === date && blocks.length > 2) blocks.pop();
  const plan = { date, blocks, completedAt: null, banked: false };

  // ⚡ boost day arrived (announced in the days before): attach the extra section
  if (!noBoost) {
    const bst = planBoostDay();
    if (bst && bst.day === 0) {
      const extra = [];
      const rb = planMakeBlock("review", date, dueN + planDueArrivals(0));
      rb.sub = "The wave you had notice about — cleared the day it lands, it stays learnt.";
      extra.push(rb);
      const second = cand.find(c => c.w > 0 && c.type !== "review" && !blocks.some(b => b.type === c.type));
      if (second) extra.push(planMakeBlock(second.type, date, dueN));
      plan.boost = extra;
      const hist = store.get(BOOST_HIST_KEY, []);
      hist.push(date); store.set(BOOST_HIST_KEY, hist.slice(-8));
      logEvent({ e: "boost-day", reason: bst.reason });
    }
  }
  return plan;
}

function planGet() {
  let p = store.get(PLAN_KEY, null);
  const today = planToday();
  if (!p || p.date !== today) {
    if (p && p.date) {
      // archive the outgoing day for rotation memory
      const hist = planHist().filter(h => h.date !== p.date);
      hist.push({ date: p.date, types: p.blocks.map(b => b.type), content: p.blocks.map(b => b.content).filter(Boolean) });
      store.set(PLAN_HIST_KEY, hist.slice(-5));
    }
    p = planBuild(today);
    store.set(PLAN_KEY, p);
    logEvent({ e: "plan-gen", types: p.blocks.map(b => b.type) });
  }
  return p;
}
function planSave(p) { store.set(PLAN_KEY, p); }
function planCurrent(p) { return p.blocks.find(b => !b.done) || null; }

/* ---- completion: observe events + accrue focused time on the block's page ---- */
function planObserve(ev) {
  const p = store.get(PLAN_KEY, null);
  if (!p || p.date !== planToday()) return;
  if (!p.completedAt) {
    // 🚗 a FULL commute session (≥10 min hands-free) delivers the whole day —
    // audio and screen are parallel delivery lines that meet at the test (his
    // 2026-08-09 design). The plan measures time-in; the SRS and the checks,
    // not block ticks, remain the measure of what was actually learnt.
    if (ev.e === "commute-done" && (ev.min || 0) >= 10) {
      p.blocks.filter(b => !b.done).forEach(b => planFinishBlock(p, b, "commute"));
      return;
    }
    const cur = planCurrent(p);
    if (!cur) return;
    const def = PLAN_BLOCKS[cur.type];
    if (def.done.includes(ev.e)) planFinishBlock(p, cur, "event");
    return;
  }
  // day complete — ⚡ boost blocks (extra, opt-in) still listen for their events
  if (p.boost && p.boost.some(b => !b.done)) {
    const cur = p.boost.find(b => !b.done);
    if (!PLAN_BLOCKS[cur.type].done.includes(ev.e)) return;
    cur.done = true; cur.doneT = Date.now();
    logEvent({ e: "plan-block-done", type: cur.type, how: "event", boost: true });
    if (!p.boost.some(b => !b.done)) { logEvent({ e: "boost-done" }); autoSync(); }
    planSave(p);
    planPaintBar();
  }
}
function planFinishBlock(p, block, how) {
  if (block.done) return;
  block.done = true; block.doneT = Date.now();
  logEvent({ e: "plan-block-done", type: block.type, how });
  const left = p.blocks.filter(b => !b.done).length;
  if (!left) { p.completedAt = Date.now(); logEvent({ e: "plan-done", banked: !!p.banked }); autoSync(); }
  planSave(p);
  planPaintBar();
}
/* time fallback: while THIS page is a block's page and visible, accrue seconds */
function planTick() {
  if (document.hidden) return;
  const p = store.get(PLAN_KEY, null);
  if (!p || p.completedAt || p.date !== planToday()) return;
  const cur = planCurrent(p);
  if (!cur) return;
  const path = location.pathname.split("/").pop() || "index.html";
  if (!path.startsWith(cur.page)) return;
  cur.sec = (cur.sec || 0) + 15;
  if (cur.sec >= cur.mins * 60 * 0.8) planFinishBlock(p, cur, "time");
  else planSave(p);
}

/* ---- banking: one block from tomorrow, never more ---- */
function planBank() {
  const p = planGet();
  if (!p.completedAt || p.banked) return;
  const tomorrow = new Date(Date.now() + 86400000);
  const tISO = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getDate()).padStart(2, "0");
  const tPlan = planBuild(tISO, true);
  const extra = tPlan.blocks.find(b => b.type !== "review" && !p.blocks.some(x => x.type === b.type)) || tPlan.blocks[1];
  extra.done = false; extra.sec = 0;
  p.blocks.push(extra);
  p.completedAt = null; p.banked = true;
  store.set(PLAN_BANK_KEY, tISO);
  planSave(p);
  logEvent({ e: "plan-bank", type: extra.type });
}

/* ================= UI ================= */
function planBarHTML(p) {
  const cur = planCurrent(p);
  const boxes = p.blocks.map(b => `<span class="pb-box ${b.done ? "on" : ""}"></span>`).join("");
  if (!cur) return `<span class="pb-done">✅ Today complete — أَحْسَنْت</span> ${boxes} <a href="index.html" class="pb-next">see the chart →</a>`;
  const here = (location.pathname.split("/").pop() || "index.html").startsWith(cur.page);
  // "start" only when nothing is done yet — his 08-13 note: "shouldnt it say
  // continue rather than start, i already started"
  const go = p.blocks.some(b => b.done) ? "continue →" : "start →";
  return `${boxes} <span class="pb-label">${cur.icon} ${cur.title}</span>
    ${here ? `<button class="pb-tick" title="mark this block done">✓ done</button>`
           : `<a href="${cur.url}" class="pb-next">${go}</a>`}
    <a href="index.html" class="pb-plan" title="back to today's plan">📋 plan</a>`;
}
function planPaintBar() {
  const bar = document.getElementById("planBar");
  if (!bar) return;
  const p = store.get(PLAN_KEY, null);
  if (!p || p.date !== planToday()) return;
  bar.innerHTML = planBarHTML(p);
  const tick = bar.querySelector(".pb-tick");
  if (tick) tick.onclick = () => { const pp = planGet(); const cur = planCurrent(pp); if (cur) planFinishBlock(pp, cur, "manual"); };
  // card view (dashboard) repaints too
  if (document.getElementById("planCard")) planRenderCard(document.getElementById("planCard"));
}
function planMountBar() {
  if (document.getElementById("planBar")) return;
  const p = planGet();
  // the dashboard shows the full card; the bar appears on every OTHER page while the day is unfinished
  const page = location.pathname.split("/").pop() || "index.html";
  if (page === "index.html" || page === "") return;
  if (p.completedAt && !planCurrent(p)) return; // done — no nagging bar
  const bar = document.createElement("div");
  bar.id = "planBar";
  document.body.appendChild(bar);
  planPaintBar();
}

/* the dashboard card: today's blocks, completion state, banking */
/* the 📚 lesson strip: countdown + readiness + tasks + the ready verdict */
function planLessonStripHTML() {
  const hw = planHomework();
  if (!hw) return "";
  if (hw.past) {
    return `<div class="plan-lesson"><strong>📚 Lesson done?</strong> <span style="color:var(--muted)">Send the new pages + homework (✏️📷 pen note or chat) and say when the next lesson is — the plan takes it from there.</span></div>`;
  }
  const when = new Date(hw.lessonT).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) +
    (hw.lessonAt.includes("T") ? " " + new Date(hw.lessonT).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "");
  const tasksHtml = hw.tasks.map(t =>
    `<label style="display:block;font-size:12.5px;margin-top:2px;cursor:pointer"><input type="checkbox" data-hw-task="${t.id}" ${t.done ? "checked disabled" : ""}> ${t.label}</label>`).join("");
  const ready = hw.readiness >= 100;
  return `<div class="plan-lesson">
    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <strong>📚 ${hw.label || "Teacher lesson"}</strong>
      <span style="color:${hw.daysLeft < 1.5 && !ready ? "var(--red)" : "var(--muted)"};font-size:12.5px">lesson ${when}</span>
    </div>
    <div class="progress-bar" style="margin:6px 0 3px"><div style="width:${hw.readiness}%"></div></div>
    <div style="font-size:12.5px;${ready ? "color:var(--accent);font-weight:600" : "color:var(--muted)"}">
      ${ready
        ? `✅ Fully ready — every word holds on a spaced schedule and the tasks are done. Walk in and tell her so.`
        : `${hw.readiness}% ready — ${hw.solidN}/${hw.keys.length} words solid (solid = survived a spaced gap, not crammed)${hw.tasksLeft ? ` · ${hw.tasksLeft} task${hw.tasksLeft > 1 ? "s" : ""} left` : ""}`}
    </div>
    ${tasksHtml}
  </div>`;
}

function planRenderCard(el) {
  const p = planGet();
  const cur = planCurrent(p);
  const doneN = p.blocks.filter(b => b.done).length;
  const rows = p.blocks.map((b, i) => {
    const state = b.done ? "done" : (b === cur ? "cur" : "todo");
    const inner = `
      <div class="pl-num">${b.done ? "✓" : i + 1}</div>
      <div><div class="pl-t">${b.icon} ${b.title}</div><div class="pl-s">${b.sub}</div></div>
      ${b === cur ? `<div class="pl-go">${doneN ? "Continue →" : "Start →"}</div>` : ""}`;
    return b.done
      ? `<div class="plan-row done">${inner}</div>`
      : `<a class="plan-row ${state}" href="${b.url}">${inner}</a>`;
  }).join("");
  // the parallel delivery line (his drawing): same day, hands-free — always visible
  const commuteRow = p.completedAt ? "" : `
    <a class="plan-row" href="audio.html?commute=1" style="border:1px dashed var(--accent);background:transparent">
      <div class="pl-num">🚗</div>
      <div><div class="pl-t">…or do today hands-free</div>
      <div class="pl-s">On the move? One full commute session (~13 min, just listening) counts as the whole day — tomorrow's 90-second check verifies what stuck.</div></div>
      <div class="pl-go">Start →</div>
    </a>`;
  // ⚡ boost: the advance notice (1-3 days out), and the extra section on the day
  const bst = p.boost ? null : planBoostDay();
  const noticeLine = (bst && bst.day >= 1 && bst.day <= 3)
    ? `<div class="plan-lesson" style="border-left:3px solid #c98a2b">📅 <strong>Heads-up:</strong> ${bst.label} looks worth an extra ~15 minutes — ${bst.reason}. Nothing needed now; a ⚡ section will be waiting that day, and your normal 3 blocks still finish the day without it.</div>`
    : "";
  if (noticeLine && store.get("ats-boost-noticed", "") !== p.date) {
    store.set("ats-boost-noticed", p.date);
    logEvent({ e: "boost-notice", day: bst.day, reason: bst.reason });
  }
  const boostRows = (p.boost || []).map((b, i) => {
    const inner = `
      <div class="pl-num">${b.done ? "✓" : "⚡"}</div>
      <div><div class="pl-t">${b.icon} ${b.title}</div><div class="pl-s">${b.sub}</div></div>
      ${b.done ? "" : `<button class="small" data-boost-i="${i}" style="align-self:center">✓ done</button>`}`;
    return b.done ? `<div class="plan-row done">${inner}</div>`
                  : `<a class="plan-row" href="${b.url}" style="border-color:#c98a2b">${inner}</a>`;
  }).join("");
  const boostSection = p.boost ? `
    <div style="margin-top:12px;font-size:13.5px;font-weight:700">⚡ Today's the extra ~15 you had notice about${p.boost.every(b => b.done) ? " — done. That's the wave broken." : ""}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Optional — today counts complete without it. But what's cleared today stays learnt instead of piling into next week.</div>
    ${boostRows}` : "";
  el.innerHTML = `
    ${planLessonStripHTML()}
    ${noticeLine}
    <div class="plan-head">
      <span>${p.completedAt ? "✅ Today is complete" : `Today — ${p.blocks.length} blocks · ~${p.blocks.length * PLAN_BLOCK_MIN} min`}</span>
      <span class="plan-count">${doneN}/${p.blocks.length}</span>
    </div>
    ${rows}
    ${boostSection}
    ${commuteRow}
    ${p.completedAt ? `
      <div class="plan-fin">
        <div style="font-size:16px;font-weight:700">أَحْسَنْت — nothing more is asked of you today.</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">Little and often is the whole method — see you after a salah tomorrow.</div>
        ${p.banked
          ? `<div style="font-size:12.5px;color:var(--muted);margin-top:6px">Tomorrow's block already banked — spaced beats crammed, so that's the cap. 🛑</div>`
          : `<button class="small" id="planBankBtn" style="margin-top:8px">⚡ Feeling strong? Bank one block from tomorrow</button>`}
      </div>` : ""}
    <div style="font-size:12px;color:var(--muted);margin-top:10px">Picked for maximum movement on your two skill lines (speaking and by-ear practice surface until their share of your week reaches half). <a href="vocab.html" style="color:var(--accent)">Or browse everything →</a></div>`;
  const bank = document.getElementById("planBankBtn");
  if (bank) bank.onclick = () => { planBank(); planRenderCard(el); };
  el.querySelectorAll("[data-boost-i]").forEach(btn => btn.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const pp = planGet();
    const b = pp.boost && pp.boost[+btn.dataset.boostI];
    if (!b || b.done) return;
    b.done = true; b.doneT = Date.now();
    logEvent({ e: "plan-block-done", type: b.type, how: "manual", boost: true });
    if (!pp.boost.some(x => !x.done)) { logEvent({ e: "boost-done" }); autoSync(); }
    planSave(pp);
    planRenderCard(el);
  });
  el.querySelectorAll("[data-hw-task]").forEach(cb => cb.onchange = () => {
    planHwTaskDone(cb.dataset.hwTask);
    autoSync();
    planRenderCard(el);
  });
}

/* wire in: observe every logged event; tick the clock */
(function () {
  if (typeof logEvent === "function") {
    const orig = logEvent;
    // eslint-disable-next-line no-global-assign
    logEvent = function (e) { orig(e); try { if (e && e.e && !String(e.e).startsWith("plan-")) planObserve(e); } catch (err) {} };
  }
  setInterval(planTick, 15000);
})();
