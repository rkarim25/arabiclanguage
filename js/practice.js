/* ============================================================================
   PRACTICE — Unified Teach + Review, Capability Telemetry, Cross-Sync & Commute Engine (js/practice.js)

   Practice is Reza's primary workspace for learning and reviewing ALL streams:
     1. Teach + Review across all 5 streams: Vocabulary, Sentences, Lesson Cards,
        Grammar patterns, and Qur'an by ear (Mishary Rashid Alafasy).
        · Unseen items enter in TEACH mode (🆕 opened upfront with audio, breakdown,
          root/mnemonic & inline rule before rating or trying).
        · Seen items enter in REVIEW mode (active recall prompt → reveal → verdict).
     2. Granular Capability Telemetry (summarizeCapabilities): tracks what he CAN
        and CANNOT do across recognition, active spoken/written production, visual
        Lesson Card / grammar systems, Qur'an by ear, and screen-vs-commute balance.
     3. Automatic Bidirectional Cross-Sync (syncVerdict): every verdict in Screen
        Practice or Commute Practice automatically updates Chapters (index.html line
        pointer + chapter sentences + chapter vocab), Words, Sets, Grammar & Qur'an.
     4. Hands-Free Commute Twin (buildCommuteQueue) + Modality Compensation:
        · Commute Practice teaches & reviews active Chapter sentences, spoken Lesson
          Card rules, Alafasy Qur'an ayahs by ear, and due/weekly vocabulary.
        · Because commute sessions cannot show Arabic orthography, Lesson Card
          diagrams/tables, or typed/mic checks (and pocket items go ungraded),
          normal Screen Practice detects commute debt and automatically compensates:
          verifying ungraded commute items on screen + boosting visual Lesson Cards,
          grammar endings, and active production.
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

  /* Inspect commute vs screen history to detect unverified pocket items & modality gaps */
  function analyzeCommuteBalance(log, now) {
    const recent7d = (log || []).filter(x => x && x.t && x.t >= now - 7 * DAY);
    const commuteEvs7d = recent7d.filter(x => x.e === "commute-done");
    const screenEvs7d = recent7d.filter(x =>
      (x.e === "tryit-free-done" && x.kind === "myday") ||
      x.e === "practice-batch" ||
      x.e === "chap-test"
    );
    // Deduplicate screen sessions within 15 minutes so practice-batch + tryit-free-done count as 1 session
    const screenSessionTs = [];
    screenEvs7d.sort((a, b) => a.t - b.t).forEach(ev => {
      if (!screenSessionTs.length || ev.t - screenSessionTs[screenSessionTs.length - 1] > 15 * 60000) {
        screenSessionTs.push(ev.t);
      }
    });

    // Consecutive commute streak among recent sessions
    const sessionTimeline = []
      .concat(commuteEvs7d.map(x => ({ kind: "commute", t: x.t })))
      .concat(screenSessionTs.map(t => ({ kind: "screen", t })))
      .sort((a, b) => a.t - b.t);
    let commuteStreak = 0;
    for (let i = sessionTimeline.length - 1; i >= 0; i--) {
      if (sessionTimeline[i].kind === "commute") commuteStreak++;
      else break;
    }

    // Collect items heard passively on commutes in last 72h not yet checked on screen
    const checkedForTs = new Set(
      (log || []).filter(x => x && x.e === "commute-check-done" && x.forT).map(x => x.forT)
    );
    const screenVerdictAfter = new Map();
    (log || []).forEach(x => {
      if (!x || !x.t || !x.key) return;
      const isScreenVerdict =
        (x.e === "vocab-rate" && x.src !== "audio" && x.via !== "commute") ||
        (x.e === "sentence-rate" && x.src !== "audio" && x.via !== "commute") ||
        x.e === "sent-drill" ||
        x.e === "lesson-card-rate" ||
        (x.e === "bucket" && x.src !== "audio");
      if (isScreenVerdict) {
        const prev = screenVerdictAfter.get(x.key) || 0;
        if (x.t > prev) screenVerdictAfter.set(x.key, x.t);
      }
    });

    const unverifiedWords = new Set();
    const unverifiedSents = new Set();
    const unverifiedEns = new Set();
    const pendingForTs = [];

    (log || []).forEach(cd => {
      if (!cd || cd.e !== "commute-done" || !cd.t || now - cd.t > 72 * 3600000) return;
      if (checkedForTs.has(cd.t)) return;
      let hadAny = false;
      const wKeys = Array.isArray(cd.ungradedKeys) ? cd.ungradedKeys : (Array.isArray(cd.keys) ? cd.keys : []);
      wKeys.forEach(k => {
        if (k && (screenVerdictAfter.get(k) || 0) <= cd.t) {
          unverifiedWords.add(k);
          hadAny = true;
        }
      });
      const sKeys = Array.isArray(cd.ungradedSentKeys) ? cd.ungradedSentKeys : (Array.isArray(cd.sentKeys) ? cd.sentKeys : []);
      sKeys.forEach(k => {
        if (k && (screenVerdictAfter.get(k) || 0) <= cd.t) {
          unverifiedSents.add(k);
          hadAny = true;
        }
      });
      (cd.sentEns || []).forEach(en => {
        const clean = String(en || "").trim().toLowerCase();
        if (clean) {
          unverifiedEns.add(clean);
          hadAny = true;
        }
      });
      if (hadAny) pendingForTs.push(cd.t);
    });

    const commuteSessions7d = commuteEvs7d.length;
    const screenSessions7d = screenSessionTs.length;
    const commuteHeavy = commuteStreak >= 2 || (commuteSessions7d >= 2 && commuteSessions7d > screenSessions7d);
    const commuteDebt = commuteHeavy || unverifiedWords.size > 0 || unverifiedSents.size > 0 || unverifiedEns.size > 0;

    return {
      commuteSessions7d,
      screenSessions7d,
      commuteStreak,
      commuteHeavy,
      commuteDebt,
      unverifiedWords,
      unverifiedSents,
      unverifiedEns,
      pendingForTs
    };
  }

  /* Read telemetry + SRS + motivation + commute balance + batchNum to diagnose what the learner needs */
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
    const cb = analyzeCommuteBalance(log, now);

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

    // 5. Incremental Batch Review Ratio Policy
    const baseAllowNew = !light && recentPassRate >= 0.55 && wordSlips <= 18;
    const allowNew = batchNum >= 3 ? false : baseAllowNew;
    const maxNewItems = !baseAllowNew ? 0 : batchNum === 1 ? 6 : batchNum === 2 ? 2 : 0;
    const reviewTargetShare = light ? 1.0 : batchNum === 1 ? 0.55 : batchNum === 2 ? 0.78 : 0.95;

    const mode = comeback ? "comeback"
      : easyDay ? "light"
      : (cb.commuteHeavy && batchNum === 1) ? "commute-balance"
      : batchNum >= 3 ? "deep-review"
      : batchNum === 2 ? "review-plus"
      : (lastMood === "good" && recentPassRate >= 0.8) ? "surge"
      : "steady";

    // Compute dynamic target effort units per stream (including commute modality compensation!)
    let vocabUnits = 0;
    if (wordSlips >= 8 || hwWordsShaky >= 4) vocabUnits = light ? 2.0 : 3.5;
    else if (wordSlips >= 3 || wordDue >= 8 || hwWordsShaky >= 1 || cb.unverifiedWords.size >= 2) vocabUnits = light ? 1.5 : (batchNum >= 2 ? 2.5 : 2.0);
    else if (wordDue >= 1 || allowNew || batchNum >= 2 || cb.unverifiedWords.size >= 1) vocabUnits = batchNum >= 2 && wordDue >= 3 ? 2.0 : 1.0;
    else vocabUnits = 0;

    let grammarUnits = 0;
    if (light && grammarSlips === 0) {
      grammarUnits = 0;
    } else if (grammarSlips >= 2 || recentErrors >= 3 || (cb.commuteHeavy && (grammarSlips >= 1 || grammarDue >= 1))) {
      grammarUnits = light ? 1.0 : 2.0;
    } else if (cb.commuteHeavy && grammar.length) {
      // Commute cannot show Arabic vowel endings or tables — guarantee visual grammar check on screen!
      grammarUnits = 1.0;
    } else if (grammarSlips >= 1 || grammarDue >= 1 || weakFrame || (batchNum >= 2 && grammar.some(g => srs[g.key] && (srs[g.key].box || 0) <= 2))) {
      grammarUnits = 1.0;
    } else if (mode === "surge" && grammar.some(g => !srs[g.key])) {
      grammarUnits = 1.0;
    }

    let quranUnits = 0;
    if (quranToday >= 3 && quranDue === 0 && batchNum === 1) {
      quranUnits = 0;
    } else if (!light && earShare7d < 0.12 && !cb.commuteHeavy && quranPool.length >= 2 && budget >= 10 && batchNum === 1) {
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

    let commuteNote = "";
    if (cb.commuteDebt) {
      const unv = cb.unverifiedWords.size + Math.max(cb.unverifiedSents.size, cb.unverifiedEns.size);
      if (cb.commuteHeavy && unv > 0) {
        commuteNote = `Balancing ${cb.commuteStreak || cb.commuteSessions7d} commute session(s): verifying ${unv} pocket-heard item(s) + visual Lesson Card & script check`;
      } else if (cb.commuteHeavy) {
        commuteNote = `Balancing ${cb.commuteStreak || cb.commuteSessions7d} commute session(s): catching up on visual Lesson Cards, Arabic script & active Try It`;
      } else if (unv > 0) {
        commuteNote = `Checking ${unv} item(s) heard on your commute on screen`;
      }
    }

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
      commuteSessions7d: cb.commuteSessions7d,
      screenSessions7d: cb.screenSessions7d,
      commuteStreak: cb.commuteStreak,
      commuteHeavy: cb.commuteHeavy,
      commuteDebt: cb.commuteDebt,
      unverifiedCommuteWords: cb.unverifiedWords,
      unverifiedCommuteSents: cb.unverifiedSents,
      unverifiedCommuteEns: cb.unverifiedEns,
      pendingCommuteForTs: cb.pendingForTs,
      commuteNote,
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

  /* Compute real capability profile from SRS + telemetry (what Reza CAN and CANNOT do right now) */
  function summarizeCapabilities(ctx) {
    const now = ctx.now || Date.now();
    const srs = ctx.srs || {};
    const log = ctx.log || [];
    const words = ctx.words || [];
    const sentences = ctx.sentences || [];
    const grammar = ctx.grammar || [];
    const lessonCards = ctx.lessonCards || [];
    const activeChapNum = resolveActiveChapterNum(ctx);
    const cb = analyzeCommuteBalance(log, now);

    // 1. Vocabulary recognition
    let vocabHeld = 0, vocabLearning = 0, vocabSlips = 0, vocabSeen = 0;
    words.forEach(w => {
      const c = srs[w.key];
      if (!c || (!c.u && !c.box && !c.b)) return;
      if (c.b === "never") { vocabHeld++; vocabSeen++; return; }
      vocabSeen++;
      if ((c.box || 0) >= 3 || c.b === "know" || c.b === "strong") vocabHeld++;
      else if (isSlip(c, now)) vocabSlips++;
      else vocabLearning++;
    });

    // 2. Sentence recall vs proven active production (spoken/typed)
    const activeProvenKeys = new Set();
    const activeProvenEns = new Set();
    log.forEach(x => {
      if (!x) return;
      if (x.e === "sent-drill" && x.ok && (x.how === "mic" || x.how === "typed")) {
        if (x.key) activeProvenKeys.add(x.key);
        if (x.en) activeProvenEns.add(String(x.en).trim().toLowerCase());
      } else if (x.e === "prompt" && typeof x.score === "number" && x.score >= 0.7 && x.en) {
        activeProvenEns.add(String(x.en).trim().toLowerCase());
      }
    });

    const everydaySents = sentences.filter(s => s.track !== "quran" && s.kind !== "grammar" && s.kind !== "word");
    let sentHeld = 0, sentSlips = 0, sentPassiveOnly = 0, sentProvenActive = 0;
    everydaySents.forEach(s => {
      const c = srs[s.key];
      const enLow = String(s.en || "").trim().toLowerCase();
      const isAct = activeProvenKeys.has(s.key) || (enLow && activeProvenEns.has(enLow));
      if (isAct) sentProvenActive++;
      if (!c || (!c.u && !c.box)) return;
      if (c.b === "never" || (c.box || 0) >= 3) {
        sentHeld++;
        if (!isAct && c.b !== "never") sentPassiveOnly++;
      } else if (isSlip(c, now)) {
        sentSlips++;
      }
    });

    const chapPrefix = activeChapNum ? `chap:${activeChapNum}:` : null;
    const chapSents = chapPrefix ? everydaySents.filter(s => String(s.key || "").startsWith(chapPrefix)) : [];
    const chapSolid = chapSents.filter(s => ((srs[s.key] || {}).box || 0) >= 2 || (srs[s.key] || {}).b === "never").length;

    // 3. Lesson Cards & Grammar systems
    let lcHeld = 0, lcSeen = 0, lcSlips = 0;
    lessonCards.forEach(lc => {
      const c = srs[lc.key];
      if (!c || !c.u) return;
      lcSeen++;
      if ((c.box || 0) >= 2 || c.b === "never") lcHeld++;
      else if (isSlip(c, now)) lcSlips++;
    });

    const patMap = new Map();
    grammar.forEach(g => {
      if (!patMap.has(g.patId)) patMap.set(g.patId, { name: g.grammarName || g.patId, keys: [] });
      patMap.get(g.patId).keys.push(g.key);
    });
    let gramPatHeld = 0;
    const shakyPatterns = [];
    patMap.forEach((info) => {
      const allSolid = info.keys.length > 0 && info.keys.every(k => ((srs[k] || {}).box || 0) >= 2);
      const anySlip = info.keys.some(k => isSlip(srs[k], now));
      if (allSolid) gramPatHeld++;
      else if (anySlip) shakyPatterns.push(info.name);
    });

    // Top recurring error from error ledger in last 14d
    const errCounts = {};
    log.filter(x => x && x.t >= now - 14 * DAY && x.e === "sent-drill" && !x.ok && x.err).forEach(x => {
      errCounts[x.err] = (errCounts[x.err] || 0) + 1;
    });
    const topError = Object.keys(errCounts).sort((a, b) => errCounts[b] - errCounts[a])[0] || null;

    // 4. Qur'an by ear
    const quranSents = sentences.filter(s => s.track === "quran");
    const quranHeld = quranSents.filter(s => ((srs[s.key] || {}).box || 0) >= 3 || (srs[s.key] || {}).b === "never").length;
    const earChecks7d = log.filter(x => x && x.t >= now - 7 * DAY && (x.e === "alisten-grade" || x.e === "qlisten-test" || x.e === "qtest-done")).length;

    // Build honest "Can Do" vs "Focus / Cannot Yet Do" statements
    const canDo = [];
    const gaps = [];

    if (vocabHeld > 0) canDo.push(`Recognise ${vocabHeld} vocabulary words reliably (${vocabLearning} in active learning)`);
    if (sentProvenActive > 0) canDo.push(`Say or write ${sentProvenActive} Arabic sentences from English prompts`);
    else if (sentHeld > 0) canDo.push(`Recall ${sentHeld} sentences on recognition (${sentProvenActive} proven spoken/typed)`);
    if (lcHeld > 0) canDo.push(`Hold ${lcHeld}/${lessonCards.length} Lesson Card mental maps`);
    if (quranHeld > 0) canDo.push(`Recognise ${quranHeld} Qur'an ayahs (${earChecks7d} ear checks in 7d)`);

    if (vocabSlips > 0) gaps.push(`${vocabSlips} word slip(s) need reinforcement`);
    if (sentSlips > 0) gaps.push(`${sentSlips} sentence slip(s) marked shaky recently`);
    if (sentPassiveOnly >= 5) gaps.push(`${sentPassiveOnly} held sentences are passive-only — tap 🎯 Try it to prove spoken/written output`);
    if (lessonCards.length > lcSeen) gaps.push(`${lessonCards.length - lcSeen} Lesson Card(s) not yet taught — Practice queues them as concepts arise`);
    if (shakyPatterns.length) gaps.push(`Grammar slips in: ${shakyPatterns.slice(0, 3).join(", ")}`);
    if (cb.commuteDebt) {
      const unv = cb.unverifiedWords.size + Math.max(cb.unverifiedSents.size, cb.unverifiedEns.size);
      gaps.push(unv > 0
        ? `${unv} commute-heard item(s) need screen verification (script & vowels)`
        : `${cb.commuteStreak || cb.commuteSessions7d} recent commute session(s) — catching up on visual Lesson Cards & script`);
    }

    return {
      vocab: { held: vocabHeld, learning: vocabLearning, slips: vocabSlips, seen: vocabSeen, total: words.length },
      sentences: {
        held: sentHeld,
        provenActive: sentProvenActive,
        passiveOnly: sentPassiveOnly,
        slips: sentSlips,
        total: everydaySents.length,
        activeChapNum,
        activeChapSolid: chapSolid,
        activeChapTotal: chapSents.length
      },
      concepts: {
        lessonCardsHeld: lcHeld,
        lessonCardsSeen: lcSeen,
        lessonCardsSlips: lcSlips,
        lessonCardsTotal: lessonCards.length,
        grammarPatternsHeld: gramPatHeld,
        grammarPatternsTotal: patMap.size,
        shakyPatterns,
        topError
      },
      quran: {
        ayahsHeld: quranHeld,
        ayahsTotal: quranSents.length,
        earChecks7d
      },
      modality: {
        commuteSessions7d: cb.commuteSessions7d,
        screenSessions7d: cb.screenSessions7d,
        commuteStreak: cb.commuteStreak,
        commuteHeavy: cb.commuteHeavy,
        unverifiedCommuteCount: cb.unverifiedWords.size + Math.max(cb.unverifiedSents.size, cb.unverifiedEns.size)
      },
      canDo,
      gaps
    };
  }

  /* Automatic Bidirectional Cross-Sync:
     Every verdict in Screen Practice, Commute Practice, or Master Bank automatically updates:
       · Primary SRS key (chap:N:i, ev-*, qc:*, lc:*, gt:*, s:q:*)
       · Matching Chapter sentence key (chap:N:i) + active Chapter line pointer (ats-chap-line-chap-N)
       · Matching Chapter vocab raw Arabic key (srs[ar]) + tw:<norm> twin + constituent word keys
       · Grammar pattern completion (gtest-done) & Qur'an word keys (qw:*, qc:*) */
  function syncVerdict(opts) {
    const o = opts || {};
    const srsApi = o.srsApi || (typeof root !== "undefined" && root.SRS) || null;
    const getSrsFn = o.getSrs || (typeof root !== "undefined" && root.getSrs) || (() => ({}));
    const storeApi = o.store || (typeof root !== "undefined" && root.store) || null;
    const logFn = o.logEvent || (typeof root !== "undefined" && root.logEvent) || (() => {});
    const normFn = o.normalizeAr || (typeof root !== "undefined" && root.normalizeAr) || stripAr;
    const wordKeyFn = o.wordKeyFor || (typeof root !== "undefined" && root._wordKeyFor ? ar => root._wordKeyFor(normFn(ar).replace(/^ال/, "")) : null);
    const chapters = o.chapters || [];
    const item = o.item || {};
    const key = o.key || item.key;
    const g = o.grade || "yes";
    const via = o.via || "practice";
    const meta = o.meta || {};
    const now = o.now || Date.now();

    if (!key || !srsApi || typeof srsApi.rate !== "function") return null;

    const nc = o.alreadyRated ? (getSrsFn()[key] || { box: 0, s: 0 }) : srsApi.rate(key, g);
    const srsNow = getSrsFn();
    const syncedChapNums = new Set();
    const syncedWordKeys = [];

    const syncSingleWord = (arText, wGrade, explicitKey) => {
      if (!arText || wGrade === "retire") return;
      const norm = normFn(arText).replace(/^ال/, "");
      const canon = explicitKey || (wordKeyFn ? wordKeyFn(arText) : null);
      if (canon && canon !== key && !(srsNow[canon] && srsNow[canon].b === "never")) {
        srsApi.rate(canon, wGrade);
        syncedWordKeys.push(canon);
      }
      if (norm && srsNow["tw:" + norm] && !(srsNow["tw:" + norm].b === "never")) {
        srsApi.rate("tw:" + norm, wGrade);
      }
      // Sync raw Arabic word key if index.html Chapter Vocabulary rated this word directly
      if (srsNow[arText] && arText !== key && !(srsNow[arText].b === "never")) {
        srsApi.rate(arText, wGrade);
      }
    };

    const kind = item.kind || (
      /^lc:/.test(key) ? "lesson-card" :
      /^gt:/.test(key) ? "grammar" :
      (/^s:q:/.test(key) || item.track === "quran") ? "quran" :
      (/^(ev-|qc:|fam-|tw:)/.test(key)) ? "word" : "sentence"
    );

    if (kind === "word") {
      syncSingleWord(item.ar, g, key);
      if (!o.skipPrimaryLog) {
        logFn({ e: "vocab-rate", key, bucket: (srsApi.LEGACY_BUCKET && srsApi.LEGACY_BUCKET[g]) || g, g, s: nc.s, box: nc.box, ar: item.ar, en: item.en, src: item.wordSrc || via, via, t: now });
      }
    } else if (kind === "lesson-card") {
      if (!o.skipPrimaryLog) {
        logFn({ e: "lesson-card-rate", key, lcId: item.lcId || String(key).replace(/^lc:/, ""), g, s: nc.s, box: nc.box, via, t: now });
      }
    } else if (kind === "grammar") {
      if (!o.skipPrimaryLog) {
        logFn({ e: "bucket", key, b: srsApi.TO_LEGACY ? srsApi.TO_LEGACY[g] : g, g, s: nc.s, box: nc.box, src: "practice-grammar", via, t: now });
      }
      if ((g === "yes" || g === "solid") && Array.isArray(item.patTestKeys) && item.patTestKeys.length) {
        const after = getSrsFn();
        const passedN = item.patTestKeys.filter(tk => after[tk] && (after[tk].g === "yes" || after[tk].g === "solid" || (after[tk].box || 0) >= 2)).length;
        if (passedN === item.patTestKeys.length) {
          logFn({ e: "gtest-done", id: item.patId, score: passedN, total: item.patTestKeys.length, via, t: now });
        }
      }
    } else if (kind === "quran") {
      if ((g === "yes" || g === "solid") && !meta.variant) {
        (item.wordKeys || []).forEach(wk => {
          if ((/^qw:/.test(wk) || /^qc:/.test(wk)) && !(srsNow[wk] && srsNow[wk].b === "never")) {
            srsApi.rate(wk, "yes");
            syncedWordKeys.push(wk);
          }
        });
      }
      if (!o.skipPrimaryLog) {
        logFn({ e: "sentence-rate", key, bucket: (srsApi.LEGACY_BUCKET && srsApi.LEGACY_BUCKET[g]) || g, g, s: nc.s, box: nc.box, ar: item.ar, en: item.en, src: "quran", via, t: now });
      }
    } else {
      // Everyday / Chapter / Preply / MyDay sentence
      if ((g === "yes" || g === "solid") && !meta.variant) {
        (item.words || []).forEach(w => {
          const wAr = Array.isArray(w) ? w[0] : (w && w.ar);
          if (wAr) syncSingleWord(wAr, "yes", null);
        });
      }
      // Cross-sync identical Chapter sentence if rated via myday/phrases/commute, or direct chap:N:i
      const chapMatch = /^chap:(\d+):(\d+)$/.exec(key);
      if (chapMatch) {
        syncedChapNums.add(+chapMatch[1]);
      } else if (item.ar && chapters.length && !meta.variant && g !== "retire") {
        const targetNorm = stripAr(item.ar);
        chapters.forEach(c => {
          (c.sentences || []).forEach((cs, idx) => {
            if (stripAr(cs.ar) === targetNorm) {
              const ck = `chap:${c.num}:${idx}`;
              if (!(srsNow[ck] && srsNow[ck].b === "never")) {
                srsApi.rate(ck, g);
                syncedChapNums.add(c.num);
              }
            }
          });
        });
      }
      if (!o.skipPrimaryLog) {
        logFn({ e: "sentence-rate", key, bucket: (srsApi.LEGACY_BUCKET && srsApi.LEGACY_BUCKET[g]) || g, g, s: nc.s, box: nc.box, ar: item.ar, en: item.en, src: item.src || via, via, t: now });
      }
    }

    // Advance Chapter line pointer (`ats-chap-line-chap-<num>`) on store so index.html resumes at exact next unheld line!
    if (syncedChapNums.size && storeApi && typeof storeApi.set === "function") {
      const updatedSrs = getSrsFn();
      const log = typeof storeApi.get === "function" ? (storeApi.get("ats-log", []) || []) : [];
      syncedChapNums.forEach(cNum => {
        const chapId = `chap-${cNum}`;
        const chapObj = chapters.find(c => c.num === cNum);
        const totalLines = (chapObj && chapObj.sentences && chapObj.sentences.length) || 10;
        let nextUnheld = totalLines - 1;
        for (let i = 0; i < totalLines; i++) {
          const ck = `chap:${cNum}:${i}`;
          const card = updatedSrs[ck];
          const held = card && ((card.box || 0) >= 2 || card.b === "never");
          if (!held) { nextUnheld = i; break; }
        }
        storeApi.set(`ats-chap-line-${chapId}`, nextUnheld);
        const isMastered = log.some(x => x && x.e === "chap-test" && x.chap === chapId && (x.score >= 80 || x.pass === true));
        if (!isMastered) {
          const curSaved = typeof storeApi.get === "function" ? storeApi.get("ats-current-chap-id") : null;
          if (!curSaved || curSaved === chapId) {
            storeApi.set("ats-current-chap-id", chapId);
          }
        }
      });
    }

    return { nc, syncedChapNums: [...syncedChapNums], syncedWordKeys };
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

    const heardEns = diag.unverifiedCommuteEns;
    const unvSentKeys = diag.unverifiedCommuteSents;
    const unvWordKeys = diag.unverifiedCommuteWords;

    // Track passive-only held sentences so heavy commute streaks pull them for active Try It / script check
    const activeProvenKeys = new Set(
      log.filter(x => x && x.e === "sent-drill" && x.ok && (x.how === "mic" || x.how === "typed") && x.key).map(x => x.key)
    );

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

    const addItem = (base, kind, why, modeOverride) => {
      const eff = EFFORT[kind] || 1.0;
      const isNewItem = !(srs[base.key] && srs[base.key].u);
      if (isNewItem) newPickedCount++;
      const patRule = (kind === "sentence" && base.pattern && gramMap[base.pattern]) ? gramMap[base.pattern] : (base.grammarRule || null);
      const practiceMode = modeOverride || (isNewItem ? "teach" : "review");
      const autoReveal = typeof base._autoReveal === "boolean" ? base._autoReveal : (practiceMode === "teach");
      const copy = Object.assign({}, base, {
        kind,
        effort: eff,
        practiceMode,
        _autoReveal: autoReveal,
        grammarRule: patRule,
        _practice: { kind, effort: eff, why, isNew: isNewItem, practiceMode, batchNum: diag.batchNum }
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

    // 1a. Commute Compensation Step 1: verify up to 2 ungraded commute-heard sentences on screen!
    if ((unvSentKeys.size || heardEns.size) && !diag.light) {
      const commuteSents = everydayPool.filter(s =>
        unvSentKeys.has(s.key) || heardEns.has(String(s.en || "").trim().toLowerCase())
      );
      for (const cs of commuteSents.slice(0, Math.min(2, nSentTarget))) {
        if (usedKeys.has(cs.key)) continue;
        addItem(cs, "sentence", "commute check — verify on screen", "commute-verify");
      }
    }

    // 1b. Advance active weekly Chapter sentence lessons systematically!
    if (chapPrefix) {
      const chapCandidates = everydayPool
        .filter(s => !usedKeys.has(s.key) && String(s.key || "").startsWith(chapPrefix))
        .sort((a, b) => {
          const ia = +(String(a.key).split(":")[2] || 0);
          const ib = +(String(b.key).split(":")[2] || 0);
          const ca = srs[a.key], cb = srs[b.key];
          const slipA = isSlip(ca, now) ? 0 : (ca && ca.u && (ca.box || 0) < 2) ? 1 : (!ca || !ca.u) ? 2 : 3;
          const slipB = isSlip(cb, now) ? 0 : (cb && cb.u && (cb.box || 0) < 2) ? 1 : (!cb || !cb.u) ? 2 : 3;
          return slipA - slipB || ia - ib;
        });

      const maxChapSlots = diag.light ? 0 : diag.batchNum === 1 ? Math.min(2, Math.max(1, nSentTarget - chosen.filter(x => x.kind === "sentence").length)) : diag.batchNum === 2 ? 1 : 0;
      let chapAdded = 0;
      for (const cs of chapCandidates) {
        if (chapAdded >= maxChapSlots) break;
        const c = srs[cs.key];
        const seen = !!(c && c.u);
        if (seen && (c.box || 0) >= 3 && !isDue(c, now)) continue;
        if (!seen && !canTakeNew(cs)) continue;
        const why = seen ? `Ch ${diag.activeChapNum} review` : `new lesson · Ch ${diag.activeChapNum}`;
        addItem(cs, "sentence", why);
        chapAdded++;
      }
    }

    // 1c. Fill remaining sentence target via FreeTry + review-weighted fallback
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
          (unvSentKeys.has(key) || heardEns.has(byEn.get(key)) ? 4.5 : 0) +
          (diag.commuteHeavy && srs[key] && srs[key].u && !activeProvenKeys.has(key) ? 2.2 : 0) +
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
            (unvSentKeys.has(it.key) || heardEns.has(String(it.en || "").trim().toLowerCase()) ? 5 : 0) +
            (diag.commuteHeavy && srs[it.key] && srs[it.key].u && !activeProvenKeys.has(it.key) ? 2.2 : 0) +
            (chapPrefix && String(it.key || "").startsWith(chapPrefix) ? 2.5 : 0) +
            (/^md:/.test(it.key) ? 1.8 : 0), reviewBias)
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc)
        .map(x => x.s);
      pickedSents = pickedSents.concat(fallback);
    }

    let addedRemSents = 0;
    for (const s of pickedSents) {
      if (addedRemSents >= remSentTarget) break;
      if (usedKeys.has(s.key)) continue;
      const seen = !!(srs[s.key] && srs[s.key].u);
      if (!seen && !canTakeNew(s)) continue;
      const isCommuteUnv = unvSentKeys.has(s.key) || heardEns.has(String(s.en || "").trim().toLowerCase());
      const why = isCommuteUnv ? "commute check — verify on screen"
        : isSlip(srs[s.key], now) ? "slip review"
        : (diag.commuteHeavy && seen && !activeProvenKeys.has(s.key)) ? "script & production check"
        : isDue(srs[s.key], now) ? "due sentence"
        : seen ? "consolidation"
        : (s._try && s._try.why) ? s._try.why : "new sentence — teach";
      addItem(s, "sentence", why, isCommuteUnv ? "commute-verify" : undefined);
      addedRemSents++;
    }
    if (chosen.filter(x => x.kind === "sentence").length < Math.min(2, nSentTarget)) {
      for (const s of everydayPool) {
        if (chosen.filter(x => x.kind === "sentence").length >= nSentTarget) break;
        if (usedKeys.has(s.key)) continue;
        addItem(s, "sentence", (srs[s.key] && srs[s.key].u) ? "consolidation" : "new sentence — teach");
      }
    }

    // 2. Pick Grammar items — preferring patterns exercised by today's sentences + boosted after heavy commutes!
    const activeSentPatterns = new Set(chosen.map(x => x.pattern).filter(p => p && p !== "-"));
    const nGramTarget = Math.floor((diag.targets.grammarUnits + 0.01) / EFFORT.grammar);
    if (nGramTarget > 0 && (ctx.grammar || []).length) {
      const gramScored = ctx.grammar
        .filter(g => !usedKeys.has(g.key))
        .map(g => ({
          g,
          sc: scoreCandidate(
            g, srs, now, hwSet,
            diag.allowNew || diag.commuteHeavy || diag.weakFrame === g.patId || activeSentPatterns.has(g.patId),
            it => (diag.weakFrame && it.patId === diag.weakFrame ? 4.5 : 0) +
                  (activeSentPatterns.has(it.patId) ? 3.5 : 0) +
                  (diag.commuteHeavy ? 2.5 : 0),
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
          : diag.commuteHeavy ? `script & vowel check: ${g.grammarName}`
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
            (unvSentKeys.has(it.key) ? 5.0 : 0) +
            (SALAH_RE.test(it.key) ? 3.0 : 0) + (it.ref ? 1.0 : 0), reviewBias)
        }))
        .filter(x => x.sc > -500)
        .sort((a, b) => b.sc - a.sc);
      for (const { q } of qScored) {
        if (chosen.filter(x => x.kind === "quran").length >= nQuranTarget) break;
        if (effort + EFFORT.quran > diag.budget + 0.5) break;
        const isCommuteUnv = unvSentKeys.has(q.key);
        const why = isCommuteUnv ? "heard on commute — ayah check"
          : isSlip(srs[q.key], now) ? "ayah review"
          : isDue(srs[q.key], now) ? "due ayah"
          : (srs[q.key] && srs[q.key].u) ? "ayah consolidation"
          : "new ayah — Qur'an by ear";
        addItem(q, "quran", why, isCommuteUnv ? "commute-verify" : undefined);
      }
    }

    // 3b. Lesson Cards (1.0 effort unit, max 1 per batch — boosted when compensating for heavy commutes!)
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
          const sc = (isSlip(c, now) ? 24 : 18) + (matchesBatch ? 5 : 0) + (diag.commuteHeavy ? 4 : 0) + (1 - r) * 4;
          lcCandidates.push({ lc, sc, lcMode: "review", autoReveal: false, why: isSlip(c, now) ? "lesson card slip" : "lesson card review" });
        } else if (!seen && !diag.light && (matchesBatch || diag.commuteHeavy) && (diag.batchNum <= 2 || patHit || diag.commuteHeavy)) {
          const sc = 15 + (patHit ? 6 : 0) + (wordHit ? 3 : 0) + (chapHit ? 2 : 0) + (diag.commuteHeavy ? 5 : 0);
          const why = diag.commuteHeavy && !matchesBatch ? "visual lesson card — missed on commute" : "new lesson card — teach";
          lcCandidates.push({ lc, sc, lcMode: "teach", autoReveal: true, why });
        } else if (seen && (diag.batchNum >= 2 || diag.commuteHeavy) && (c.box || 0) <= 1 && (matchesBatch || diag.commuteHeavy) && (now - c.u > 2 * 3600000)) {
          lcCandidates.push({ lc, sc: 12 + (diag.commuteHeavy ? 4 : 0), lcMode: "review", autoReveal: false, why: diag.commuteHeavy ? "visual map check after commute" : "lesson card consolidation" });
        }
      });
      lcCandidates.sort((a, b) => b.sc - a.sc);
      if (lcCandidates.length) {
        const best = lcCandidates[0];
        const copy = Object.assign({}, best.lc, { lcMode: best.lcMode, _autoReveal: best.autoReveal });
        addItem(copy, "lesson-card", best.why, best.lcMode === "teach" ? "teach" : "review");
      }
    }

    // 4. Fill remaining effort budget with Vocabulary words (0.5 each — unverified commute words pulled first!)
    const wordPool = (ctx.words || []).filter(w => {
      if (usedKeys.has(w.key)) return false;
      if (unvWordKeys.has(w.key)) return true; // always allow explicit check of pocket-heard commute word
      const n = stripAr(w.ar).replace(/^ال/, "");
      return !coveredNormWords.has(n);
    });
    const wordScored = wordPool
      .map(w => ({
        w,
        sc: scoreCandidate(w, srs, now, hwSet, diag.allowNew || unvWordKeys.has(w.key), it =>
          (unvWordKeys.has(it.key) ? 8.0 : 0) +
          (it.src === "teacher" ? 1.2 : it.src === "quran" ? 1.0 : 0.6), reviewBias)
      }))
      .filter(x => x.sc > -500)
      .sort((a, b) => b.sc - a.sc);

    const maxWords = Math.min(wordScored.length, Math.max(0, Math.round((diag.budget - effort) / EFFORT.word)));
    for (let i = 0; i < wordScored.length && effort + EFFORT.word <= diag.budget + 0.01; i++) {
      const w = wordScored[i].w;
      const c = srs[w.key];
      const seen = !!(c && c.u);
      const isCommuteUnv = unvWordKeys.has(w.key);
      if (!seen && !isCommuteUnv && !canTakeNew(w) && wordScored.slice(i + 1).some(x => srs[x.w.key] && srs[x.w.key].u)) continue;
      if (chosen.filter(x => x.kind === "word").length >= maxWords) break;
      const why = isCommuteUnv ? "heard on commute — screen check"
        : hwSet.has(w.key) ? (seen ? "class vocab review" : "new class word — teach")
        : isSlip(c, now) ? "word slip"
        : isDue(c, now) ? "due word"
        : seen ? "word review"
        : "new word — teach";
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
      }, "word", why, isCommuteUnv ? "commute-verify" : undefined);
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
        addItem(s, "sentence", seen ? "consolidation" : "new sentence — teach");
      }
    }

    // 6. Smooth interleaving (Teach-mode Lesson Cards go at #1 so concept is taught before application!)
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
    const teachCount = ordered.filter(x => x.practiceMode === "teach").length;
    const reviewCount = ordered.length - teachCount;
    const reviewPct = ordered.length ? Math.round((reviewCount / ordered.length) * 100) : 0;

    const parts = [];
    if (counts.lessonCard) parts.push(`${counts.lessonCard} lesson card`);
    if (counts.word) parts.push(`${counts.word} vocab`);
    if (counts.sentence) parts.push(`${counts.sentence} sentence${counts.sentence === 1 ? "" : "s"}`);
    if (counts.grammar) parts.push(`${counts.grammar} grammar`);
    if (counts.quran) parts.push(`${counts.quran} Qur'an`);

    const chapTag = diag.activeChapNum && diag.weeklyChapTotal
      ? `Ch ${diag.activeChapNum}: ${diag.weeklyChapSolid}/${diag.weeklyChapTotal} solid`
      : "";
    const teachReviewTag = teachCount > 0 ? `${teachCount} teach · ${reviewCount} review` : `${reviewCount} review`;
    const batchRole = diag.light ? "lighter review round"
      : diag.batchNum === 1 ? `Daily Core (${teachReviewTag})`
      : diag.batchNum === 2 ? `Review-Focused Mix (${reviewPct}% review)`
      : `Deep Review (${reviewPct}% review)`;

    const title = diag.light
      ? `⚡ Practice · Batch ${diag.batchNum} (Lighter Round)`
      : diag.commuteHeavy && diag.batchNum === 1
      ? `⚡ Practice · Batch ${diag.batchNum} — Screen Catch-Up & Daily Core`
      : `⚡ Practice · Batch ${diag.batchNum} — ${diag.batchNum === 1 ? "Daily Core & Weekly Sentences" : diag.batchNum === 2 ? "Review-Focused Mix" : "Deep Review"}`;

    const capabilities = summarizeCapabilities(ctx);

    return {
      list: ordered,
      effort,
      budget: diag.budget,
      batchNum: diag.batchNum,
      teachCount,
      reviewCount,
      reviewPct,
      counts,
      diag,
      capabilities,
      pendingCommute: diag.pendingCommuteForTs.length
        ? { t: diag.pendingCommuteForTs[diag.pendingCommuteForTs.length - 1], forTs: diag.pendingCommuteForTs, n: ordered.filter(x => x.practiceMode === "commute-verify").length || 1 }
        : null,
      title,
      summary: `${parts.join(" · ")} (= ${effort} units) · ${batchRole}${chapTag ? " · " + chapTag : ""}${diag.commuteNote ? " · 🔄 " + diag.commuteNote : ""}`
    };
  }

  /* Build the hands-free Commute Practice queue (audio.html?commute=1):
     1. Proven Sunday script warm-up (kind: "script")
     2. 1 Spoken Lesson Card Golden Rule cue (kind: "rule") when relevant
     3. Active weekly Chapter sentences + Say-your-day sentences (kind: "say", tagged isNew for audio teach-first!)
     4. 1–2 Qur'an by Ear ayahs with Mishary Rashid Alafasy audio (kind: "quran")
     5. Due/weakest + up to 2 new weekly vocabulary words interleaved with sentences (kind: "word") */
  function buildCommuteQueue(ctx) {
    const now = ctx.now || Date.now();
    const srs = ctx.srs || {};
    const scriptLines = ctx.scriptLines || [];
    const activeChapNum = resolveActiveChapterNum(ctx);
    const chapPrefix = activeChapNum ? `chap:${activeChapNum}:` : null;
    const allSentences = ctx.sentences || [];
    const freeTrySents = ctx.freeTrySentences || [];
    const lessonCards = ctx.lessonCards || [];
    const words = ctx.words || [];
    const hwSet = ctx.homework instanceof Set ? ctx.homework : new Set(ctx.homework || []);

    const q = [];
    const usedSentKeys = new Set();
    const usedAr = new Set();

    // Part 1: Proven script warm-up
    scriptLines.forEach(s => {
      if (!s || !s.ar) return;
      usedAr.add(stripAr(s.ar));
      q.push({ kind: "script", key: s.key || null, sent: s, isNew: false });
    });

    // Gather active weekly Chapter sentences (up to 3: 1-2 review + 1-2 teach)
    const chapPicked = [];
    if (chapPrefix) {
      const chapPool = allSentences
        .filter(s => String(s.key || "").startsWith(chapPrefix) && !(srs[s.key] && srs[s.key].b === "never"))
        .sort((a, b) => {
          const ia = +(String(a.key).split(":")[2] || 0);
          const ib = +(String(b.key).split(":")[2] || 0);
          const ca = srs[a.key], cb = srs[b.key];
          const ra = isSlip(ca, now) ? 0 : (ca && ca.u && (ca.box || 0) < 2) ? 1 : (!ca || !ca.u) ? 2 : 3;
          const rb = isSlip(cb, now) ? 0 : (cb && cb.u && (cb.box || 0) < 2) ? 1 : (!cb || !cb.u) ? 2 : 3;
          return ra - rb || ia - ib;
        });
      let newChapCount = 0;
      for (const cs of chapPool) {
        if (chapPicked.length >= 3) break;
        if (usedAr.has(stripAr(cs.ar))) continue;
        const c = srs[cs.key];
        const seen = !!(c && c.u);
        if (seen && (c.box || 0) >= 3 && !isDue(c, now)) continue;
        if (!seen && newChapCount >= 2) continue;
        if (!seen) newChapCount++;
        chapPicked.push(Object.assign({}, cs, { isNew: !seen }));
        usedSentKeys.add(cs.key);
        usedAr.add(stripAr(cs.ar));
      }
    }

    // Merge with FreeTry Say-Your-Day sentences (up to 6 total spoken sentences)
    const sayList = chapPicked.slice();
    for (const fs of freeTrySents) {
      if (sayList.length >= 6) break;
      if (!fs || !fs.ar || usedSentKeys.has(fs.key) || usedAr.has(stripAr(fs.ar))) continue;
      const seen = !!(fs.key && srs[fs.key] && srs[fs.key].u);
      sayList.push(Object.assign({}, fs, { isNew: !seen }));
      if (fs.key) usedSentKeys.add(fs.key);
      usedAr.add(stripAr(fs.ar));
    }

    // Part 2: 1 Spoken Lesson Card Golden Rule cue matching active chapter or today's sentences
    const sayPatterns = new Set(sayList.map(s => s.pattern).filter(p => p && p !== "-"));
    const lcMatch = lessonCards.find(lc => {
      if (!lc || (srs[lc.key] && srs[lc.key].b === "never")) return false;
      const c = srs[lc.key];
      if (c && (c.box || 0) >= 3 && !isDue(c, now)) return false;
      const trig = lc.triggers || {};
      return (trig.patterns || []).some(p => sayPatterns.has(p)) || (activeChapNum && (trig.chapters || []).includes(activeChapNum));
    });
    if (lcMatch) {
      const card = lcMatch.lcCard || lcMatch;
      const cleanSummary = String(card.audioCue || card.summary || lcMatch.note || "")
        .replace(/[\u0600-\u06FF]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
      q.push({
        kind: "rule",
        key: lcMatch.key,
        title: card.title || lcMatch.title || "Lesson Card Rule",
        enCue: cleanSummary,
        arModel: lcMatch.speakAr || lcMatch.ar || "",
        enModel: lcMatch.en || "",
        lcCard: card,
        isNew: !(srs[lcMatch.key] && srs[lcMatch.key].u)
      });
    }

    // Part 3: Active Chapter + Say-Your-Day sentences
    sayList.forEach(s => {
      q.push({
        kind: "say",
        key: s.key || null,
        sent: s,
        isNew: !!s.isNew
      });
    });

    // Part 4: 1–2 Qur'an by Ear ayahs (Mishary Rashid Alafasy recitation)
    const quranPool = allSentences
      .filter(s => s.track === "quran" && s.ref && !(srs[s.key] && srs[s.key].b === "never"))
      .map(qItem => ({
        qItem,
        sc: scoreCandidate(qItem, srs, now, hwSet, true, it => (SALAH_RE.test(it.key) ? 3.5 : 1.0), 1.2)
      }))
      .sort((a, b) => b.sc - a.sc);
    quranPool.slice(0, 2).forEach(({ qItem }) => {
      const seen = !!(srs[qItem.key] && srs[qItem.key].u);
      q.push({
        kind: "quran",
        key: qItem.key,
        sent: qItem,
        ref: qItem.ref,
        isNew: !seen
      });
    });

    // Part 5: Vocabulary words (due/weakest + up to 2 unseen class/chapter words taught audio-first), interleaved with sentences
    const wordCandidates = [];
    let newWordCount = 0;
    words.forEach(w => {
      if (!w || !w.key || !w.ar || !w.en) return;
      const c = srs[w.key];
      if (c && c.b === "never") return;
      const seen = !!(c && c.u);
      if (!seen && !hwSet.has(w.key) && w.src !== "teacher") return;
      const sc = scoreCandidate(w, srs, now, hwSet, true, it => (it.src === "teacher" ? 2.0 : 0.5), 1.1);
      wordCandidates.push({ w, seen, sc });
    });
    wordCandidates.sort((a, b) => b.sc - a.sc);
    const pickedWords = [];
    for (const cand of wordCandidates) {
      if (pickedWords.length >= 16) break;
      if (!cand.seen) {
        if (newWordCount >= 2) continue;
        newWordCount++;
      }
      pickedWords.push(Object.assign({}, cand.w, { isNew: !cand.seen }));
    }

    pickedWords.forEach((w, i) => {
      q.push({ kind: "word", key: w.key, word: w, isNew: !!w.isNew });
      if ((i + 1) % 3 === 0 && sayList.length) {
        const s = sayList[Math.floor(i / 3) % sayList.length];
        q.push({ kind: "sent", key: s.key || null, sent: s, isNew: false });
      }
    });

    return q;
  }

  /* Build a ready-to-paste 3–5 min AI Voice Session Brief tailored to the exact items practiced in this batch */
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
        const tag = c && (c.g === "no" || c.g === "maybe") ? " [PRIORITY SLIP — practice twice!]" : (s.practiceMode === "teach" ? " [NEW TODAY]" : "");
        p += `   ${i + 1}. ${s.ar} — "${s.en}"${tag}\n`;
      });
      p += `\n`;
    }

    if (words.length) {
      p += `2. Vocabulary Words to Weave Into Short Questions:\n`;
      words.forEach(w => {
        const c = srs[w.key];
        const tag = c && (c.g === "no" || c.g === "maybe") ? " [SLIP]" : (w.practiceMode === "teach" ? " [NEW]" : "");
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

  return {
    EFFORT,
    diagnose,
    analyzeCommuteBalance,
    summarizeCapabilities,
    syncVerdict,
    buildGrammarPool,
    buildGrammarMap,
    buildBatch,
    buildCommuteQueue,
    buildSpeakingBrief,
    recallNow
  };
});
