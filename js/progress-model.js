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

  return { DAY, BOX_DAYS, CAL, halflife, recallP, buildQrefIndex, gradedStream, applyEvent, replay, recallMass, realitySeries, simulate, massFromSrs };
});
