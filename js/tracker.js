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
    if (r.b === "never" && l.b !== "never") { srs[k] = r; return; }
    if (l.b) return; // explicit local mark (know/repeat/later/never) = latest intent on this device
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
}

function _payload(log) {
  return { progress: getProgress(), srs: getSrs(), tapwords: store.get("ats-tapwords", {}), log, savedAt: Date.now() };
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
  if (remote.tapwords) store.set("ats-tapwords", remote.tapwords);
  if (remote.log) store.set(LOG_KEY, remote.log);
}

/* ---------- Google sign-in helpers (index page) ---------- */
async function getGoogleClientId() {
  try {
    const r = await fetch(WORKER_URL + "/config");
    const c = await r.json();
    if (c.clientId) return c.clientId;
  } catch (e) { /* offline */ }
  return store.get(GCLIENT_KEY, null);
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
    scores[k] = scores[k] || { label, w: 0 };
    scores[k].w += w;
  };
  log.forEach(x => {
    if (x.e === "review" && x.g === "again") bump("card:" + x.card, null, 3);
    if (x.e === "tap") bump("word:" + x.w, x.w, 1);
    if (x.e === "fill" && x.ok === false) bump("fill:" + x.fam + ":" + x.i, null, 2);
    if ((x.e === "dict" || x.e === "trans") && x.ok === false) bump("sent:" + x.story + ":" + x.i, null, 2);
    if (x.e === "quiz" && x.ok === false) bump("quiz:" + x.story + ":" + x.q, null, 2);
    if (x.e === "speak" && typeof x.score === "number" && x.score < 0.6) bump("speak:" + x.story + ":" + x.s, null, 2);
  });
  return Object.entries(scores)
    .sort((a, b) => b[1].w - a[1].w)
    .slice(0, limit || 6);
}
