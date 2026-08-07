/* ============================================================================
   progress-model.js — the ONE copy of the progress/retention maths.
   Loaded by the site (index.html chart) AND require()'d by scripts/gen-progress.js
   and scripts/test-progress-model.js. If the maths must change, it changes HERE,
   nowhere else — the chart, the nightly JSON and the email PNG all read it.

   THE CONCEPT (Reza's sketch, 2026-08-06): a goal is a basket of items, each
   with a memory strength that DECAYS between reviews. The tracked quantity is
   "expected fraction of the basket recallable right now" — it rises when he
   studies and sags when he doesn't, exactly like his drawing. "Done" is defined
   as holding ≥ RECALL_TARGET (90%) of the basket on any given day, because with
   human memory 100%-forever is not a real state; the last 10% is maintenance.

   RETENTION MODEL: after a successful review in Leitner box b, recall
   probability decays as p(t) = 2^(−elapsed / halflife(b)), with
   halflife(b) = max(H0, BOX_DAYS[b] × K) days. This is the standard
   exponential-forgetting model; the box interval is the site's own schedule.

   CALIBRATION (fitted 2026-08-06 from Reza's real log: 242 graded answers,
   146 re-encounters — scripts/test-progress-model.js reprints the fit):
     · H0 = 1.0 day     — his box-0 cards measured 16/32 = 50% correct at a
                          1-day gap: a fresh/lapsed word literally halves in a
                          day. This parameter his data pins exactly.
     · K  = 5           — box 1–3 accuracy (91%/90%/100%) says K ≥ ~4 but his
                          gaps are still too short to pin the ceiling (the ML
                          fit runs to the boundary). K=5 ≈ the Leitner design
                          target of ~87% recall at the moment a card comes due.
                          The nightly coach should refit yearly as gaps grow.
     · P_NEW = 0.74     — measured first-encounter success (84/113).
     · ANSWERS_PER_MIN = 1.6 — graded answers per ACTIVE minute, measured over
                          his whole usage (reading/listening overhead included,
                          so simulations inherit his real behaviour, not an
                          idealised drill rate).
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ProgressModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DAY = 86400000;
  const BOX_DAYS = [0, 1, 3, 7, 14, 30];
  const CAL = { H0: 1.0, K: 5, P_NEW: 0.74, ANSWERS_PER_MIN: 1.6, RECALL_TARGET: 0.9 };

  const halflife = box => Math.max(CAL.H0, (BOX_DAYS[box] || 0) * CAL.K) * DAY;
  /* Recall probability of one card at time t. Retired ("never" bucket) = the
     learner's explicit "I know this permanently" (loanwords etc.) → 1. */
  function recallP(card, t) {
    if (!card) return 0;
    if (card.retired) return 1;
    const dt = Math.max(0, t - card.last);
    return Math.pow(2, -dt / halflife(card.box));
  }

  /* ---- the graded-event stream: every log event that changes a card ----
     Mirrors the site's writers: sheet checks, Review grades, Audio-Coach
     self-verdicts, Quran word-fills (key rebuilt from surah/ref/w), rescue
     misses, bucket taps, tap-to-learn seeds. Events without a card key
     (quiz/gfill/dict/trans/speak/spract) don't touch SRS and are excluded —
     same as on the site. */
  /* qrefIndex maps "<surahId>:<ayahRef>" → verse INDEX, because qfill events log
     the ayah ref ("1:7") but the site's qw: keys use the 0-based verse index
     (gradeCard(`qw:${s.id}:${vi}:${wi}`) in quran.html). Build it from
     verses.json via buildQrefIndex(); without it qfill grades would land on
     wrong keys (off by one on every surah). */
  function buildQrefIndex(versesData) {
    const idx = {};
    for (const s of (versesData && versesData.surahs) || []) {
      s.verses.forEach((v, vi) => { idx[s.id + ":" + v.ref] = vi; });
    }
    return idx;
  }
  function gradedStream(log, qrefIndex) {
    const out = [];
    for (const e of log || []) {
      if (!e || !e.t || e.t < 16e11) continue; // drops the corrupt t:1 events
      if (e.e === "sheet" && e.key) out.push({ t: e.t, key: e.key, kind: "grade", ok: !!e.ok });
      else if (e.e === "review" && e.card) out.push({ t: e.t, key: e.card, kind: "grade", ok: e.g !== "again" });
      else if (e.e === "alisten-grade" && e.key) out.push({ t: e.t, key: e.key, kind: "grade", ok: !!e.ok });
      else if (e.e === "qfill" && e.surah && e.ref && e.w !== undefined) {
        const vi = qrefIndex && qrefIndex[e.surah + ":" + e.ref] !== undefined
          ? qrefIndex[e.surah + ":" + e.ref]
          : String(e.ref).split(":")[1]; // fallback: ayah number (close, not exact)
        out.push({ t: e.t, key: "qw:" + e.surah + ":" + vi + ":" + e.w, kind: "grade", ok: !!e.ok });
      } else if (e.e === "rescue" && e.key) out.push({ t: e.t, key: e.key, kind: "grade", ok: false });
      else if (e.e === "bucket" && e.key) out.push({ t: e.t, key: e.key, kind: "bucket", b: e.b });
      else if ((e.e === "tap-learn" || e.e === "tapseed") && e.key) out.push({ t: e.t, key: e.key, kind: "seed" });
    }
    return out.sort((a, b) => a.t - b.t);
  }

  /* Replay the stream through the site's own SRS rules → card states at uptoT.
     Same transitions as gradeCard()/setBucket() in app.js. */
  function applyEvent(cards, s) {
    if (s.kind === "seed") { if (!cards[s.key]) cards[s.key] = { box: 0, last: s.t }; return; }
    if (s.kind === "bucket") {
      if (s.b === "never") cards[s.key] = { box: 5, last: s.t, retired: true };
      else {
        const box = { know: 5, later: 3, repeat: 0 }[s.b];
        if (box !== undefined) cards[s.key] = { box, last: s.t };
      }
      return;
    }
    const c = cards[s.key];
    if (c && c.retired && s.ok) return;             // correct on retired: stays retired
    const box = s.ok ? Math.min((c && !c.retired ? c.box : 0) + 1, 5) : 0;
    cards[s.key] = { box, last: s.t };              // a real miss un-retires (site rule)
  }
  function replay(log, uptoT, qrefIndex) {
    const cards = {};
    for (const s of gradedStream(log, qrefIndex)) { if (uptoT && s.t > uptoT) break; applyEvent(cards, s); }
    return cards;
  }

  /* Expected recallable items over a basket (array of keys) at time t.
     Unseen keys contribute 0 — distance not yet covered. */
  function recallMass(cards, basket, t) {
    let m = 0;
    for (const k of basket) m += recallP(cards[k], t);
    return m;
  }

  /* Reality series: one point per local day — his sketch's solid line.
     Evaluated at END of each local day so a study session shows that day. */
  function realitySeries(log, basket, fromT, toT, qrefIndex) {
    const stream = gradedStream(log, qrefIndex);
    const cards = {};
    let i = 0;
    const out = [];
    const dayEnd = t => { const d = new Date(t); d.setHours(23, 59, 59, 999); return d.getTime(); };
    for (let t = dayEnd(fromT); t <= dayEnd(toT); t += DAY) {
      while (i < stream.length && stream[i].t <= t) applyEvent(cards, stream[i++]);
      out.push({ d: new Date(t).toISOString().slice(0, 10), mass: Math.round(recallMass(cards, basket, t) * 100) / 100 });
    }
    return out;
  }

  /* ---- forward simulation: the dotted fan ----
     Expected-value dynamics of the site's own scheduler. Each card is a set of
     weighted components {box,last,w} (a review splits into success/fail mass —
     exactly the expectation over outcomes, no randomness, fully reproducible).
     Policy per simulated day, same as the site steers him: due reviews first
     (most overdue first), remaining answer-budget introduces new basket words.
     Budget = ANSWERS_PER_MIN × that day's minutes. */
  function simulate(cardsToday, basket, weeklyMinutes, horizonDays, startT) {
    const t0 = startT;
    const comps = {};                                // key -> [{box,last,w}]
    const inBasket = new Set(basket);
    let retiredMass = 0;
    for (const k of basket) {
      const c = cardsToday[k];
      if (!c) continue;
      if (c.retired) { retiredMass += 1; continue; }
      comps[k] = [{ box: c.box, last: c.last, w: 1 }];
    }
    const unseen = basket.filter(k => !cardsToday[k]);
    let unseenIdx = 0;
    const series = [];
    let completionD = null;
    for (let day = 1; day <= horizonDays; day++) {
      const t = t0 + day * DAY;
      let budget = CAL.ANSWERS_PER_MIN * (weeklyMinutes[new Date(t).getDay()] || 0);
      if (budget > 0) {
        // collect due component-mass, most overdue first
        const due = [];
        for (const k in comps) for (const c of comps[k]) {
          const dueT = c.last + (BOX_DAYS[c.box] || 0) * DAY;
          if (dueT <= t && c.w > 1e-4) due.push({ k, c, over: t - dueT });
        }
        due.sort((a, b) => b.over - a.over);
        for (const { k, c } of due) {
          if (budget <= 0) break;
          const spend = Math.min(c.w, budget);
          budget -= spend;
          const p = recallP({ box: c.box, last: c.last }, t);
          const list = comps[k];
          c.w -= spend;
          list.push({ box: Math.min(c.box + 1, 5), last: t, w: spend * p });
          list.push({ box: 0, last: t, w: spend * (1 - p) });
        }
        // introduce new words with what's left
        while (budget >= 1 && unseenIdx < unseen.length) {
          budget -= 1;
          comps[unseen[unseenIdx++]] = [
            { box: 1, last: t, w: CAL.P_NEW },
            { box: 0, last: t, w: 1 - CAL.P_NEW },
          ];
        }
        // merge components per card by box (weighted-average last) — keeps ≤6/card
        for (const k in comps) {
          const byBox = {};
          for (const c of comps[k]) {
            if (c.w < 1e-6) continue;
            const b = byBox[c.box];
            if (b) { b.last = (b.last * b.w + c.last * c.w) / (b.w + c.w); b.w += c.w; }
            else byBox[c.box] = { box: c.box, last: c.last, w: c.w };
          }
          comps[k] = Object.values(byBox);
        }
      }
      let mass = retiredMass;
      for (const k in comps) for (const c of comps[k]) mass += c.w * recallP({ box: c.box, last: c.last }, t);
      const dISO = new Date(t).toISOString().slice(0, 10);
      series.push({ d: dISO, mass: Math.round(mass * 100) / 100 });
      if (!completionD && mass >= CAL.RECALL_TARGET * basket.length) completionD = dISO;
    }
    return { series, completion: completionD };
  }

  /* Live "right now" point from an actual SRS blob (the site's ats-srs):
     entries are {box,due,b,u} — u is the last touch. */
  function massFromSrs(srs, basket, t) {
    let m = 0;
    for (const k of basket) {
      const e = srs[k];
      if (!e) continue;
      m += recallP({ box: e.box, last: e.u || 0, retired: e.b === "never" }, t);
    }
    return Math.round(m * 100) / 100;
  }

  /* ============================================================
     SKILLS EXTRAPOLATION — listening & speaking, CONSERVATIVE
     (his 2026-08-07 ask: "extrapolate real listening comprehension
     and spoken ability … with a conservative bias, don't overshoot")

     Principle: nothing is credited at full value unless a TEST proved
     it in that modality. Everything else is discounted through Beta
     posteriors that start pessimistic and only rise as evidence
     accumulates. Anchors from the literature, applied as CEILINGS:

     · Screen-knowledge ≠ ear-knowledge. A word he can read is only
       partially recognizable in audio (L2 listeners routinely fail to
       hear words they "know" — Goh 2000; Field 2008). Prior on
       P(ear|screen): Beta(2,3), mean 0.40. His ear-test pairs update
       it; self-graded Audio-Coach ✓s count at HALF weight (self-
       grading flatters); the posterior is CAPPED at 0.80 — only
       cold-listen style tests can take a word above that, and they do
       it per-word, not through this factor.
     · Isolated word ≠ connected speech. Segmentation losses in a
       recitation/speech stream are severe. Prior on the connected
       discount: Beta(2,3) (mean 0.40), updated by dictation and
       sentence-level ear results, capped at 0.85.
     · Word-catch ≠ comprehension. Lexical coverage maps to passage
       comprehension NON-linearly (van Zeeland & Schmitt 2013;
       Nation 2006): ≈95% coverage → adequate (~70%); 90% → ~50%;
       80% → ~25%; below that it collapses. Piecewise-linear on those
       anchor points, and we never report above the curve.
     · Receptive ≠ productive. Producing a word is harder than
       recognizing it (Laufer 1998; Webb 2008: productive ≈ 50–80% of
       receptive — we take the BOTTOM). Unproven words enter speaking
       at ≤0.35 of their recall mass; whole phrases at 0.3 (memorised
       chunks deploy a little better than isolated words).
     · Fluency needs output hours (DeKeyser's skill acquisition):
       the speaking estimate is CAPPED by logged speaking time —
       readiness can never exceed minutes/TARGET_MIN regardless of
       vocabulary. No shortcut exists and the model says so.
     ============================================================ */
  const SKILL_CAL = {
    EAR_PRIOR_A: 2, EAR_PRIOR_B: 3, EAR_CAP: 0.80, SELF_GRADE_W: 0.5,
    CONN_PRIOR_A: 2, CONN_PRIOR_B: 3, CONN_CAP: 0.85,
    // coverage→comprehension anchor points (x = token coverage, y = comprehension)
    COMPREHENSION_CURVE: [[0, 0], [0.5, 0.05], [0.8, 0.25], [0.9, 0.5], [0.95, 0.7], [1, 0.85]],
    PRODUCTIVE_WORD: 0.35, PRODUCTIVE_PHRASE: 0.3,
    SPEAK_OK: 0.6,             // ASR shadow score that counts as "proven out loud"
    OUTPUT_TARGET_MIN: 600,    // ~10h of real output before the hours-gate stops binding
    EAR_STALE_D: 45,           // an ear result older than this decays like any memory
  };
  const betaMean = (a, b) => a / (a + b);

  /* Every by-ear judgment in the log, per key: ears-mode sheet answers (typed,
     objective) and Audio-Coach self-verdicts (down-weighted). */
  function earEvidence(log) {
    const byKey = {};
    for (const e of log || []) {
      if (!e || !e.t || e.t < 16e11) continue;
      let w = 0, ok = false, key = e.key;
      if (e.e === "sheet" && e.mode === "ears" && key) { w = 1; ok = !!e.ok || !!e.heard; }
      else if (e.e === "alisten-grade" && key) { w = SKILL_CAL.SELF_GRADE_W; ok = !!e.ok; }
      else if (e.e === "qlisten-test" && key) { w = 1.2; ok = !!e.ok; } // a real cold test
      else continue;
      (byKey[key] = byKey[key] || []).push({ t: e.t, ok, w });
    }
    return byKey;
  }

  /* P(recognize by ear | knows on screen), from pairs where both exist. */
  function earFactor(log, cards, t) {
    let a = SKILL_CAL.EAR_PRIOR_A, b = SKILL_CAL.EAR_PRIOR_B;
    const ev = earEvidence(log);
    for (const k in ev) {
      if (!cards[k]) continue;                    // ear-tested but never screen-known: not a pair
      for (const o of ev[k]) { if (o.ok) a += o.w; else b += o.w; }
    }
    return { p: Math.min(SKILL_CAL.EAR_CAP, betaMean(a, b)), n: a + b - SKILL_CAL.EAR_PRIOR_A - SKILL_CAL.EAR_PRIOR_B };
  }

  /* Connected-speech discount from sentence-level evidence: dictation results
     and sentence-round self-verdicts vs word-level ear success. */
  function connectedFactor(log) {
    let a = SKILL_CAL.CONN_PRIOR_A, b = SKILL_CAL.CONN_PRIOR_B;
    for (const e of log || []) {
      if (!e || !e.t || e.t < 16e11) continue;
      if (e.e === "dict") { if (e.ok) a += 1; else b += 1; }
      else if (e.e === "alisten-sent") { a += SKILL_CAL.SELF_GRADE_W * 0.5; } // completing a round is weak positive evidence
      else if (e.e === "qlisten-test" && e.score !== undefined) { a += e.score >= 0.85 ? 1.5 : 0; b += e.score < 0.85 ? 1 : 0; }
    }
    return { p: Math.min(SKILL_CAL.CONN_CAP, betaMean(a, b)), n: a + b - SKILL_CAL.CONN_PRIOR_A - SKILL_CAL.CONN_PRIOR_B };
  }

  function comprehensionAt(coverage) {
    const C = SKILL_CAL.COMPREHENSION_CURVE;
    for (let i = 1; i < C.length; i++) {
      if (coverage <= C[i][0]) {
        const [x0, y0] = C[i - 1], [x1, y1] = C[i];
        return y0 + (coverage - x0) / (x1 - x0) * (y1 - y0);
      }
    }
    return C[C.length - 1][1];
  }

  /* Per-word ear recall at t: certified words use their own ear history
     (decayed like memory); the rest use screen recall × the global ear factor. */
  function earRecallP(key, cards, ev, ef, t) {
    const c = cards[key];
    if (!c) return 0;
    const screen = recallP(c, t);
    const hist = ev[key];
    if (hist && hist.length) {
      const lastOk = [...hist].reverse().find(o => o.ok);
      const lastAny = hist[hist.length - 1];
      if (lastAny && !lastAny.ok) return Math.min(screen, 0.25); // last ear attempt FAILED — near floor
      if (lastOk) {
        // proven by ear: decays from 1 with the same forgetting curve, floored by the discounted path
        const p = Math.pow(2, -Math.max(0, t - lastOk.t) / halflife(Math.max(c.box, 2)));
        return Math.min(screen, Math.max(p, screen * ef));
      }
    }
    return screen * ef; // never ear-tested: discounted
  }

  /* LISTENING for a token basket (e.g. the salah surahs word-by-word):
     token coverage by ear → comprehension through the curve. */
  function listeningEstimate(log, cards, tokenBasket, t) {
    const ev = earEvidence(log);
    const ef = earFactor(log, cards, t);
    const cf = connectedFactor(log);
    let isolated = 0;
    let certified = 0;
    for (const k of tokenBasket) {
      const p = earRecallP(k, cards, ev, ef.p, t);
      isolated += p;
      if (ev[k] && ev[k].some(o => o.ok) && t - ev[k][ev[k].length - 1].t < SKILL_CAL.EAR_STALE_D * DAY) certified++;
    }
    const n = tokenBasket.length || 1;
    const isolatedCov = isolated / n;
    const connectedCov = isolatedCov * cf.p;
    return {
      earFactor: Math.round(ef.p * 100) / 100, earEvidenceN: Math.round(ef.n * 10) / 10,
      connFactor: Math.round(cf.p * 100) / 100,
      certifiedWords: certified, basketSize: n,
      isolatedCov: Math.round(isolatedCov * 1000) / 1000,   // words you'd get played ALONE
      connectedCov: Math.round(connectedCov * 1000) / 1000, // words you'd catch IN the stream
      comprehension: Math.round(comprehensionAt(connectedCov) * 1000) / 1000,
    };
  }

  /* SPEAKING: only production events prove it; unproven knowledge is floored. */
  function speakingEstimate(log, cards, wordBasket, phraseBasket, t) {
    const provenKeys = new Set();
    let outputMin = 0;
    for (const e of log || []) {
      if (!e || !e.t || e.t < 16e11) continue;
      if (e.e === "speak") { outputMin += 0.5; if ((e.score ?? e.sim ?? 0) >= SKILL_CAL.SPEAK_OK && e.key) provenKeys.add(e.key); }
      else if (e.e === "sheet" && e.mode === "produce" && e.ok && e.key) provenKeys.add(e.key);
      else if (e.e === "spract" && (e.exact || e.got)) { outputMin += 0.4; }
      else if (e.e === "alisten-sent") outputMin += 0.3;
      else if (e.e === "trans" && e.ok) outputMin += 0.5;
      else if (e.e === "convo") outputMin += 10;
    }
    const hoursGate = Math.min(1, outputMin / SKILL_CAL.OUTPUT_TARGET_MIN);
    const scoreSet = (basket, discount) => {
      let proven = 0, extrapolated = 0;
      for (const k of basket) {
        const p = recallP(cards[k], t);
        if (p <= 0.01) continue;
        if (provenKeys.has(k)) proven += p;
        else extrapolated += p * discount;
      }
      return { proven, extrapolated };
    };
    const w = scoreSet(wordBasket, SKILL_CAL.PRODUCTIVE_WORD);
    const ph = scoreSet(phraseBasket || [], SKILL_CAL.PRODUCTIVE_PHRASE);
    const deployableRaw = w.proven + ph.proven + (w.extrapolated + ph.extrapolated) * hoursGate;
    return {
      provenItems: Math.round((w.proven + ph.proven) * 10) / 10,
      deployable: Math.round(deployableRaw * 10) / 10,
      basketSize: wordBasket.length + (phraseBasket || []).length,
      outputMinutes: Math.round(outputMin),
      hoursGate: Math.round(hoursGate * 100) / 100,
    };
  }

  return { DAY, BOX_DAYS, CAL, SKILL_CAL, halflife, recallP, buildQrefIndex, gradedStream, applyEvent, replay, recallMass, realitySeries, simulate, massFromSrs,
    earEvidence, earFactor, connectedFactor, comprehensionAt, earRecallP, listeningEstimate, speakingEstimate };
});
