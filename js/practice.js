/* ============================================================================
   PRACTICE — Adaptive multi-stream batch composer (js/practice.js)

   Builds each "Practice" batch dynamically from the learner's live SRS +
   telemetry + motivation signals, budgeted by SENTENCE-EQUIVALENT EFFORT
   (10.0 units normally; 6.0 units after heavy mood taps or a >=4-day gap):

     · Vocabulary word (ev-*, qc:*, fam-*)  = 0.5 effort units
     · Everyday / routine / class sentence  = 1.0 effort unit
     · Grammar pattern item (gt:<id>:<i>)   = 1.0 effort unit
     · Qur'an ayah by ear (Mishary Alafasy) = 1.5 effort units

   Zero fixed pattern: stream shares flex every batch from live evidence
   (word lapses, grammar frame miss-rates, 7-day Qur'an ear balance, commute
   continuity, post-session mood taps, and days away).
   ============================================================================ */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Practice = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DAY = 86400000;
  const EFFORT = { word: 0.5, sentence: 1.0, grammar: 1.0, quran: 1.5 };
  const SALAH_RE = /^s:q:(fatiha|ikhlas|falaq|nas|kawthar|asr|nasr|kafirun|qadr|maun|quraysh|fil|kursi):/;

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const stripAr = s => String(s || "").replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[؟،؛.،«»!]/g, "").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

  function recallNow(card, now) {
    if (!card) return 0;
    if (card.b === "never") return 1;
    if (!card.u) return 0;
    if (typeof card.s === "number") return Math.pow(0.9, Math.max(0, now - card.u) / DAY / Math.max(0.05, card.s));
    const BOX = [0, 1, 3, 7, 14, 30];
    const h = Math.max(1, (BOX[card.box || 0] || 0) * 5) * DAY;
    return Math.pow(2, -Math.max(0, now - card.u) / h);
  }

  function isDue(card, now) {
    if (!card || card.b === "never" || !card.u) return false;
    return (card.due || 0) <= now || recallNow(card, now) < 0.9;
  }

  function isSlip(card, now) {
    if (!card || card.b === "never" || !card.u) return false;
    const recent = now - card.u < 14 * DAY;
    if (recent && (card.g === "no" || card.g === "maybe")) return true;
    return (card.box || 0) <= 1 && recallNow(card, now) < 0.8;
  }

  /* Convert grammar.json patterns into Practice items keyed by gt:<id>:<i> */
  function buildGrammarPool(patterns) {
    const out = [];
    (patterns || []).forEach(p => {
      if (!p || !p.id) return;
      const allKeys = (p.test || []).map((_, idx) => `gt:${p.id}:${idx}`);
      const shortName = String(p.name || p.id).split("—")[0].trim();
      (p.test || []).forEach((t, idx) => {
        if (!t || !t.ar || !t.prompt) return;
        out.push({
          key: `gt:${p.id}:${idx}`,
          kind: "grammar",
          effort: EFFORT.grammar,
          ar: t.ar,
          en: `${t.prompt}`,
          tr: t.hint || "",
          note: `${p.name || p.id}: ${p.what || ""}`.trim(),
          grammarName: shortName,
          patId: p.id,
          patTestKeys: allKeys,
          words: [],
          src: "grammar",
          track: "grammar",
          pattern: p.id,
          frames: [p.id]
        });
      });
    });
    return out;
  }

  /* Read telemetry + SRS + motivation to diagnose what the learner needs right now */
  function diagnose(ctx) {
    const now = ctx.now || Date.now();
    const srs = ctx.srs || {};
    const log = ctx.log || [];
    const words = ctx.words || [];
    const sentences = ctx.sentences || [];
    const grammar = ctx.grammar || [];
    const hwSet = ctx.homework instanceof Set ? ctx.homework : new Set(ctx.homework || []);

    // 1. Gap days & motivation state
    const studyEvs = log.filter(x => x && x.t && ["vocab-rate", "sentence-rate", "sent-drill", "commute-done", "qtest-done", "qlisten-test", "gtest-done", "bucket", "prompt", "tryit-free-done"].includes(x.e));
    const lastStudyT = studyEvs.length ? studyEvs[studyEvs.length - 1].t : now;
    const gapDays = studyEvs.length ? Math.max(0, (now - lastStudyT) / DAY) : 0;

    const moods = log.filter(x => x && x.e === "mood" && x.t >= now - 7 * DAY).sort((a, b) => a.t - b.t);
    const lastMood = moods.length ? moods[moods.length - 1].mood : null;
    const twoHeavy = moods.length >= 2 && moods.slice(-2).every(m => m.mood === "heavy");
    const easyDay = !!ctx.easyDay || twoHeavy;
    const comeback = gapDays >= 4;
    const light = easyDay || comeback;
    const budget = light ? 6.0 : (ctx.budget || 10.0);

    // Recent accuracy over last 12 verdicts/tries
    const recentGrades = log.filter(x => x && x.t >= now - 14 * DAY && (
      x.e === "sent-drill" || x.e === "vocab-rate" || x.e === "sentence-rate" || x.e === "bucket"
    )).slice(-12);
    const passCount = recentGrades.filter(x => {
      if (x.e === "sent-drill") return !!x.ok;
      return x.g === "yes" || x.g === "solid" || x.bucket === "strong" || x.bucket === "medium";
    }).length;
    const recentPassRate = recentGrades.length >= 4 ? passCount / recentGrades.length : 0.75;

    // 2. Vocabulary pressure
    let wordSlips = 0, wordDue = 0, hwWordsShaky = 0;
    words.forEach(w => {
      const c = srs[w.key];
      if (hwSet.has(w.key) && (!c || (c.box || 0) < 2)) hwWordsShaky++;
      if (!c || c.b === "never" || !c.u) return;
      if (isSlip(c, now)) wordSlips++;
      else if (isDue(c, now)) wordDue++;
    });

    // 3. Grammar pressure
    let grammarSlips = 0, grammarDue = 0;
    grammar.forEach(g => {
      const c = srs[g.key];
      if (!c || c.b === "never" || !c.u) return;
      if (isSlip(c, now)) grammarSlips++;
      else if (isDue(c, now)) grammarDue++;
    });
    const recentErrors = log.filter(x => x && x.t >= now - 7 * DAY && x.e === "sent-drill" && !x.ok && x.err).length;
    let weakFrame = null;
    if (ctx.FreeTry && typeof ctx.FreeTry.grammarProfile === "function" && sentences.length) {
      const gp = ctx.FreeTry.grammarProfile(sentences, { now, srs, log, freq: ctx.freq || {} });
      if (gp && gp.focus) {
        const prof = gp.profile && gp.profile[gp.focus];
        if (prof && (prof.passRate !== null && prof.passRate < 70)) weakFrame = gp.focus;
        else if (!light && prof && prof.unseen) weakFrame = gp.focus;
      }
    }

    // 4. Qur'an & listening pressure (7-day balance)
    const weekLog = log.filter(x => x && x.t >= now - 7 * DAY);
    const earEvs7d = weekLog.filter(x => ["alisten-grade", "qtest-done", "qtest-part", "qlisten-test", "commute-done"].includes(x.e) || (x.e === "sentence-rate" && /^s:q/.test(x.key || ""))).length;
    const totalStudy7d = Math.max(1, weekLog.filter(x => ["vocab-rate", "sentence-rate", "sent-drill", "qtest-done", "qlisten-test", "alisten-grade", "gtest-done"].includes(x.e)).length);
    const earShare7d = earEvs7d / totalStudy7d;
    const quranToday = log.filter(x => x && x.t >= now - 12 * 3600000 && (["qtest-done", "qlisten-test"].includes(x.e) || (x.e === "sentence-rate" && /^s:q/.test(x.key || "")))).length;
    const quranPool = sentences.filter(s => s.track === "quran");
    const quranDue = quranPool.filter(s => isDue(srs[s.key], now) || isSlip(srs[s.key], now)).length;

    const allowNew = !light && recentPassRate >= 0.55 && wordSlips <= 18;
    const mode = comeback ? "comeback" : easyDay ? "light" : (lastMood === "good" && recentPassRate >= 0.8) ? "surge" : "steady";

    // Compute dynamic target effort units per stream (no fixed template!)
    let vocabUnits = 0;
    if (wordSlips >= 8 || hwWordsShaky >= 4) vocabUnits = light ? 2.0 : 3.5;
    else if (wordSlips >= 3 || wordDue >= 8 || hwWordsShaky >= 1) vocabUnits = light ? 1.5 : 2.0;
    else if (wordDue >= 1 || allowNew) vocabUnits = 1.0;
    else vocabUnits = 0;

    let grammarUnits = 0;
    if (light && grammarSlips === 0) {
      grammarUnits = 0; // protect energy on heavy/comeback days unless a grammar slip is active
    } else if (grammarSlips >= 2 || recentErrors >= 3) {
      grammarUnits = light ? 1.0 : 2.0;
    } else if (grammarSlips >= 1 || grammarDue >= 1 || weakFrame) {
      grammarUnits = 1.0;
    } else if (mode === "surge" && grammar.some(g => !srs[g.key])) {
      grammarUnits = 1.0;
    }

    let quranUnits = 0;
    if (quranToday >= 3 && quranDue === 0) {
      quranUnits = 0; // already practiced Qur'an ayats heavily today
    } else if (!light && earShare7d < 0.12 && quranPool.length >= 2 && budget >= 10) {
      quranUnits = 3.0; // 2 ayats when Qur'an ear share dropped very low
    } else if (quranDue >= 1 || earShare7d < 0.28 || mode === "surge") {
      quranUnits = 1.5; // 1 ayah
    }

    // Cap non-sentence streams so everyday/spoken sentences always keep meaningful space
    const maxAux = budget - (light ? 2.5 : 3.5);
    if (vocabUnits + grammarUnits + quranUnits > maxAux) {
      if (quranUnits > 1.5) quranUnits = 1.5;
      if (vocabUnits + grammarUnits + quranUnits > maxAux) {
        vocabUnits = Math.max(0.5, Math.floor((maxAux - grammarUnits - quranUnits) * 2) / 2);
      }
    }
    vocabUnits = Math.max(0, vocabUnits);
    const sentenceUnits = Math.max(2.0, budget - vocabUnits - grammarUnits - quranUnits);

    return {
      mode, light, comeback, easyDay, gapDays: Math.round(gapDays * 10) / 10,
      lastMood, recentPassRate: Math.round(recentPassRate * 100),
      allowNew, budget,
      wordSlips, wordDue, hwWordsShaky,
      grammarSlips, grammarDue, recentErrors, weakFrame,
      earShare7d: Math.round(earShare7d * 100), quranDue, quranToday,
      targets: { vocabUnits, grammarUnits, quranUnits, sentenceUnits }
    };
  }

  function scoreCandidate(it, srs, now, hwSet, allowNew, boostFn) {
    const c = srs[it.key];
    if (c && c.b === "never") return -Infinity;
    const seen = !!(c && c.u);
    if (!seen && !allowNew) return -1000 + (hwSet.has(it.key) ? 500 : 0); // only review when allowNew is false
    let sc = boostFn ? (boostFn(it) || 0) : 0;
    if (hwSet.has(it.key)) sc += 6;
    if (seen) {
      const r = recallNow(c, now);
      if (isSlip(c, now)) sc += 8 + (1 - r) * 3;
      else if (isDue(c, now)) sc += 5 + (1 - r) * 2;
      else sc += 0.5 + (1 - r); // consolidation
      if (now - c.u < 2 * 3600000 && (c.g === "yes" || c.g === "solid")) sc -= 6; // already passed right now
    } else {
      sc += 3.2; // fresh item when allowNew is true
    }
    return sc;
  }

  function buildBatch(ctx) {
    const now = ctx.now || Date.now();
    const srs = ctx.srs || {};
    const log = ctx.log || [];
    const exclude = ctx.exclude instanceof Set ? ctx.exclude : new Set(ctx.exclude || []);
    const hwSet = ctx.homework instanceof Set ? ctx.homework : new Set(ctx.homework || []);
    const diag = diagnose(ctx);

    // Commute continuity: sentences heard in last 36h not yet checked
    const cd = [...log].reverse().find(e => e && e.e === "commute-done" && e.sentEns && e.sentEns.length && now - e.t < 36 * 3600000);
    const checked = cd && log.some(e => e && e.e === "commute-check-done" && e.forT === cd.t);
    const heardEns = new Set(cd && !checked ? cd.sentEns.map(s => String(s).trim().toLowerCase()) : []);

    const chosen = [];
    const usedKeys = new Set(exclude);
    const coveredNormWords = new Set();
    let effort = 0;

    const addItem = (base, kind, why) => {
      const eff = EFFORT[kind] || 1.0;
      const copy = Object.assign({}, base, {
        kind,
        effort: eff,
        _practice: { kind, effort: eff, why }
      });
      if (!copy._try && why) copy._try = { why, p: base._try && base._try.p ? base._try.p : null };
      chosen.push(copy);
      usedKeys.add(copy.key);
      effort = Math.round((effort + eff) * 10) / 10;
      (copy.words || []).forEach(w => {
        const ar = Array.isArray(w) ? w[0] : (w && w.ar);
        const n = stripAr(ar).replace(/^ال/, "");
        if (n) coveredNormWords.add(n);
      });
    };

    // 1. Pick Everyday / Spoken Sentences first (so standalone words don't duplicate words already inside today's sentences!)
    const everydayPool = (ctx.sentences || []).filter(s => s.track !== "quran" && s.kind !== "grammar" && s.kind !== "word" && !usedKeys.has(s.key) && !(srs[s.key] && srs[s.key].b === "never"));
    const nSentTarget = Math.max(1, Math.round(diag.targets.sentenceUnits / EFFORT.sentence));
    let pickedSents = [];

    if (ctx.FreeTry && typeof ctx.FreeTry.plan === "function" && everydayPool.length) {
      const byEn = new Map(everydayPool.map(s => [s.key, String(s.en || "").trim().toLowerCase()]));
      const ft = ctx.FreeTry.plan(everydayPool, {
        now, srs, log,
        freq: ctx.freq || {},
        homework: hwSet,
        size: nSentTarget + 4,
        relaxFrom: Object.keys(srs).length < 30 ? 4 : 2,
        sweetShift: diag.light ? 0.65 : 0,
        wordKeyFor: ctx.wordKeyFor || null,
        boost: key => (heardEns.has(byEn.get(key)) ? 3.5 : 0) + (/^md:/.test(key) ? 1.8 : 0) + (/^chap:/.test(key) ? 0.8 : 0)
      });
      pickedSents = (ft.list || []).filter(s => !usedKeys.has(s.key));
      if (!diag.allowNew) {
        const revOnly = pickedSents.filter(s => srs[s.key] && srs[s.key].u);
        if (revOnly.length >= Math.min(2, nSentTarget)) pickedSents = revOnly;
      }
    }
    if (pickedSents.length < nSentTarget) {
      const fallback = everydayPool
        .filter(s => !usedKeys.has(s.key) && !pickedSents.some(p => p.key === s.key))
        .map(s => ({ s, sc: scoreCandidate(s, srs, now, hwSet, diag.allowNew, it => (heardEns.has(String(it.en || "").trim().toLowerCase()) ? 4 : 0) + (/^md:/.test(it.key) ? 2 : 0)) }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc)
        .map(x => x.s);
      pickedSents = pickedSents.concat(fallback);
    }
    pickedSents.slice(0, nSentTarget).forEach(s => {
      const why = heardEns.has(String(s.en || "").trim().toLowerCase()) ? "from commute"
        : isSlip(srs[s.key], now) ? "slip review"
        : isDue(srs[s.key], now) ? "due sentence"
        : (s._try && s._try.why) ? s._try.why : "spoken core";
      addItem(s, "sentence", why);
    });

    // 2. Pick Grammar items (when diag.targets.grammarUnits >= 1)
    const nGramTarget = Math.floor((diag.targets.grammarUnits + 0.01) / EFFORT.grammar);
    if (nGramTarget > 0 && (ctx.grammar || []).length) {
      const gramScored = ctx.grammar
        .filter(g => !usedKeys.has(g.key))
        .map(g => ({
          g,
          sc: scoreCandidate(g, srs, now, hwSet, diag.allowNew || diag.weakFrame === g.patId, it =>
            (diag.weakFrame && it.patId === diag.weakFrame ? 4.5 : 0))
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc);
      const seenPat = new Set();
      for (const { g } of gramScored) {
        if (chosen.filter(x => x.kind === "grammar").length >= nGramTarget) break;
        if (effort + EFFORT.grammar > diag.budget + 0.5) break;
        if (seenPat.has(g.patId) && gramScored.length > nGramTarget) continue; // prefer distinct patterns if >1
        seenPat.add(g.patId);
        const why = isSlip(srs[g.key], now) ? "grammar slip" : (diag.weakFrame === g.patId ? `focus: ${g.grammarName}` : "grammar check");
        addItem(g, "grammar", why);
      }
    }

    // 3. Pick Qur'an Ayats by ear (when diag.targets.quranUnits >= 1.5)
    const nQuranTarget = Math.floor((diag.targets.quranUnits + 0.01) / EFFORT.quran);
    if (nQuranTarget > 0) {
      const qPool = (ctx.sentences || []).filter(s => s.track === "quran" && !usedKeys.has(s.key));
      const qScored = qPool
        .map(q => ({
          q,
          sc: scoreCandidate(q, srs, now, hwSet, diag.allowNew || SALAH_RE.test(q.key), it =>
            (SALAH_RE.test(it.key) ? 3.0 : 0) + (it.ref ? 1.0 : 0))
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc);
      for (const { q } of qScored) {
        if (chosen.filter(x => x.kind === "quran").length >= nQuranTarget) break;
        if (effort + EFFORT.quran > diag.budget + 0.5) break;
        const why = isSlip(srs[q.key], now) ? "ayah review" : isDue(srs[q.key], now) ? "due ayah" : "Qur'an by ear";
        addItem(q, "quran", why);
      }
    }

    // 4. Fill remaining effort budget with Vocabulary words (0.5 each) + top-up sentences if needed
    const wordPool = (ctx.words || []).filter(w => {
      if (usedKeys.has(w.key)) return false;
      const n = stripAr(w.ar).replace(/^ال/, "");
      return !coveredNormWords.has(n); // skip words already exercised inside today's chosen sentences
    });
    const wordScored = wordPool
      .map(w => ({
        w,
        sc: scoreCandidate(w, srs, now, hwSet, diag.allowNew, it =>
          (it.src === "teacher" ? 1.2 : it.src === "quran" ? 1.0 : 0.6))
      }))
      .filter(x => x.sc > -500)
      .sort((a, b) => b.sc - a.sc);

    // Target word units = remaining budget up to diag.budget (words are 0.5 each, great for exact 10.0 landing!)
    const maxWords = Math.min(wordScored.length, Math.max(0, Math.round((diag.budget - effort) / EFFORT.word)));
    for (let i = 0; i < maxWords && effort + EFFORT.word <= diag.budget + 0.01; i++) {
      const w = wordScored[i].w;
      const c = srs[w.key];
      const why = hwSet.has(w.key) ? "class vocab" : isSlip(c, now) ? "word slip" : isDue(c, now) ? "due word" : "new word";
      addItem({
        key: w.key,
        ar: w.ar,
        en: w.en,
        tr: w.tr || "",
        note: w.note || (w.root ? `Root: ${w.root}` : ""),
        words: [[w.ar, w.en]],
        src: "vocab",
        wordSrc: w.src || "everyday",
        track: w.src === "quran" ? "quran-word" : "vocab"
      }, "word", why);
    }

    // 5. If effort is still short of budget (e.g., tiny word pool in tests or filtered view), top up with remaining sentences
    if (effort < diag.budget - 0.4) {
      const extraSents = pickedSents.filter(s => !usedKeys.has(s.key));
      for (const s of extraSents) {
        if (effort + EFFORT.sentence > diag.budget + 0.5) break;
        addItem(s, "sentence", "spoken core");
      }
    }

    // 6. Smooth interleaving: open with an approachable word or familiar sentence, weave grammar/Qur'an in the middle
    const wordsPicked = chosen.filter(x => x.kind === "word");
    const sentsPicked = chosen.filter(x => x.kind === "sentence");
    const gramPicked = chosen.filter(x => x.kind === "grammar");
    const quranPicked = chosen.filter(x => x.kind === "quran");
    const specials = [];
    const maxSp = Math.max(gramPicked.length, quranPicked.length);
    for (let i = 0; i < maxSp; i++) {
      if (gramPicked[i]) specials.push(gramPicked[i]);
      if (quranPicked[i]) specials.push(quranPicked[i]);
    }

    const ordered = [];
    if (wordsPicked.length) ordered.push(wordsPicked.shift());
    if (sentsPicked.length) ordered.push(sentsPicked.shift());
    while (wordsPicked.length || sentsPicked.length || specials.length) {
      if (wordsPicked.length) ordered.push(wordsPicked.shift());
      if (specials.length) ordered.push(specials.shift());
      if (sentsPicked.length) ordered.push(sentsPicked.shift());
      if (sentsPicked.length && !wordsPicked.length && specials.length) ordered.push(sentsPicked.shift());
    }

    const counts = {
      word: ordered.filter(x => x.kind === "word").length,
      sentence: ordered.filter(x => x.kind === "sentence").length,
      grammar: ordered.filter(x => x.kind === "grammar").length,
      quran: ordered.filter(x => x.kind === "quran").length
    };
    const parts = [];
    if (counts.word) parts.push(`${counts.word} vocab`);
    if (counts.sentence) parts.push(`${counts.sentence} sentence${counts.sentence === 1 ? "" : "s"}`);
    if (counts.grammar) parts.push(`${counts.grammar} grammar`);
    if (counts.quran) parts.push(`${counts.quran} Qur'an`);

    const whyTone = diag.comeback ? `welcome back (${Math.floor(diag.gapDays)}d gap) — review-only`
      : diag.easyDay ? "lighter energy mode — review-only"
      : heardEns.size ? "continuing from your commute"
      : diag.mode === "surge" ? "strong recent streak — stretching gently"
      : "adapted from your recall & balance";

    return {
      list: ordered,
      effort,
      budget: diag.budget,
      counts,
      diag,
      pendingCommute: cd && !checked && heardEns.size ? { t: cd.t, n: heardEns.size } : null,
      title: diag.light ? "⚡ Practice — lighter round" : "⚡ Practice",
      summary: `${parts.join(" · ")} (= ${effort} sentence-units) · ${whyTone}`
    };
  }

  return { EFFORT, diagnose, buildGrammarPool, buildBatch, recallNow };
});
