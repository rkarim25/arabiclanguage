/* gen-aliases.js — one word, one card (COACH-LOOP gap E, built 12 Oct)
   The same word is carded under several keys (ev-…, qc:, story-NN:, qw:, w:, tw:),
   and 31 sentences carry two keys for one Arabic string. The scheduler used to
   schedule each twin separately and the counts doubled. This writes data/aliases.json:
   { groups: { canonical: [every key for that word or sentence] } }. js/srs.js writes
   a verdict to every key in the group and counts the group once; app.js adopts the
   strongest existing card into the whole group on load.
   Run: node scripts/gen-aliases.js  (after gen-sentences.js) */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const norm = s => String(s || "").replace(/[ً-ٰـۖ-ۭ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[؟،؛.!?,]/g, "").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

const parent = new Map();
const find = k => { while (parent.has(k) && parent.get(k) !== k) k = parent.get(k); return k; };
const union = (a, b) => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };

/* words: every key list the bank already resolved per word */
const bank = D("sentence-bank.json");
bank.sentences.forEach(s => (s.words || []).forEach(w => {
  const keys = (w && w.keys) || [];
  for (let i = 1; i < keys.length; i++) union(keys[0], keys[i]);
}));
/* sentences: the same Arabic under two keys (bank, everyday groups, phrases, Say your day) */
const byAr = new Map();
const claim = (ar, key) => { const n = norm(ar); if (!n || !key) return; if (!byAr.has(n)) byAr.set(n, []); if (!byAr.get(n).includes(key)) byAr.get(n).push(key); };
bank.sentences.forEach(s => claim(s.ar, s.key));
try { D("everyday.json").groups.forEach(g => g.members.forEach((m, i) => claim(m.ar, `ev-${g.id}:${i}`))); } catch (e) {}
try { D("phrases.json").groups.forEach(g => g.members.forEach((m, i) => claim(m.ar, `ph-${g.id}:${i}`))); } catch (e) {}
try { D("myday.json").sentences.forEach(s => claim(s.ar, s.id)); } catch (e) {}
let sentDupes = 0;
byAr.forEach(keys => { if (keys.length > 1) { sentDupes++; for (let i = 1; i < keys.length; i++) union(keys[0], keys[i]); } });

/* groups, canonical = the key the site prefers (a real deck card before a form key) */
const rank = k => /^(qc|ev-|ph-|story-|fam-|chap)/.test(k) ? 0 : /^(qw|qs|s:|md:)/.test(k) ? 1 : /^tw:/.test(k) ? 3 : 2;
const groups = new Map();
parent.forEach((_, k) => { const r = find(k); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(k); });
const out = {};
groups.forEach(keys => {
  if (keys.length < 2) return;
  keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  out[keys[0]] = keys;
});
const json = { version: 1, built: new Date().toISOString().slice(0, 10), note: "one word, one card — js/srs.js writes a verdict to every key here and counts the group once", groups: out };
fs.writeFileSync(path.join(ROOT, "data", "aliases.json"), JSON.stringify(json));
const n = Object.keys(out).length, total = Object.values(out).reduce((a, g) => a + g.length, 0);
console.log(`aliases.json: ${n} groups covering ${total} keys (${sentDupes} duplicated sentences)`);
