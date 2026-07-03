/* Learning analytics: append-only event log in localStorage + sync to the
   private GitHub repo rkarim25/arabic-learning-data (fine-grained PAT).
   Claude reads that repo in chat sessions to analyze weaknesses and writes
   coach.json back, which the dashboard displays. */

const LOG_KEY = "ats-log";
const TOKEN_KEY = "ats-token";
const SYNC_KEY = "ats-lastsync";
const DATA_REPO = "rkarim25/arabic-learning-data";
const DATA_FILE = "learning-data.json";

function logEvent(e) {
  const log = store.get(LOG_KEY, []);
  e.t = Date.now();
  log.push(e);
  store.set(LOG_KEY, log);
}

/* ---------- time-on-task ---------- */
let _page = null, _pageStart = 0;
function trackPage(name) {
  flushTime();
  _page = name;
  _pageStart = Date.now();
}
function flushTime() {
  if (_page && _pageStart) {
    const sec = Math.round((Date.now() - _pageStart) / 1000);
    if (sec >= 5) logEvent({ e: "time", page: _page, sec });
  }
  _pageStart = Date.now();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { flushTime(); autoSync(); }
  else _pageStart = Date.now();
});
window.addEventListener("pagehide", flushTime);

/* ---------- GitHub sync ---------- */
function getToken() { return store.get(TOKEN_KEY, null); }
function setToken(t) { store.set(TOKEN_KEY, t); }

function _b64enc(s) { return btoa(unescape(encodeURIComponent(s))); }
function _b64dec(s) { return decodeURIComponent(escape(atob(s.replace(/\s/g, "")))); }

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

function _evKey(x) {
  return x.t + "|" + x.e + "|" + (x.card || x.w || x.page || "") + "|" + (x.q ?? x.s ?? x.i ?? "");
}

async function syncNow() {
  flushTime();
  let sha = null, remote = null;
  const r = await ghReq(`contents/${DATA_FILE}`);
  if (r.status === 200) {
    const j = await r.json();
    sha = j.sha;
    try { remote = JSON.parse(_b64dec(j.content)); } catch (e) { /* corrupt remote; overwrite */ }
  } else if (r.status === 401 || r.status === 403) {
    throw new Error("bad-token");
  }
  // merge remote log into local (append-only union) so multiple devices don't clobber
  let log = store.get(LOG_KEY, []);
  if (remote && Array.isArray(remote.log)) {
    const seen = new Set(log.map(_evKey));
    remote.log.forEach(x => { if (!seen.has(_evKey(x))) log.push(x); });
    log.sort((a, b) => a.t - b.t);
    store.set(LOG_KEY, log);
  }
  const payload = { progress: getProgress(), srs: getSrs(), log, savedAt: Date.now() };
  const put = await ghReq(`contents/${DATA_FILE}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "sync " + new Date().toISOString(),
      content: _b64enc(JSON.stringify(payload)),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) throw new Error("sync-failed-" + put.status);
  store.set(SYNC_KEY, Date.now());
  return payload.log.length;
}

let _syncing = false;
async function autoSync() {
  if (!getToken() || _syncing) return;
  const last = store.get(SYNC_KEY, 0);
  if (Date.now() - last < 3 * 60 * 1000) return; // at most every 3 min
  _syncing = true;
  try { await syncNow(); } catch (e) { /* silent for auto */ }
  _syncing = false;
}

async function fetchCoach() {
  const r = await ghReq("contents/coach.json");
  if (r.status !== 200) return null;
  const j = await r.json();
  try { return JSON.parse(_b64dec(j.content)); } catch (e) { return null; }
}

async function restoreFromCloud() {
  const r = await ghReq(`contents/${DATA_FILE}`);
  if (r.status !== 200) throw new Error("no-cloud-data");
  const remote = JSON.parse(_b64dec((await r.json()).content));
  if (remote.progress) store.set("ats-progress", remote.progress);
  if (remote.srs) store.set("ats-srs", remote.srs);
  if (remote.log) store.set(LOG_KEY, remote.log);
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
    if ((x.e === "dict" || x.e === "trans") && x.ok === false) bump("sent:" + x.story + ":" + x.i, null, 2);
    if (x.e === "quiz" && x.ok === false) bump("quiz:" + x.story + ":" + x.q, null, 2);
    if (x.e === "speak" && typeof x.score === "number" && x.score < 0.6) bump("speak:" + x.story + ":" + x.s, null, 2);
  });
  return Object.entries(scores)
    .sort((a, b) => b[1].w - a[1].w)
    .slice(0, limit || 6);
}
