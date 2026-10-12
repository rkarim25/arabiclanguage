/* refit-progress.js — does the forecast's memory model still fit his log? (COACH-LOOP gap H)
   js/progress-model.js CAL = { H0, K, P_NEW } was fitted by hand on 2026-08-06. This replays
   his graded re-encounters (an answer on a card he had answered before) and scores the
   current constants against a small grid by log-likelihood. It PROPOSES, never writes:
   the nightly runs it and reports when the best grid point beats the current one by the
   margin below. Usage: node scripts/refit-progress.js <kv-payload.json>
   Approximation, stated: the box before each encounter is replayed with a plain Leitner
   walk from the verdict history (good → +1, again → 0), not read from the card. */
const fs = require("fs"), path = require("path");
const PM = require(path.join(__dirname, "..", "js", "progress-model.js"));
const DAY = 86400000, BOX_DAYS = [0, 1, 3, 7, 14, 30];
const file = process.argv[2];
if (!file) { console.log("usage: node scripts/refit-progress.js <payload.json>"); process.exit(0); }
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const log = (data.log || []).filter(x => x && x.t).sort((a, b) => a.t - b.t);
const okOf = x => {
  if (x.e === "review") return x.g === "good" || x.g === "easy";
  if (x.e === "vocab-rate" || x.e === "sentence-rate" || x.e === "bucket") return x.g ? (x.g === "yes" || x.g === "solid") : /strong|medium/.test(x.bucket || "");
  if (x.e === "sheet" || x.e === "fill" || x.e === "qfill") return !!x.ok;
  return null;
};
const keyOf = x => x.card || x.key || x.w || null;
const state = new Map();   // key → { box, last }
const enc = [];            // re-encounters: { gap, box, ok }
let firsts = 0, firstOk = 0;
log.forEach(x => {
  const ok = okOf(x), k = keyOf(x);
  if (ok === null || !k) return;
  const s = state.get(k);
  if (s) enc.push({ gap: (x.t - s.last) / DAY, box: s.box, ok });
  else { firsts++; if (ok) firstOk++; }
  const box = s ? (ok ? Math.min(5, s.box + 1) : 0) : (ok ? 1 : 0);
  state.set(k, { box, last: x.t });
});
if (enc.length < 50) { console.log(`only ${enc.length} re-encounters — not enough to refit (need 50)`); process.exit(0); }
const ll = (H0, K) => enc.reduce((a, e) => {
  const h = Math.max(H0, (BOX_DAYS[e.box] || 0) * K);
  const p = Math.min(0.995, Math.max(0.005, Math.pow(0.5, e.gap / h)));
  return a + Math.log(e.ok ? p : 1 - p);
}, 0);
const cur = PM.CAL;
const curLL = ll(cur.H0, cur.K);
let best = { H0: cur.H0, K: cur.K, ll: curLL };
[0.5, 1, 1.5, 2, 3].forEach(H0 => [2, 3, 4, 5, 6, 8, 10, 14].forEach(K => { const v = ll(H0, K); if (v > best.ll) best = { H0, K, ll: v }; }));
const pNew = firsts ? firstOk / firsts : null;
const gain = (best.ll - curLL) / enc.length;     // nats per encounter
console.log(`re-encounters: ${enc.length} · first encounters: ${firsts} (P_NEW observed ${pNew == null ? "n/a" : pNew.toFixed(2)}, current ${cur.P_NEW})`);
console.log(`current H0=${cur.H0} K=${cur.K}: LL/n = ${(curLL / enc.length).toFixed(4)}`);
console.log(`best    H0=${best.H0} K=${best.K}: LL/n = ${(best.ll / enc.length).toFixed(4)}  (gain ${gain.toFixed(4)} nats/encounter)`);
const MARGIN = 0.02;
if (pNew != null && Math.abs(pNew - cur.P_NEW) > 0.15) console.log(`note: first-encounter success here is ${pNew.toFixed(2)} vs CAL.P_NEW ${cur.P_NEW} — a different definition (P_NEW is recall at the FIRST TEST after teaching), so this is a flag to look, not a proposal`);
if (gain > MARGIN) {
  console.log(`PROPOSE: CAL = { H0: ${best.H0}, K: ${best.K}, P_NEW: ${cur.P_NEW} } — beats the current fit by more than ${MARGIN} nats/encounter; change js/progress-model.js CAL only after a human look at the fit (the header documents how).`);
} else {
  console.log("current constants are within the margin — nothing to change");
}
