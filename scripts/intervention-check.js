/* intervention-check.js — did a content move actually help? (COACH-LOOP gap I)
   data/interventions.json lists what was added for which card and when (a mnemonic,
   a drill, a grammar note). This joins each one to that key's verdicts BEFORE and AFTER
   and prints the miss rate on both sides, so the nightly keeps what works and stops
   doing what does not. Usage: node scripts/intervention-check.js <kv-payload.json>
   The nightly appends to data/interventions.json whenever it adds targeted content:
   { "date": "YYYY-MM-DD", "kind": "mnemonic|drill|note|sentences", "keys": [...], "what": "…" } */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const DAY = 86400000;
const file = process.argv[2];
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "interventions.json"), "utf8"));
if (!file) { console.log(`${ledger.items.length} interventions on record; pass a payload to evaluate them`); process.exit(0); }
const log = (JSON.parse(fs.readFileSync(file, "utf8")).log || []).filter(x => x && x.t);
const verdicts = log.filter(x => (x.e === "vocab-rate" || x.e === "sentence-rate" || x.e === "bucket" || x.e === "review" || x.e === "sent-drill") && (x.key || x.card));
const okOf = x => x.e === "sent-drill" ? !!x.ok : x.e === "review" ? (x.g === "good" || x.g === "easy") : x.g ? (x.g === "yes" || x.g === "solid") : /strong|medium/.test(x.bucket || "");
const rate = vs => vs.length ? vs.filter(v => !okOf(v)).length / vs.length : null;
const pct = r => (r == null ? "—" : Math.round(r * 100) + "%");
let printed = 0;
ledger.items.forEach(it => {
  const t0 = Date.parse(it.date + "T00:00:00");
  const keys = new Set(it.keys || []);
  const mine = verdicts.filter(v => keys.has(v.key || v.card));
  const before = mine.filter(v => v.t < t0), after = mine.filter(v => v.t >= t0);
  const rb = rate(before), ra = rate(after);
  const verdict = ra == null ? "no verdicts since — unmeasured" : rb == null ? `miss rate after: ${pct(ra)} (nothing before to compare)` : ra < rb - 0.15 ? `HELPED: misses ${pct(rb)} → ${pct(ra)}` : ra > rb + 0.15 ? `WORSE: misses ${pct(rb)} → ${pct(ra)}` : `no clear change: ${pct(rb)} → ${pct(ra)}`;
  console.log(`${it.date} ${it.kind} ${it.keys.join(",")} — ${it.what}\n    before n=${before.length}, after n=${after.length}: ${verdict}`);
  printed++;
});
if (!printed) console.log("no interventions on record yet");
