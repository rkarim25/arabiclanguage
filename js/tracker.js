/* Learning analytics: append-only event log in localStorage, synced to the cloud.
   Primary backend: Cloudflare Worker (arabic-sync) with Google sign-in — data in KV.
   Fallback backend: private GitHub repo rkarim25/arabic-learning-data via fine-grained PAT.
   Claude reads the store from chat sessions (wrangler kv / gh api) to coach. */

const LOG_KEY = "ats-log";
const TOKEN_KEY = "ats-token";     // GitHub PAT (fallback method)
const SESSION_KEY = "ats-session"; // Worker session token (Google method)
const GCLIENT_KEY = "ats-gclient"; // locally pasted Google client ID (bootstrap)
const SYNC_KEY = "ats-lastsync";
const WORKER_URL = "https://arabic-sync.rkarim88.workers.dev";
const DATA_REPO = "rkarim25/arabic-learning-data";
const DATA_FILE = "learning-data.json";

function logEvent(e) {
  const log = store.get(LOG_KEY, []);
  e.t = Date.now();
  log.push(e);
  store.set(LOG_KEY, log);
}

/* ---------- time-on-task (active time only) ----------
   A tab left open doesn't count as studying. Seconds accrue only while the
   page is visible AND there was interaction in the last 60s (or audio is
   playing). Ticks every 15s. */
let _page = null, _activeSec = 0, _lastActivity = Date.now();
["pointerdown", "keydown", "scroll", "touchstart", "input"].forEach(ev =>
  window.addEventListener(ev, () => { _lastActivity = Date.now(); }, { passive: true })
);
setInterval(() => {
  const listening = window.speechSynthesis && speechSynthesis.speaking;
  if (!document.hidden && (listening || Date.now() - _lastActivity < 60 * 1000)) {
    _activeSec += 15;
  }
}, 15 * 1000);
function trackPage(name) {
  flushTime();
  _page = name;
}
function flushTime() {
  if (_page && _activeSec >= 5) logEvent({ e: "time", page: _page, sec: _activeSec });
  _activeSec = 0;
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { flushTime(); autoSync(); }
});
window.addEventListener("pagehide", flushTime);

/* ---------- credentials ---------- */
function getToken() { return store.get(TOKEN_KEY, null); }
function setToken(t) { store.set(TOKEN_KEY, t); }
function getSession() { return store.get(SESSION_KEY, null); }
function setSession(s) { store.set(SESSION_KEY, s); }
function syncMethod() { return getSession() ? "google" : (getToken() ? "github" : null); }

function _b64enc(s) { return btoa(unescape(encodeURIComponent(s))); }
function _b64dec(s) { return decodeURIComponent(escape(atob(s.replace(/\s/g, "")))); }

function _evKey(x) {
  return x.t + "|" + x.e + "|" + (x.card || x.w || x.page || x.fam || "") + "|" + (x.q ?? x.s ?? x.i ?? "");
}
function _mergeRemoteLog(remote) {
  let log = store.get(LOG_KEY, []);
  if (remote && Array.isArray(remote.log)) {
    const seen = new Set(log.map(_evKey));
    remote.log.forEach(x => { if (!seen.has(_evKey(x))) log.push(x); });
    log.sort((a, b) => a.t - b.t);
    store.set(LOG_KEY, log);
  }
  return log;
}
/* Merge remote learning state into local BEFORE pushing. Without this, a fresh
   device (or iOS evicting localStorage) would push empty srs/progress over the
   cloud copy — last-writer-wins data loss. Rules: an explicit local bucket is
   the newest user intent and is kept; "never" (don't-repeat) always wins;
   otherwise the higher box (or later due) is the truth. Progress steps union. */
