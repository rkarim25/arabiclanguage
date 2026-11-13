/* ============================================================================
   PRACTICE — Incremental multi-batch & multi-stream composer (js/practice.js)

   Organises daily & incremental study into coherent batches in ONE place:
     · Batch 1 (Primary Daily Core): Completes the daily requirement AND
       systematically advances the active weekly sentence lessons (Chapter 1–10
       ladder + Preply homework), balanced with vocabulary, inline grammar
       explanations, and Qur'an by ear (Mishary Rashid Alafasy).
     · Batch 2 (Review-Focused Consolidation, ~75% review / ≤25% new): Shifts
       weight strongly toward due, shaky, and slipped items across all streams
       with at most 1–2 new weekly items.
     · Batch 3+ (Deep Review Mix, ~90–100% review): Consolidates due & weakest
       sentences, words, grammar rules, and Qur'an ayats without bouncing across
       separate tabs.

   Effort Equivalence (10.0 units steady; 6.0 units on heavy/comeback days):
     · Vocabulary word (ev-*, qc:*, fam-*)  = 0.5 effort units
     · Everyday / chapter / class sentence  = 1.0 effort unit
     · Grammar pattern item (gt:<id>:<i>)   = 1.0 effort unit
     · Qur'an ayah by ear (Mishary Alafasy) = 1.5 effort units
   ============================================================================ */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Practice = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DAY = 86400000;
  const EFFORT = { word: 0.5, sentence: 1.0, grammar: 1.0, "lesson-card": 1.0, quran: 1.5 };
  const SALAH_RE = /^s:q:(fatiha|ikhlas|falaq|nas|kawthar|asr|nasr|kafirun|qadr|maun|quraysh|fil|kursi):/;

  const stripAr = s => String(s || "").replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[؟،؛.،«»!]/g, "").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();

  function startOfLocalDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

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

  function buildGrammarMap(patterns) {
    const map = {};
    (patterns || []).forEach(p => {
      if (!p || !p.id) return;
      const shortName = String(p.name || p.id).split("—")[0].trim();
      map[p.id] = {
        id: p.id,
        ar: p.ar || p.id,
        name: p.name || p.id,
        shortName,
        rule: p.cardRule || String(p.what || "").split("\n")[0].trim(),
        what: p.what || ""
      };
    });
    return map;
  }

  /* Convert grammar.json patterns into Practice items keyed by gt:<id>:<i> */
  function buildGrammarPool(patterns) {
    const out = [];
    (patterns || []).forEach(p => {
      if (!p || !p.id) return;
      const allKeys = (p.test || []).map((_, idx) => `gt:${p.id}:${idx}`);
      const shortName = String(p.name || p.id).split("—")[0].trim();
      const concise = p.cardRule || String(p.what || "").split("\n\n")[0].trim();
      (p.test || []).forEach((t, idx) => {
        if (!t || !t.ar || !t.prompt) return;
        out.push({
          key: `gt:${p.id}:${idx}`,
          kind: "grammar",
          effort: EFFORT.grammar,
          ar: t.ar,
          en: `${t.prompt}`,
          tr: t.hint || "",
          note: `${p.ar ? p.ar + " (" + shortName + ")" : p.name || p.id}: ${concise}`.trim(),
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

  /* Detect which Chapter (1..10) is currently the active weekly sentence lesson */
  function resolveActiveChapterNum(ctx) {
    if (typeof ctx.activeChapNum === "number" && ctx.activeChapNum >= 1) return ctx.activeChapNum;
    const log = ctx.log || [];
    const srs = ctx.srs || {};
    const passedChaps = new Set(
      log.filter(x => x && x.e === "chap-test" && x.chap && (x.score >= 80 || x.pass === true))
        .map(x => String(x.chap))
    );
    const chapNums = [...new Set(
      (ctx.sentences || [])
        .map(s => { const m = /^chap:(\d+):/.exec(s.key || ""); return m ? +m[1] : 0; })
        .filter(Boolean)
    )].sort((a, b) => a - b);
    for (const num of chapNums) {
      if (!passedChaps.has("chap-" + num)) {
        const chapSents = (ctx.sentences || []).filter(s => String(s.key || "").startsWith(`chap:${num}:`));
        const anyUnheld = chapSents.some(s => ((srs[s.key] || {}).box || 0) < 3 && (srs[s.key] || {}).b !== "never");
        if (anyUnheld || !chapSents.length) return num;
      }
    }
    return chapNums.length ? chapNums[0] : null;
  }

  function inferBatchNum(ctx, now) {
    if (typeof ctx.batchNum === "number" && ctx.batchNum >= 1) return Math.floor(ctx.batchNum);
    const day0 = startOfLocalDay(now);
    const doneToday = (ctx.log || []).filter(x =>
      x && x.t >= day0 && x.t <= now && x.e === "tryit-free-done" && x.kind === "myday"
    ).length;
    return doneToday + 1;
  }

  /* Read telemetry + SRS + motivation + batchNum to diagnose what the learner needs right now */
  function diagnose(ctx) {
    const now = ctx.now || Date.now();
    const srs = ctx.srs || {};
    const log = ctx.log || [];
    const words = ctx.words || [];
    const sentences = ctx.sentences || [];
    const grammar = ctx.grammar || [];
    const hwSet = ctx.homework instanceof Set ? ctx.homework : new Set(ctx.homework || []);
    const batchNum = inferBatchNum(ctx, now);
    const activeChapNum = resolveActiveChapterNum(ctx);

    // 1. Gap days & motivation state
    const studyEvs = log.filter(x => x && x.t && ["vocab-rate", "sentence-rate", "sent-drill", "commute-done", "qtest-done", "qlisten-test", "gtest-done", "bucket", "prompt", "tryit-free-done", "lesson-card-rate"].includes(x.e));
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

    // 5. Incremental Batch Review Ratio Policy:
    //    Batch 1: Primary Daily Core + Weekly Sentence Lessons (~40-50% new weekly progression allowed)
    //    Batch 2: Review-Focused Consolidation (~75-80% review, max 2 new items)
    //    Batch 3+: Deep Review & Reinforcement (~90-100% review, 0 new items when enough review exists)
    const baseAllowNew = !light && recentPassRate >= 0.55 && wordSlips <= 18;
    const allowNew = batchNum >= 3 ? false : baseAllowNew;
    const maxNewItems = !baseAllowNew ? 0 : batchNum === 1 ? 6 : batchNum === 2 ? 2 : 0;
    const reviewTargetShare = light ? 1.0 : batchNum === 1 ? 0.55 : batchNum === 2 ? 0.78 : 0.95;

    const mode = comeback ? "comeback" : easyDay ? "light" : batchNum >= 3 ? "deep-review" : batchNum === 2 ? "review-plus" : (lastMood === "good" && recentPassRate >= 0.8) ? "surge" : "steady";

    // Compute dynamic target effort units per stream
    let vocabUnits = 0;
    if (wordSlips >= 8 || hwWordsShaky >= 4) vocabUnits = light ? 2.0 : 3.5;
    else if (wordSlips >= 3 || wordDue >= 8 || hwWordsShaky >= 1) vocabUnits = light ? 1.5 : (batchNum >= 2 ? 2.5 : 2.0);
    else if (wordDue >= 1 || allowNew || batchNum >= 2) vocabUnits = batchNum >= 2 && wordDue >= 3 ? 2.0 : 1.0;
    else vocabUnits = 0;

    let grammarUnits = 0;
    if (light && grammarSlips === 0) {
      grammarUnits = 0;
    } else if (grammarSlips >= 2 || recentErrors >= 3) {
      grammarUnits = light ? 1.0 : 2.0;
    } else if (grammarSlips >= 1 || grammarDue >= 1 || weakFrame || (batchNum >= 2 && grammar.some(g => srs[g.key] && (srs[g.key].box || 0) <= 2))) {
      grammarUnits = 1.0;
    } else if (mode === "surge" && grammar.some(g => !srs[g.key])) {
      grammarUnits = 1.0;
    }

    let quranUnits = 0;
    if (quranToday >= 3 && quranDue === 0 && batchNum === 1) {
      quranUnits = 0;
    } else if (!light && earShare7d < 0.12 && quranPool.length >= 2 && budget >= 10 && batchNum === 1) {
      quranUnits = 3.0;
    } else if (quranDue >= 1 || earShare7d < 0.28 || mode === "surge" || batchNum >= 2) {
      quranUnits = quranPool.length ? 1.5 : 0;
    }

    const maxAux = budget - (light ? 2.5 : 3.5);
    if (vocabUnits + grammarUnits + quranUnits > maxAux) {
      if (quranUnits > 1.5) quranUnits = 1.5;
      if (vocabUnits + grammarUnits + quranUnits > maxAux) {
        vocabUnits = Math.max(0.5, Math.floor((maxAux - grammarUnits - quranUnits) * 2) / 2);
      }
    }
    vocabUnits = Math.max(0, vocabUnits);
    const sentenceUnits = Math.max(2.0, budget - vocabUnits - grammarUnits - quranUnits);

    // Active weekly chapter sentence stats
    const chapPrefix = activeChapNum ? `chap:${activeChapNum}:` : null;
    const weeklyChapSents = chapPrefix ? sentences.filter(s => String(s.key || "").startsWith(chapPrefix)) : [];
    const weeklyChapSolid = weeklyChapSents.filter(s => ((srs[s.key] || {}).box || 0) >= 2 || (srs[s.key] || {}).b === "never").length;

    return {
      mode, light, comeback, easyDay, gapDays: Math.round(gapDays * 10) / 10,
      batchNum, activeChapNum,
      weeklyChapTotal: weeklyChapSents.length,
      weeklyChapSolid,
      lastMood, recentPassRate: Math.round(recentPassRate * 100),
      allowNew, maxNewItems, reviewTargetShare, budget,
      wordSlips, wordDue, hwWordsShaky,
      grammarSlips, grammarDue, recentErrors, weakFrame,
      earShare7d: Math.round(earShare7d * 100), quranDue, quranToday,
      targets: { vocabUnits, grammarUnits, quranUnits, sentenceUnits }
    };
  }

  function scoreCandidate(it, srs, now, hwSet, allowNew, boostFn, reviewBias) {
    const c = srs[it.key];
    if (c && c.b === "never") return -Infinity;
    const seen = !!(c && c.u);
    if (!seen && !allowNew) return -1000 + (hwSet.has(it.key) ? 500 : 0);
    let sc = boostFn ? (boostFn(it) || 0) : 0;
    if (hwSet.has(it.key)) sc += 6;
    if (seen) {
      const r = recallNow(c, now);
      const rb = reviewBias || 1.0;
      if (isSlip(c, now)) sc += (8 + (1 - r) * 3) * rb;
      else if (isDue(c, now)) sc += (5 + (1 - r) * 2) * rb;
      else if ((c.box || 0) <= 2) sc += (2.5 + (1 - r) * 1.5) * rb;
      else sc += (0.5 + (1 - r)) * rb;
      if (now - c.u < 2 * 3600000 && (c.g === "yes" || c.g === "solid")) sc -= 6;
    } else {
      sc += 3.2;
    }
    return sc;
  }

  function buildBatch(ctx) {
    const now = ctx.now || Date.now();
    const srs = ctx.srs || {};
    const log = ctx.log || [];
    const exclude = ctx.exclude instanceof Set ? ctx.exclude : new Set(ctx.exclude || []);
    const hwSet = ctx.homework instanceof Set ? ctx.homework : new Set(ctx.homework || []);
    const gramMap = ctx.grammarMap || buildGrammarMap(ctx.grammarPatterns || []);
    const diag = diagnose(ctx);
    const reviewBias = diag.batchNum >= 3 ? 1.6 : diag.batchNum === 2 ? 1.35 : 1.0;

    // Commute continuity: sentences heard in last 36h not yet checked
    const cd = [...log].reverse().find(e => e && e.e === "commute-done" && e.sentEns && e.sentEns.length && now - e.t < 36 * 3600000);
    const checked = cd && log.some(e => e && e.e === "commute-check-done" && e.forT === cd.t);
    const heardEns = new Set(cd && !checked ? cd.sentEns.map(s => String(s).trim().toLowerCase()) : []);

    const chosen = [];
    const usedKeys = new Set(exclude);
    const coveredNormWords = new Set();
    let effort = 0;
    let newPickedCount = 0;

    const canTakeNew = (it) => {
      const seen = !!(srs[it.key] && srs[it.key].u);
      if (seen) return true;
      if (!diag.allowNew) return false;
      return newPickedCount < diag.maxNewItems;
    };

    const addItem = (base, kind, why) => {
      const eff = EFFORT[kind] || 1.0;
      const isNewItem = !(srs[base.key] && srs[base.key].u);
      if (isNewItem) newPickedCount++;
      const patRule = (kind === "sentence" && base.pattern && gramMap[base.pattern]) ? gramMap[base.pattern] : (base.grammarRule || null);
      const copy = Object.assign({}, base, {
        kind,
        effort: eff,
        grammarRule: patRule,
        _practice: { kind, effort: eff, why, isNew: isNewItem, batchNum: diag.batchNum }
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

    // 1. Pick Everyday / Weekly Lesson Sentences first
    const everydayPool = (ctx.sentences || []).filter(s => s.track !== "quran" && s.kind !== "grammar" && s.kind !== "word" && !usedKeys.has(s.key) && !(srs[s.key] && srs[s.key].b === "never"));
    const nSentTarget = Math.max(1, Math.round(diag.targets.sentenceUnits / EFFORT.sentence));
    const chapPrefix = diag.activeChapNum ? `chap:${diag.activeChapNum}:` : null;

    // 1a. Advance active weekly Chapter sentence lessons systematically!
    //     Batch 1: up to 2 unseen/shaky active-chapter sentences; Batch 2: up to 1; Batch 3+: review-only (shaky/due chapter sentences still eligible as review!)
    if (chapPrefix) {
      const chapCandidates = everydayPool
        .filter(s => String(s.key || "").startsWith(chapPrefix))
        .sort((a, b) => {
          const ia = +(String(a.key).split(":")[2] || 0);
          const ib = +(String(b.key).split(":")[2] || 0);
          const ca = srs[a.key], cb = srs[b.key];
          const slipA = isSlip(ca, now) ? 0 : (ca && ca.u && (ca.box || 0) < 2) ? 1 : (!ca || !ca.u) ? 2 : 3;
          const slipB = isSlip(cb, now) ? 0 : (cb && cb.u && (cb.box || 0) < 2) ? 1 : (!cb || !cb.u) ? 2 : 3;
          return slipA - slipB || ia - ib;
        });

      const maxChapSlots = diag.light ? 0 : diag.batchNum === 1 ? Math.min(2, Math.max(1, nSentTarget - 1)) : diag.batchNum === 2 ? 1 : 0;
      let chapAdded = 0;
      for (const cs of chapCandidates) {
        if (chapAdded >= maxChapSlots) break;
        const c = srs[cs.key];
        const seen = !!(c && c.u);
        if (seen && (c.box || 0) >= 3 && !isDue(c, now)) continue; // already held & not due
        if (!seen && !canTakeNew(cs)) continue;
        const why = seen ? `Ch ${diag.activeChapNum} review` : `weekly lesson · Ch ${diag.activeChapNum}`;
        addItem(cs, "sentence", why);
        chapAdded++;
      }
    }

    // 1b. Fill remaining sentence target via FreeTry + review-weighted fallback
    const remSentTarget = Math.max(0, nSentTarget - chosen.filter(x => x.kind === "sentence").length);
    let pickedSents = [];

    if (remSentTarget > 0 && ctx.FreeTry && typeof ctx.FreeTry.plan === "function" && everydayPool.length) {
      const byEn = new Map(everydayPool.map(s => [s.key, String(s.en || "").trim().toLowerCase()]));
      const ft = ctx.FreeTry.plan(everydayPool.filter(s => !usedKeys.has(s.key)), {
        now, srs, log,
        freq: ctx.freq || {},
        homework: hwSet,
        size: remSentTarget + 6,
        relaxFrom: Object.keys(srs).length < 30 ? 4 : 2,
        sweetShift: (diag.light || diag.batchNum >= 2) ? 0.65 : 0,
        wordKeyFor: ctx.wordKeyFor || null,
        boost: key =>
          (heardEns.has(byEn.get(key)) ? 3.5 : 0) +
          (chapPrefix && String(key).startsWith(chapPrefix) ? 2.6 : 0) +
          (/^md:/.test(key) ? 1.8 : 0) +
          (/^cls:/.test(key) ? 1.5 : 0) +
          (diag.batchNum >= 2 && srs[key] && srs[key].u ? 3.0 : 0)
      });
      pickedSents = (ft.list || []).filter(s => !usedKeys.has(s.key));
      if (!diag.allowNew || diag.batchNum >= 2) {
        const revFirst = pickedSents.filter(s => srs[s.key] && srs[s.key].u);
        const newRest = pickedSents.filter(s => !(srs[s.key] && srs[s.key].u));
        pickedSents = diag.allowNew ? revFirst.concat(newRest) : (revFirst.length ? revFirst : pickedSents);
      }
    }

    if (pickedSents.length < remSentTarget + 2) {
      const fallback = everydayPool
        .filter(s => !usedKeys.has(s.key) && !pickedSents.some(p => p.key === s.key))
        .map(s => ({
          s,
          sc: scoreCandidate(s, srs, now, hwSet, diag.allowNew, it =>
            (heardEns.has(String(it.en || "").trim().toLowerCase()) ? 4 : 0) +
            (chapPrefix && String(it.key || "").startsWith(chapPrefix) ? 2.5 : 0) +
            (/^md:/.test(it.key) ? 1.8 : 0), reviewBias)
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc)
        .map(x => x.s);
      pickedSents = pickedSents.concat(fallback);
    }

    // If review-only mode (e.g. Batch 3+) has fewer seen items than needed on a brand-new profile, allow fallback
    let addedRemSents = 0;
    for (const s of pickedSents) {
      if (addedRemSents >= remSentTarget) break;
      if (usedKeys.has(s.key)) continue;
      const seen = !!(srs[s.key] && srs[s.key].u);
      if (!seen && !canTakeNew(s)) continue;
      const why = heardEns.has(String(s.en || "").trim().toLowerCase()) ? "from commute"
        : isSlip(srs[s.key], now) ? "slip review"
        : isDue(srs[s.key], now) ? "due sentence"
        : seen ? "consolidation"
        : (s._try && s._try.why) ? s._try.why : "spoken core";
      addItem(s, "sentence", why);
      addedRemSents++;
    }
    // Safety fallback if brand-new learner had 0 seen sentences in Batch 2/3
    if (chosen.filter(x => x.kind === "sentence").length < Math.min(2, nSentTarget)) {
      for (const s of everydayPool) {
        if (chosen.filter(x => x.kind === "sentence").length >= nSentTarget) break;
        if (usedKeys.has(s.key)) continue;
        addItem(s, "sentence", "spoken core");
      }
    }

    // 2. Pick Grammar items — preferring patterns exercised by today's chosen sentences!
    const activeSentPatterns = new Set(chosen.map(x => x.pattern).filter(p => p && p !== "-"));
    const nGramTarget = Math.floor((diag.targets.grammarUnits + 0.01) / EFFORT.grammar);
    if (nGramTarget > 0 && (ctx.grammar || []).length) {
      const gramScored = ctx.grammar
        .filter(g => !usedKeys.has(g.key))
        .map(g => ({
          g,
          sc: scoreCandidate(
            g, srs, now, hwSet,
            diag.allowNew || diag.weakFrame === g.patId || activeSentPatterns.has(g.patId),
            it => (diag.weakFrame && it.patId === diag.weakFrame ? 4.5 : 0) +
                  (activeSentPatterns.has(it.patId) ? 3.5 : 0),
            reviewBias
          )
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc);
      const seenPat = new Set();
      for (const { g } of gramScored) {
        if (chosen.filter(x => x.kind === "grammar").length >= nGramTarget) break;
        if (effort + EFFORT.grammar > diag.budget + 0.5) break;
        if (seenPat.has(g.patId) && gramScored.length > nGramTarget) continue;
        seenPat.add(g.patId);
        const why = isSlip(srs[g.key], now) ? "grammar slip"
          : activeSentPatterns.has(g.patId) ? `rule in today's sentence: ${g.grammarName}`
          : (diag.weakFrame === g.patId ? `focus: ${g.grammarName}` : "grammar check");
        addItem(g, "grammar", why);
      }
    }

    // 3. Pick Qur'an Ayats by ear
    const nQuranTarget = Math.floor((diag.targets.quranUnits + 0.01) / EFFORT.quran);
    if (nQuranTarget > 0) {
      const qPool = (ctx.sentences || []).filter(s => s.track === "quran" && !usedKeys.has(s.key));
      const qScored = qPool
        .map(q => ({
          q,
          sc: scoreCandidate(q, srs, now, hwSet, diag.allowNew || SALAH_RE.test(q.key), it =>
            (SALAH_RE.test(it.key) ? 3.0 : 0) + (it.ref ? 1.0 : 0), reviewBias)
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc);
      for (const { q } of qScored) {
        if (chosen.filter(x => x.kind === "quran").length >= nQuranTarget) break;
        if (effort + EFFORT.quran > diag.budget + 0.5) break;
        const why = isSlip(srs[q.key], now) ? "ayah review" : isDue(srs[q.key], now) ? "due ayah" : (srs[q.key] && srs[q.key].u) ? "ayah consolidation" : "Qur'an by ear";
        addItem(q, "quran", why);
      }
    }

    // 3b. Lesson Cards (1.0 effort unit, max 1 per batch):
    //     · Proactive Teaching: unseen Lesson Card matching a grammar pattern, word, or active chapter in this batch
    //     · Spaced Review: seen Lesson Card whose SRS interval is due or slipped
    const lcRawPool = (ctx.lessonCards || []).filter(lc =>
      lc && lc.key && !usedKeys.has(lc.key) && !exclude.has(lc.key) && !(srs[lc.key] && srs[lc.key].b === "never")
    );
    if (lcRawPool.length && effort + EFFORT["lesson-card"] <= diag.budget + 0.01) {
      const chosenPatterns = new Set();
      chosen.forEach(x => {
        if (x.pattern && x.pattern !== "-") chosenPatterns.add(x.pattern);
        if (x.patId) chosenPatterns.add(x.patId);
      });
      const lcCandidates = [];
      lcRawPool.forEach(lc => {
        const c = srs[lc.key];
        const seen = !!(c && c.u);
        const trig = lc.triggers || {};
        const patHit = (trig.patterns || []).some(p => chosenPatterns.has(p));
        const wordHit = (trig.words || []).some(w => coveredNormWords.has(stripAr(w).replace(/^ال/, "")));
        const chapHit = !!(diag.activeChapNum && (trig.chapters || []).includes(diag.activeChapNum));
        const matchesBatch = patHit || wordHit || chapHit;

        if (seen && (isSlip(c, now) || isDue(c, now))) {
          const r = recallNow(c, now);
          const sc = (isSlip(c, now) ? 24 : 18) + (matchesBatch ? 5 : 0) + (1 - r) * 4;
          lcCandidates.push({ lc, sc, lcMode: "review", autoReveal: false, why: isSlip(c, now) ? "lesson card slip" : "lesson card review" });
        } else if (!seen && !diag.light && matchesBatch && (diag.batchNum <= 2 || patHit)) {
          const sc = 15 + (patHit ? 6 : 0) + (wordHit ? 3 : 0) + (chapHit ? 2 : 0);
          lcCandidates.push({ lc, sc, lcMode: "teach", autoReveal: true, why: "new lesson card — teach" });
        } else if (seen && diag.batchNum >= 2 && (c.box || 0) <= 1 && matchesBatch && (now - c.u > 2 * 3600000)) {
          lcCandidates.push({ lc, sc: 12, lcMode: "review", autoReveal: false, why: "lesson card consolidation" });
        }
      });
      lcCandidates.sort((a, b) => b.sc - a.sc);
      if (lcCandidates.length) {
        const best = lcCandidates[0];
        const copy = Object.assign({}, best.lc, { lcMode: best.lcMode, _autoReveal: best.autoReveal });
        addItem(copy, "lesson-card", best.why);
      }
    }

    // 4. Fill remaining effort budget with Vocabulary words (0.5 each)
    const wordPool = (ctx.words || []).filter(w => {
      if (usedKeys.has(w.key)) return false;
      const n = stripAr(w.ar).replace(/^ال/, "");
      return !coveredNormWords.has(n);
    });
    const wordScored = wordPool
      .map(w => ({
        w,
        sc: scoreCandidate(w, srs, now, hwSet, diag.allowNew, it =>
          (it.src === "teacher" ? 1.2 : it.src === "quran" ? 1.0 : 0.6), reviewBias)
      }))
      .filter(x => x.sc > -500)
      .sort((a, b) => b.sc - a.sc);

    const maxWords = Math.min(wordScored.length, Math.max(0, Math.round((diag.budget - effort) / EFFORT.word)));
    for (let i = 0; i < wordScored.length && effort + EFFORT.word <= diag.budget + 0.01; i++) {
      const w = wordScored[i].w;
      const c = srs[w.key];
      const seen = !!(c && c.u);
      if (!seen && !canTakeNew(w) && wordScored.slice(i + 1).some(x => srs[x.w.key] && srs[x.w.key].u)) continue;
      if (chosen.filter(x => x.kind === "word").length >= maxWords) break;
      const why = hwSet.has(w.key) ? "class vocab" : isSlip(c, now) ? "word slip" : isDue(c, now) ? "due word" : seen ? "word review" : "new word";
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

    // 5. Top up if effort is still short of budget
    if (effort < diag.budget - 0.4) {
      const extraSents = everydayPool.filter(s => !usedKeys.has(s.key)).sort((a, b) => {
        const sa = !!(srs[a.key] && srs[a.key].u), sb = !!(srs[b.key] && srs[b.key].u);
        return (sb ? 1 : 0) - (sa ? 1 : 0);
      });
      for (const s of extraSents) {
        if (effort + EFFORT.sentence > diag.budget + 0.5) break;
        const seen = !!(srs[s.key] && srs[s.key].u);
        addItem(s, "sentence", seen ? "consolidation" : "spoken core");
      }
    }

    // 6. Smooth interleaving (Teach-mode Lesson Cards go first so rule is taught before application!)
    const lcTeachPicked = chosen.filter(x => x.kind === "lesson-card" && x.lcMode === "teach");
    const lcReviewPicked = chosen.filter(x => x.kind === "lesson-card" && x.lcMode !== "teach");
    const wordsPicked = chosen.filter(x => x.kind === "word");
    const sentsPicked = chosen.filter(x => x.kind === "sentence");
    const gramPicked = chosen.filter(x => x.kind === "grammar");
    const quranPicked = chosen.filter(x => x.kind === "quran");
    const specials = [];
    const maxSp = Math.max(gramPicked.length, quranPicked.length, lcReviewPicked.length);
    for (let i = 0; i < maxSp; i++) {
      if (lcReviewPicked[i]) specials.push(lcReviewPicked[i]);
      if (gramPicked[i]) specials.push(gramPicked[i]);
      if (quranPicked[i]) specials.push(quranPicked[i]);
    }

    const ordered = [];
    lcTeachPicked.forEach(x => ordered.push(x));
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
      lessonCard: ordered.filter(x => x.kind === "lesson-card").length,
      quran: ordered.filter(x => x.kind === "quran").length
    };
    const reviewCount = ordered.filter(x => x._practice && !x._practice.isNew).length;
    const reviewPct = ordered.length ? Math.round((reviewCount / ordered.length) * 100) : 0;

    const parts = [];
    if (counts.lessonCard) parts.push(`${counts.lessonCard} lesson card`);
    if (counts.word) parts.push(`${counts.word} vocab`);
    if (counts.sentence) parts.push(`${counts.sentence} sentence${counts.sentence === 1 ? "" : "s"}`);
    if (counts.grammar) parts.push(`${counts.grammar} grammar`);
    if (counts.quran) parts.push(`${counts.quran} Qur'an`);

    const chapTag = diag.activeChapNum && diag.weeklyChapTotal
      ? `Ch ${diag.activeChapNum} weekly sentences: ${diag.weeklyChapSolid}/${diag.weeklyChapTotal} solid`
      : "";
    const batchRole = diag.light ? "lighter review round"
      : diag.batchNum === 1 ? "Daily Core + Weekly Sentences"
      : diag.batchNum === 2 ? `Review-Focused Mix (${reviewPct}% review)`
      : `Deep Review (${reviewPct}% review)`;

    const title = diag.light
      ? `⚡ Practice · Batch ${diag.batchNum} (Lighter Round)`
      : `⚡ Practice · Batch ${diag.batchNum} — ${diag.batchNum === 1 ? "Daily Core & Weekly Sentences" : diag.batchNum === 2 ? "Review-Focused Mix" : "Deep Review"}`;

    return {
      list: ordered,
      effort,
      budget: diag.budget,
      batchNum: diag.batchNum,
      reviewCount,
      reviewPct,
      counts,
      diag,
      pendingCommute: cd && !checked && heardEns.size ? { t: cd.t, n: heardEns.size } : null,
      title,
      summary: `${parts.join(" · ")} (= ${effort} units) · ${batchRole}${chapTag ? " · " + chapTag : ""}`
    };
  }

  /* Build a ready-to-paste 3–5 min AI Voice Session Brief tailored to the exact items practiced in this batch! */
  function buildSpeakingBrief(items, opts) {
    const o = opts || {};
    const srs = o.srs || {};
    const gramMap = o.grammarMap || {};
    const batchNum = o.batchNum || 1;
    const chapNum = o.activeChapNum || null;

    const sents = (items || []).filter(x => x && x.kind === "sentence");
    const words = (items || []).filter(x => x && x.kind === "word");
    const grams = (items || []).filter(x => x && x.kind === "grammar");
    const lcards = (items || []).filter(x => x && x.kind === "lesson-card");
    const ayahs = (items || []).filter(x => x && (x.kind === "quran" || x.track === "quran"));

    const slips = (items || []).filter(x => {
      const c = srs[x.key];
      return c && (c.g === "no" || c.g === "maybe" || c.b === "learning" || c.b === "weak");
    });

    // Collect grammar rules active in this batch
    const patIds = new Set();
    grams.forEach(g => { if (g.patId) patIds.add(g.patId); });
    sents.forEach(s => { if (s.pattern && s.pattern !== "-") patIds.add(s.pattern); });
    const ruleLines = [...patIds].map(pid => {
      const r = gramMap[pid];
      return r ? `- ${r.ar} (${r.shortName}): ${r.rule}` : null;
    }).filter(Boolean);
    lcards.forEach(lc => {
      if (lc && lc.lcCard) ruleLines.unshift(`- [Lesson Card: ${lc.lcCard.title}] ${lc.lcCard.summary}${lc.lcCard.trap ? " (" + lc.lcCard.trap + ")" : ""}`);
    });

    let p = `Role: You are Reza's warm, focused Modern Standard Arabic (MSA) speaking partner for a crisp 3–5 minute voice check-in.\n`;
    p += `Context: I just finished Practice Batch ${batchNum}${chapNum ? ` (advancing Chapter ${chapNum} weekly sentences)` : ""}. Drill ONLY the sentences, words, and grammar patterns below — stay strictly in clear vowelled MSA (الفُصْحَى), never regional dialect.\n\n`;

    if (sents.length) {
      p += `1. Target Spoken Sentences from This Batch (drill these + 1 natural variation each):\n`;
      sents.forEach((s, i) => {
        const c = srs[s.key];
        const tag = c && (c.g === "no" || c.g === "maybe") ? " [PRIORITY SLIP — practice twice!]" : "";
        p += `   ${i + 1}. ${s.ar} — "${s.en}"${tag}\n`;
      });
      p += `\n`;
    }

    if (words.length) {
      p += `2. Vocabulary Words to Weave Into Short Questions:\n`;
      words.forEach(w => {
        const c = srs[w.key];
        const tag = c && (c.g === "no" || c.g === "maybe") ? " [SLIP]" : "";
        p += `   - ${w.ar} (${w.en})${tag}\n`;
      });
      p += `\n`;
    }

    if (slips.length) {
      p += `3. Priority Slips Just Marked Shaky (make sure I say each cleanly before ending):\n`;
      slips.forEach(x => { p += `   - ${x.ar} — "${x.en}"\n`; });
      p += `\n`;
    }

    if (ruleLines.length) {
      p += `4. Grammar Rules Active in This Batch (test via live swaps, NOT lectures):\n`;
      ruleLines.forEach(l => { p += `   ${l}\n`; });
      p += `\n`;
    }

    if (ayahs.length) {
      p += `5. Qur'an Ear Anchor Reviewed Today (optional 1-question meaning check):\n`;
      ayahs.forEach(a => { p += `   - ${a.ar} — "${a.en}"${a.ref ? ` (${a.ref})` : ""}\n`; });
      p += `\n`;
    }

    p += `Strict Voice Mode Rules:\n`;
    p += `- Start with a warm 1-sentence greeting in MSA and ask your first prompt right away.\n`;
    p += `- Keep EVERY turn strictly 1–2 short sentences with full tashkeel. Ask ONE prompt, then PAUSE for me to speak.\n`;
    p += `- Test small variations: swap pronouns (I ↔ you ↔ we), tenses (present ↔ past ↔ negative: لَمْ أَذْهَبْ / مَا ذَهَبْتُ vs لَا أَذْهَبُ — never لَا + past!), or nouns.\n`;
    p += `- If I slip, model the clean Arabic once and ask me to repeat it once.\n`;
    p += `- When I say "I'm done" (or after ~4 minutes), close warmly and print:\n\n`;
    p += `=== AI VOICE SESSION REPORT ===\n`;
    p += `Lesson: Practice Batch ${batchNum}${chapNum ? ` (Chapter ${chapNum})` : ""}\n`;
    p += `Phrases Mastered: [sentences/variations I spoke cleanly]\n`;
    p += `Hesitations & Errors: [any slips or grammar mix-ups]\n`;
    p += `Words to Review: [Arabic words to reinforce next]\n`;
    p += `Next Recommended Focus: [1 sentence for my AI Coach]\n`;
    p += `===============================\n`;
    return p;
  }

  return { EFFORT, diagnose, buildGrammarPool, buildGrammarMap, buildBatch, buildSpeakingBrief, recallNow };
});
