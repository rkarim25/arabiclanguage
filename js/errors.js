/* ============================================================================
   ERRORS — the error ledger (js/errors.js)

   COACH-LOOP.md gap A (12 Oct): "the site stores every wrong typed answer and
   every mis-heard transcript, and does nothing with them." This classifies a miss
   the moment it happens (Try it, both engines) so the event carries WHY, shows
   him the reason in one phrase, and lets the nightly and the teacher brief mine
   the ledger without re-deriving anything.

   Categories:
     spelling   — hamza seat (أ إ آ ء ؤ ئ), tāʾ marbūṭa (ة/ه), alif maqṣūra (ى/ي), vowels only
     morphology — same stem, wrong person ending (ـتُ/ـتَ/ـتِ/ـنَا/ـوا) or tense prefix (أ ي ت ن س)
     lexical    — a different word altogether (a confusion pair worth drilling side by side)
     phonology  — (mic) the word is right but for one consonant the recogniser keeps
                  swapping: ع→ا, ح→ه, ق→ك, ص→س, ض→د, ط→ت, ظ→ز, ذ→ز, ث→س, غ→ج, خ→ه
     missing    — a model word never produced
     order      — every word present, in the wrong order
   Pure, no DOM. Tests: node scripts/test-errors.js
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./match.js"));
  else root.Errors = factory(root.Match);
})(typeof self !== "undefined" ? self : this, function (Match) {
  "use strict";
  const strip = s => String(s || "").replace(/[ً-ْٰـۖ-ۭ]/g, "");
  const clean = s => strip(s).replace(/[؟،؛.!?,:;"«»()]/g, " ").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();
  const toks = s => clean(s).split(" ").filter(Boolean);
  const fold = s => (Match && Match.fold ? Match.fold(s) : clean(s).replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ءؤئ]/g, "ا"));
  const hamza = s => s.replace(/[أإآٱءؤئ]/g, "ا");
  const PHON = [["ع", "ا"], ["ح", "ه"], ["ق", "ك"], ["ص", "س"], ["ض", "د"], ["ط", "ت"], ["ظ", "ز"], ["ذ", "ز"], ["ث", "س"], ["غ", "ج"], ["خ", "ه"]];
  const PHON_NAME = { "ع": "ʿayn", "ح": "ḥāʾ", "ق": "qāf", "ص": "ṣād", "ض": "ḍād", "ط": "ṭāʾ", "ظ": "ẓāʾ", "ذ": "dhāl", "ث": "thāʾ", "غ": "ghayn", "خ": "khāʾ" };
  const phonFold = s => { let t = fold(s); PHON.forEach(([a, b]) => { t = t.split(a).join(b); }); return t; };
  const PERSON_END = /(تُ|تَ|تِ|تُمْ|نَا|وا|ون|ين|ان|ت|ن)$/;
  const TENSE_PRE = /^(س?)(ا|أ|ي|ت|ن)/;   // folded: the أ of أَشْرَبُ is an ا by now

  /* one model word vs one produced word */
  function wordDiff(model, got, how) {
    const m = clean(model), g = clean(got);
    if (!m || !g) return null;
    if (m === g) return null;
    if (strip(model) !== strip(got) && strip(model) === strip(got)) return null;
    const mf = fold(m), gf = fold(g);
    if (mf === gf) {
      if (hamza(m) === hamza(g)) return { cat: "spelling", sub: "hamza", model: m, got: g };
      if (m.replace(/ة/g, "ه") === g.replace(/ة/g, "ه")) return { cat: "spelling", sub: "ta-marbuta", model: m, got: g };
      if (m.replace(/ى/g, "ي") === g.replace(/ى/g, "ي") || m.replace(/ى/g, "ا") === g.replace(/ى/g, "ا")) return { cat: "spelling", sub: "alif-maqsura", model: m, got: g };
      return { cat: "spelling", sub: "letter", model: m, got: g };
    }
    if (how === "mic" && phonFold(m) === phonFold(g)) {
      // which consonant was swapped?
      for (let i = 0; i < Math.max(mf.length, gf.length); i++) {
        if (mf[i] !== gf[i]) { const pair = PHON.find(([a, b]) => (mf[i] === a && gf[i] === b) || (mf[i] === b && gf[i] === a)); if (pair) return { cat: "phonology", sub: pair[0], model: m, got: g, name: PHON_NAME[pair[0]] }; break; }
      }
      return { cat: "phonology", sub: "?", model: m, got: g };
    }
    // same stem, different person ending or tense prefix?
    const stem = s => s.replace(TENSE_PRE, "").replace(PERSON_END, "");
    const ms = stem(mf), gs = stem(gf);
    if (ms.length >= 2 && ms === gs) {
      if (mf.replace(PERSON_END, "") === gf.replace(PERSON_END, "")) return { cat: "morphology", sub: "ending", model: m, got: g };
      return { cat: "morphology", sub: "prefix", model: m, got: g };
    }
    return { cat: "lexical", sub: "word", model: m, got: g };
  }

  /* the whole answer vs the model → the primary error (first by severity) and all of them */
  function classify(model, got, how) {
    const mt = toks(model), gt = toks(got);
    if (!mt.length) return null;
    if (!gt.length) return { cat: "missing", sub: "all", model: mt.join(" "), got: "", all: [] };
    const mf = mt.map(fold), gf = gt.map(fold);
    if (mf.join(" ") === gf.join(" ")) {
      // only spelling or vowels differ, word by word
      const all = mt.map((w, i) => wordDiff(w, gt[i], how)).filter(Boolean);
      return all.length ? Object.assign({}, all[0], { all }) : null;
    }
    if (mf.length === gf.length && mf.slice().sort().join(" ") === gf.slice().sort().join(" ")) return { cat: "order", sub: "order", model: mt.join(" "), got: gt.join(" "), all: [] };
    // align by LCS on folded tokens; unmatched model words pair with unmatched produced words in order
    const n = mt.length, k = gt.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0));
    for (let i = 1; i <= n; i++) for (let j = 1; j <= k; j++) dp[i][j] = mf[i - 1] === gf[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const matchedM = new Set(), matchedG = new Set();
    let i = n, j = k;
    while (i > 0 && j > 0) {
      if (mf[i - 1] === gf[j - 1]) { matchedM.add(i - 1); matchedG.add(j - 1); i--; j--; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
    }
    const um = mt.map((w, x) => x).filter(x => !matchedM.has(x)), ug = gt.map((w, x) => x).filter(x => !matchedG.has(x));
    const all = [];
    um.forEach((mi, idx) => {
      const gi = ug[idx];
      if (gi == null) { all.push({ cat: "missing", sub: "word", model: mt[mi], got: "" }); return; }
      const d = wordDiff(mt[mi], gt[gi], how);
      if (d) all.push(d);
    });
    if (!all.length) return null;
    const RANK = { phonology: 0, spelling: 1, morphology: 2, lexical: 3, missing: 4, order: 5 };
    all.sort((a, b) => RANK[a.cat] - RANK[b.cat]);
    return Object.assign({}, all[0], { all });
  }

  /* one phrase for the learner */
  function describe(e) {
    if (!e) return "";
    switch (e.cat) {
      case "spelling": return e.sub === "hamza" ? `spelling: the hamza seat — ${e.model}, not ${e.got}` : e.sub === "ta-marbuta" ? `spelling: ة, not ه — ${e.model}` : e.sub === "alif-maqsura" ? `spelling: ى at the end — ${e.model}` : `spelling: ${e.model}, not ${e.got}`;
      case "morphology": return e.sub === "ending" ? `the ending: ${e.model}, not ${e.got} — who is doing it?` : `the prefix: ${e.model}, not ${e.got} — which tense?`;
      case "lexical": return `a different word: ${e.model}, not ${e.got}`;
      case "phonology": return `the ${e.name || e.sub} in ${e.model} was heard as ${e.got} — say it harder`;
      case "missing": return e.sub === "all" ? "nothing came through" : `missing: ${e.model}`;
      case "order": return "right words, wrong order";
      default: return "";
    }
  }

  /* the ledger: every classified miss in the log → counts, confusion pairs, the sounds that slip */
  function ledger(log, days) {
    const since = Date.now() - (days || 60) * 86400000;
    const cats = {}, pairs = {}, sounds = {}, byKey = {};
    (log || []).forEach(x => {
      if (!x || x.e !== "sent-drill" || x.ok || !x.err || x.t < since) return;
      const e = x.err;
      cats[e.cat] = (cats[e.cat] || 0) + 1;
      if (x.key) { const k = (byKey[x.key] = byKey[x.key] || { n: 0, cats: {} }); k.n++; k.cats[e.cat] = (k.cats[e.cat] || 0) + 1; }
      (e.all && e.all.length ? e.all : [e]).forEach(d => {
        if (d.cat === "lexical" && d.model && d.got) { const id = d.model + " ↔ " + d.got; pairs[id] = pairs[id] || { model: d.model, got: d.got, n: 0 }; pairs[id].n++; }
        if (d.cat === "phonology" && d.sub && d.sub !== "?") sounds[d.sub] = (sounds[d.sub] || 0) + 1;
      });
    });
    const top = o => Object.values(o).sort((a, b) => b.n - a.n);
    return { cats, pairs: top(pairs), sounds: Object.entries(sounds).sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ sound: s, name: PHON_NAME[s] || s, n })), byKey,
      total: Object.values(cats).reduce((a, b) => a + b, 0) };
  }
  return { classify, wordDiff, describe, ledger, fold, PHON };
});