function _mergeRemoteState(remote) {
  if (!remote) return;
  const srs = getSrs();
  Object.entries(remote.srs || {}).forEach(([k, r]) => {
    const l = srs[k];
    if (!l) { srs[k] = r; return; }
    // Retire ("never") on either side resolves by LATEST intent, not "never always
    // wins" — the old rule made un-retiring impossible on a synced device: the ↻
    // un-retire was overwritten by the cloud's stale "never" on the very next merge,
    // then pushed back up. Every srs write now stamps u (write time); entries from
    // before the stamp count as oldest, so between two unstamped sides the old
    // never-wins rule still applies.
    if (r.b === "never" || l.b === "never") {
      if ((r.u || 0) > (l.u || 0)) srs[k] = r;
      else if (!(r.u || l.u) && r.b === "never" && l.b !== "never") srs[k] = r;
      return;
    }
    /* scheduler cards (js/srs.js) carry stability/difficulty/history: the newer
       write is the truth, on whichever device it happened. The box rule below
       only arbitrates between two pre-stamp legacy cards. */
    if (r.u && l.u && (typeof r.s === "number" || typeof l.s === "number")) { if (r.u > l.u) srs[k] = r; return; }
    if (l.b) return; // explicit local mark (know/repeat/later) = latest intent on this device
    if (r.box > l.box || (r.box === l.box && r.due > l.due)) srs[k] = r;
  });
  store.set("ats-srs", srs);
  const p = getProgress();
  Object.entries(remote.progress || {}).forEach(([id, u]) => {
    p[id] = p[id] || { steps: {} };
    Object.keys((u && u.steps) || {}).forEach(s => { p[id].steps[s] = true; });
  });
  store.set("ats-progress", p);
  // tapped-word card contents (tw: keys) — union, local wins
  const tw = store.get("ats-tapwords", {});
  let twChanged = false;
  Object.entries(remote.tapwords || {}).forEach(([k, v]) => { if (!tw[k]) { tw[k] = v; twChanged = true; } });
  if (twChanged) store.set("ats-tapwords", tw);

  // Up/down item votes — merge by latest timestamp
  const iv = store.get("ats-item-votes", {});
  let ivChanged = false;
  Object.entries(remote.itemVotes || {}).forEach(([k, r]) => {
    const l = iv[k];
    if (!l || (r.u || 0) > (l.u || 0)) {
      iv[k] = r;
      ivChanged = true;
    }
  });
  if (ivChanged) store.set("ats-item-votes", iv);

  // Chapter progression and line resume
  if (remote.currentChapId && !store.get("ats-current-chap-id")) {
    store.set("ats-current-chap-id", remote.currentChapId);
  }
  if (remote.chapLines && typeof remote.chapLines === "object") {
    Object.entries(remote.chapLines).forEach(([cid, line]) => {
      if (store.get("ats-chap-line-" + cid) === null) {
        store.set("ats-chap-line-" + cid, line);
      }
    });
  }
}

function _payload(log) {
  const chapLines = {};
  for (let i = 1; i <= 10; i++) {
    const cid = "chap-" + i;
    const l = store.get("ats-chap-line-" + cid, null);
    if (l !== null) chapLines[cid] = l;
  }
  const curChapId = store.get("ats-current-chap-id", null);
  return {
    progress: getProgress(),
    srs: getSrs(),
    itemVotes: store.get("ats-item-votes", {}),
    tapwords: store.get("ats-tapwords", {}),
    chapLines,
    currentChapId: curChapId,
    log,
    savedAt: Date.now()
  };
}

/* ---------- Worker (Google) backend ---------- */
async function wReq(path, opts = {}) {
  const session = getSession();
  return fetch(WORKER_URL + path, {
    ...opts,
    headers: { ...(session ? { Authorization: "Bearer " + session } : {}), ...(opts.headers || {}) },
  });
}

async function workerSync() {
  let remote = null;
  const r = await wReq("/data");
  if (r.status === 200) remote = await r.json();
  else if (r.status === 401) { setSession(null); throw new Error("session-expired"); }
  _mergeRemoteState(remote);
  const log = _mergeRemoteLog(remote);
  const put = await wReq("/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(_payload(log)),
  });
  if (!put.ok) throw new Error("sync-failed-" + put.status);
  store.set(SYNC_KEY, Date.now());
  return log.length;
}

/* ---------- GitHub PAT backend (fallback) ---------- */
async function ghReq(path, opts = {}) {
  const token = getToken();
  if (!token) throw new Error("no-token");
  return fetch(`https://api.github.com/repos/${DATA_REPO}/${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...(opts.headers || {}),
    },
  });
}

async function githubSync() {
  let sha = null, remote = null;
  const r = await ghReq(`contents/${DATA_FILE}`);
  if (r.status === 200) {
    const j = await r.json();
    sha = j.sha;
    try { remote = JSON.parse(_b64dec(j.content)); } catch (e) { /* corrupt remote; overwrite */ }
  } else if (r.status === 401 || r.status === 403) {
    throw new Error("bad-token");
  }
  _mergeRemoteState(remote);
  const log = _mergeRemoteLog(remote);
  const put = await ghReq(`contents/${DATA_FILE}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "sync " + new Date().toISOString(),
      content: _b64enc(JSON.stringify(_payload(log))),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) throw new Error("sync-failed-" + put.status);
  store.set(SYNC_KEY, Date.now());
  return log.length;
}

/* ---------- unified API ---------- */
async function syncNow() {
  flushTime();
  const m = syncMethod();
  if (m === "google") return workerSync();
  if (m === "github") return githubSync();
  throw new Error("not-connected");
}

