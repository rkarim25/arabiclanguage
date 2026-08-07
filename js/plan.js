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
    else if (e.e === "alisten-grade") { graded++; ear++; }
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
  review:    { icon: "🔁", title: n => `Clear your ${n} due words`, sub: "Reviews first — they protect everything the other blocks build.", url: "review.html", page: "review", done: ["review-done"] },
  newwords:  { icon: "📝", title: () => "A few new words", sub: "Frequency-first — fill the column, check, stop.", url: "vocab.html?sheet=1", page: "vocab", done: ["sheet-done"] },
  audio:     { icon: "🎧", title: () => "Audio Coach round", sub: "Ears only — every word you name by sound is certified by ear and lifts the listening line.", url: "audio.html", page: "audio", done: ["alisten-done"] },
  salah:     { icon: "📖", title: c => `Surah ${c} — word by word`, sub: "The salah basket: meaning mapped onto sound you already recite.", url: c => `quran.html?s=${c}`, page: "quran", done: ["qtest-part", "qtest-done", "qlisten-test"] },
  speakdrill:{ icon: "🎤", title: () => "Speak round — mic on", sub: "Say them out loud. Spoken practice is the only thing that moves the speaking line.", url: "speaking.html", page: "speaking", done: ["drill-done", "prompt"] },
  sentences: { icon: "✍️", title: () => "Build 5 sentences", sub: "Conjugate and produce — I/we/they across the tenses.", url: "sentences.html", page: "sentences", done: ["spract-done"] },
  phrases:   { icon: "💬", title: c => "Phrases out loud — " + c, sub: "Whole sentences you'll actually say. Read each ALOUD before revealing.", url: c => `vocab.html?ph=${c}&mode=drill`, page: "vocab", done: [] },
  ptest:     { icon: "🎯", title: () => "5-minute listening test", sub: "A measurement, not a drill — it anchors your chart and corrects the forecast.", url: "placement.html", page: "placement", done: ["ptest-listen"] },
  exam:      { icon: "🎤", title: () => "Oral exam (via any AI)", sub: "Ten minutes with an AI examiner — the score anchors your speaking line.", url: "converse.html?exam=1", page: "converse", done: ["ptest-speak"] },
};

const PHRASE_GIDS = ["greet", "intro", "ask", "need", "dir", "shop", "food", "time", "talk", "help", "state", "deen"];
const PLAN_SURAHS = ["fatiha", "ikhlas", "falaq", "nas", "kawthar", "asr", "qadr"];

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

function planMakeBlock(type, date, dueN) {
  const def = PLAN_BLOCKS[type];
  let content = null;
  if (type === "phrases") content = planPickContent(PHRASE_GIDS, date);
  if (type === "salah") content = planPickContent(PLAN_SURAHS, date);
  return {
    type, content,
    icon: def.icon,
    title: typeof def.title === "function" ? def.title(type === "review" ? dueN : content) : def.title,
    sub: def.sub,
    url: typeof def.url === "function" ? def.url(content) : def.url,
    page: def.page,
    mins: PLAN_BLOCK_MIN,
    done: false, sec: 0,
  };
}

/* ---- the planner: 3 blocks by marginal value, deterministic per day ---- */
function planBuild(date) {
  const dueN = dueCards().length;
  const mix = planMix();
  const recent = planRecentTypes();
  const blocks = [];

  // block 1: protect the base
  blocks.push(planMakeBlock(dueN >= 4 ? "review" : "newwords", date, dueN));

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
  return { date, blocks, completedAt: null, banked: false };
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
  if (!p || p.completedAt || p.date !== planToday()) return;
  const cur = planCurrent(p);
  if (!cur) return;
  const def = PLAN_BLOCKS[cur.type];
  if (def.done.includes(ev.e)) planFinishBlock(p, cur, "event");
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
  const tPlan = planBuild(tISO);
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
  return `${boxes} <span class="pb-label">${cur.icon} ${cur.title}</span>
    ${here ? `<button class="pb-tick" title="mark this block done">✓ done</button>`
           : `<a href="${cur.url}" class="pb-next">start →</a>`}`;
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
function planRenderCard(el) {
  const p = planGet();
  const cur = planCurrent(p);
  const doneN = p.blocks.filter(b => b.done).length;
  const rows = p.blocks.map((b, i) => {
    const state = b.done ? "done" : (b === cur ? "cur" : "todo");
    const inner = `
      <div class="pl-num">${b.done ? "✓" : i + 1}</div>
      <div><div class="pl-t">${b.icon} ${b.title}</div><div class="pl-s">${b.sub}</div></div>
      ${b === cur ? `<div class="pl-go">Start →</div>` : ""}`;
    return b.done
      ? `<div class="plan-row done">${inner}</div>`
      : `<a class="plan-row ${state}" href="${b.url}">${inner}</a>`;
  }).join("");
  el.innerHTML = `
    <div class="plan-head">
      <span>${p.completedAt ? "✅ Today is complete" : `Today — ${p.blocks.length} blocks · ~${p.blocks.length * PLAN_BLOCK_MIN} min`}</span>
      <span class="plan-count">${doneN}/${p.blocks.length}</span>
    </div>
    ${rows}
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