let _syncing = false;
async function autoSync() {
  if (!syncMethod() || _syncing) return;
  const last = store.get(SYNC_KEY, 0);
  if (Date.now() - last < 3 * 60 * 1000) return; // at most every 3 min
  _syncing = true;
  try { await syncNow(); } catch (e) { /* silent for auto */ }
  _syncing = false;
}

async function fetchCoach() {
  if (syncMethod() === "google") {
    const r = await wReq("/coach");
    if (!r.ok) return null;
    const c = await r.json();
    return c && c.note ? c : null;
  }
  const r = await ghReq("contents/coach.json");
  if (r.status !== 200) return null;
  const j = await r.json();
  try { return JSON.parse(_b64dec(j.content)); } catch (e) { return null; }
}

async function restoreFromCloud() {
  let remote;
  if (syncMethod() === "google") {
    const r = await wReq("/data");
    if (r.status !== 200) throw new Error("no-cloud-data");
    remote = await r.json();
  } else {
    const r = await ghReq(`contents/${DATA_FILE}`);
    if (r.status !== 200) throw new Error("no-cloud-data");
    remote = JSON.parse(_b64dec((await r.json()).content));
  }
  if (remote.progress) store.set("ats-progress", remote.progress);
  if (remote.srs) store.set("ats-srs", remote.srs);
  if (remote.itemVotes) store.set("ats-item-votes", remote.itemVotes);
  if (remote.tapwords) store.set("ats-tapwords", remote.tapwords);
  if (remote.currentChapId) store.set("ats-current-chap-id", remote.currentChapId);
  if (remote.chapLines && typeof remote.chapLines === "object") {
    Object.entries(remote.chapLines).forEach(([cid, line]) => {
      store.set("ats-chap-line-" + cid, line);
    });
  }
  if (remote.log) store.set(LOG_KEY, remote.log);
}

/* ---------- Google sign-in helpers (index page) ---------- */
async function getGoogleClientId() {
  try {
    const r = await fetch(WORKER_URL + "/config");
    const c = await r.json();
    if (c.clientId) return c.clientId;
  } catch (e) { /* offline */ }
  return store.get(GCLIENT_KEY, "958505787875-g5nfbudjoembmlfves8c794mvb3udqdr.apps.googleusercontent.com");
}

async function codeLogin(email, password) {
  const r = await fetch(WORKER_URL + "/login-pw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "login-failed");
  }
  const { session, email: em } = await r.json();
  setSession(session);
  store.set("ats-email", (em || email).toLowerCase().trim());
  return session;
}

async function googleLogin(credential) {
  const r = await fetch(WORKER_URL + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error || "login-failed");
  }
  const { session, email: em } = await r.json();
  setSession(session);
  if (em) store.set("ats-email", em.toLowerCase().trim());
  return session;
}

/* ---------- honest study minutes ----------
   Derived from the timestamps of real interactions (answers, reveals,
   plays, grades) — an open tab generates no events, so it counts nothing.
   Consecutive events ≤3 min apart chain into a session; isolated events
   count ~30s each. */
function activeMinutes() {
  const ts = store.get(LOG_KEY, [])
    .filter(x => x.e !== "time")
    .map(x => x.t)
    .sort((a, b) => a - b);
  if (!ts.length) return 0;
  let sec = 30;
  for (let i = 1; i < ts.length; i++) {
    const gap = (ts[i] - ts[i - 1]) / 1000;
    sec += gap <= 180 ? gap : 30;
  }
  return Math.round(sec / 60);
}

/* ---------- local mini-analysis for the dashboard ---------- */
function weakSpots(limit) {
  const log = store.get(LOG_KEY, []);
  const scores = {}; // key -> {label, weight}
  const bump = (k, label, w) => {
    scores[k] = scores[k] || { label: label || k, w: 0 };
    scores[k].w += w;
  };
  log.forEach(x => {
    if (x.e === "vocab-rate" && (x.bucket === "weak" || x.bucket === "learning")) bump(x.key, x.wordAr || x.wordEn, 3);
    if (x.e === "test-item" && x.ok === false) bump("test:" + (x.chap || x.classId || "") + ":" + (x.target || x.qIdx), x.target || x.question, 4);
    if (x.e === "spract" && x.got === false) bump("verb:" + x.verb, x.verb, 3);
    if (x.e === "review" && x.g === "again") bump("card:" + x.card, null, 3);
    if (x.e === "tap") bump("word:" + x.w, x.w, 1);
  });
  return Object.entries(scores)
    .sort((a, b) => b[1].w - a[1].w)
    .slice(0, limit || 6);
}

/* ---------- On-Device Analytics & Motivation Engine ---------- */
function analyzeLearnerProgress() {
  const log = store.get(LOG_KEY, []);
  const srs = getSrs();
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // 1. Time on task & Streak calculation
  const dayBuckets = new Set();
  let secToday = 0;
  const todayStr = new Date().toDateString();

  const validEvents = log.filter(x => x.t && x.e !== "time").sort((a, b) => a.t - b.t);
  for (let i = 0; i < validEvents.length; i++) {
    const d = new Date(validEvents[i].t);
    dayBuckets.add(d.toDateString());
    if (d.toDateString() === todayStr) {
      if (i > 0 && validEvents[i].t - validEvents[i - 1].t <= 180 * 1000) {
        secToday += (validEvents[i].t - validEvents[i - 1].t) / 1000;
      } else {
        secToday += 30;
      }
    }
  }

  // Calculate streak backwards from today or yesterday
  let streak = 0;
  let checkDate = new Date();
  while (dayBuckets.has(checkDate.toDateString())) {
    streak++;
    checkDate = new Date(checkDate.getTime() - ONE_DAY);
  }
  if (streak === 0) {
    checkDate = new Date(now - ONE_DAY);
    while (dayBuckets.has(checkDate.toDateString())) {
      streak++;
      checkDate = new Date(checkDate.getTime() - ONE_DAY);
    }
  }

  // 2. Vocabulary state
  let solidCount = 0, mediumCount = 0, weakCount = 0, learningCount = 0, retiredCount = 0;
  Object.values(srs).forEach(card => {
    if (card.b === "never") retiredCount++;
    else if (card.b === "strong" || card.box >= 4) solidCount++;
    else if (card.b === "medium" || (card.box >= 2 && card.box <= 3)) mediumCount++;
    else if (card.b === "weak" || card.box === 1) weakCount++;
    else if (card.b === "learning" || card.b === "repeat" || card.box === 0) learningCount++;
  });
  const totalHeld = solidCount + mediumCount;

  // 3. Recent test performance & misses (last 7 days)
  const recentEvents = log.filter(x => x.t && (now - x.t <= 7 * ONE_DAY));
  const chapterPasses = log.filter(x => x.e === "chap-test" && x.pass);
  const preplyPasses = log.filter(x => (x.e === "preply-test" || x.e === "preply-mastery") && x.pass);

  const testMisses = recentEvents.filter(x => x.e === "test-item" && x.ok === false);
  const recentRatings = recentEvents.filter(x => x.e === "vocab-rate");
  const wordsStruggling = recentRatings.filter(x => x.bucket === "weak" || x.bucket === "learning");

  // 4. Generate dynamic motivational headline
  let headline = "";
  if (chapterPasses.length > 0 || preplyPasses.length > 0) {
    const lastTest = log.slice().reverse().find(x => (x.e === "chap-test" || x.e === "preply-test") && x.pass);
    headline = `🔥 Great momentum! You passed ${lastTest.e === "preply-test" ? "your Preply mastery test" : "Chapter " + (lastTest.chap || "").replace("chap-", "")} with ${lastTest.score}%.`;
  } else if (totalHeld > 0) {
    headline = `💪 You have ${totalHeld} words held active in memory.`;
  } else {
    headline = `👋 Welcome back! 5 focused minutes today builds permanent recall.`;
  }

  // 5. Generate high-impact next action
  let nextAction = "";
  if (testMisses.length > 0) {
    const miss = testMisses[testMisses.length - 1];
    nextAction = `Target your last test slip: review "${miss.target || miss.question}" in a quick 2-minute drill.`;
  } else if (wordsStruggling.length > 0) {
    const w = wordsStruggling[wordsStruggling.length - 1];
    nextAction = `Reinforce "${w.wordAr || w.key}" — rated ${w.bucket}. 1 round in 10-Word Drill will lock it in.`;
  } else if (chapterPasses.length < 10) {
    const nextChapNum = chapterPasses.length + 1;
    nextAction = `Listen to Chapter ${nextChapNum}'s 10 sentences and take the 5-min test to master it.`;
  } else {
    nextAction = `Take a quick 10-word drill to keep your longest-standing words fresh.`;
  }

  return {
    streakDays: streak,
    minutesToday: Math.round(secToday / 60),
    totalHeld,
    solidCount,
    mediumCount,
    weakCount,
    learningCount,
    retiredCount,
    chapterPassesCount: chapterPasses.length,
    preplyPassesCount: preplyPasses.length,
    recentMissesCount: testMisses.length,
    headline,
    nextAction
  };
}
