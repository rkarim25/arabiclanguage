/* ============================================================================
   THE CURRICULUM ENGINE — levels, weeks, exams.

   Design contract: CURRICULUM.md (repo root). Read it before changing anything
   here. In short:
     · progress is a CAPABILITY ("you can now…"), never a date
     · two tracks (quran, conv), each with its own CEFR level + can-do line
     · a level needs EVERY criterion met, and is never revoked
     · the week is the unit of work; every week ends in a scored exam
     · history lives in the LOG (only the log syncs — see js/tracker.js)

   This file computes; it does not render. week.html and index.html render.

   It deliberately reuses ProgressModel for every judgment about the learner's
   ear and output, so there is exactly ONE definition of "certified by ear" in
   the codebase rather than a second one that quietly disagrees.
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./progress-model.js"));
  else root.Curriculum = factory(root.ProgressModel);
})(typeof self !== "undefined" ? self : this, function (PM) {
  "use strict";
  const DAY = 86400000;
  const SOLID_BOX = 3;              // an item counts as "learnt this week" at box >= 3
  const EAR_STALE_D = 45;           // matches ProgressModel.SKILL_CAL.EAR_STALE_D

  const iso = t => new Date(t).toISOString().slice(0, 10);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pct = (a, b) => (b > 0 ? clamp(a / b, 0, 1) : 0);

  /* ---------- baskets ---------- */
  /* A basket id from curriculum.json -> the qw: SRS keys it covers. Key format
     must match scripts/gen-progress.js qwKeys(): qw:<surahId>:<verseIdx>:<wordIdx> */
  function expandBasket(id, ctx) {
    const b = (ctx.curriculum.baskets || {})[id];
    if (!b) return [];
    const want = b.surahs;
    return (ctx.verses.surahs || [])
      .filter(s => !want || want.includes(s.id))
      .flatMap(s => s.verses.flatMap((v, vi) => v.words.map((w, wi) => `qw:${s.id}:${vi}:${wi}`)));
  }

  /* ---------- criteria ---------- */
  /* Every criterion returns the same shape so the UI can draw a partial bar
     toward the NEXT level. An unknown type fails closed and says so — it must
     never silently pass. */
  function evalCriterion(c, ctx) {
    const out = (have, need, unit, met) => ({
      type: c.type, label: c.label || c.type, have, need, unit,
      met: met === undefined ? have >= need : met,
      pct: pct(have, need),
    });
    const now = ctx.now || Date.now();

    switch (c.type) {
      case "earCoverage": {
        const basket = expandBasket(c.basket, ctx);
        const ev = PM.earEvidence(ctx.log);
        let certified = 0;
        for (const k of basket) {
          const h = ev[k];
          if (h && h.some(o => o.ok) && now - h[h.length - 1].t < EAR_STALE_D * DAY) certified++;
        }
        const frac = pct(certified, basket.length);
        return {
          type: c.type, label: c.label, met: frac >= c.min, pct: pct(frac, c.min),
          have: certified, need: Math.ceil(c.min * basket.length), unit: "words by ear",
        };
      }
      case "srsSolid": {
        const keys = Object.keys(ctx.srs || {}).filter(k => (c.keys || []).some(p => k.startsWith(p)));
        const solid = keys.filter(k => (ctx.srs[k].box || 0) >= (c.box || SOLID_BOX)).length;
        const total = keys.length;
        const frac = pct(solid, total);
        return {
          type: c.type, label: c.label, met: total > 0 && frac >= c.min, pct: pct(frac, c.min),
          have: solid, need: Math.ceil(c.min * total), unit: "cards solid",
        };
      }
      case "examAvg": {
        const ex = examResults(ctx.log, c.kind).slice(-c.n);
        if (ex.length < c.n) return { type: c.type, label: c.label, met: false, pct: pct(ex.length, c.n), have: 0, need: c.min, unit: "avg score (not enough exams yet)" };
        const avg = Math.round(ex.reduce((a, e) => a + e.score, 0) / ex.length);
        return out(avg, c.min, "avg score", avg >= c.min);
      }
      case "examCount":
        return out(examResults(ctx.log, c.kind).length, c.n, "exams");
      case "placement": {
        const pe = PM.ptestEvidence(ctx.log, now);
        const arr = c.test === "speak" ? pe.speak : pe.listen;
        const last = arr.length ? arr[arr.length - 1] : null;
        const s = last ? Number(last.score) || 0 : 0;
        return out(Math.round(s * 100), Math.round(c.min * 100), "%", s >= c.min);
      }
      case "surahTests": {
        const p = ctx.progress || {};
        const n = Object.keys(p).filter(k => k.startsWith("q-") && p[k] && p[k].steps && p[k].steps.test).length;
        return out(n, c.min, "surah tests");
      }
      case "outputMinutes":
        return out(Math.round(PM.outputMinutes(ctx.log, now)), c.min, "minutes spoken");
      default:
        return { type: c.type, label: "unknown criterion (" + c.type + ")", met: false, pct: 0, have: 0, need: 1, unit: "" };
    }
  }

  /* ---------- levels ---------- */
  /* Levels are ordered and cumulative: the first level whose criteria are NOT
     all met is the one being worked toward; everything before it is earned. */
  function trackLevel(track, ctx) {
    const levels = track.levels.map(l => {
      const criteria = l.criteria.map(c => evalCriterion(c, ctx));
      return { id: l.id, label: l.label, can: l.can, criteria, met: criteria.every(c => c.met) };
    });
    let idx = levels.findIndex(l => !l.met);
    if (idx === -1) idx = levels.length;              // every level earned
    const earned = levels.slice(0, idx);
    const next = idx < levels.length ? levels[idx] : null;
    const current = earned.length ? earned[earned.length - 1] : null;
    return {
      id: track.id, icon: track.icon, name: track.name, goal: track.goal,
      earned, current, next,
      // progress toward the next level = mean of its criteria, so the bar moves
      // for partial work instead of sitting at 0 until everything lands at once
      nextPct: next ? next.criteria.reduce((a, c) => a + clamp(c.pct, 0, 1), 0) / next.criteria.length : 1,
    };
  }

  function levels(ctx) {
    const out = {};
    for (const t of ctx.curriculum.tracks) out[t.id] = trackLevel(t, ctx);
    return out;
  }

  /* ---------- exams ---------- */
  function examKind(n) {
    if (n > 0 && n % 52 === 0) return "annual";
    if (n > 0 && n % 26 === 0) return "semiannual";
    if (n > 0 && n % 13 === 0) return "quarterly";
    if (n > 0 && n % 4 === 0) return "monthly";
    return "weekly";
  }
  const EXAM_SCOPE = {
    weekly:     { total: 20, weeksBack: 3,  carry: 0.2, levelTest: false, label: "Weekly exam" },
    monthly:    { total: 28, weeksBack: 4,  carry: 0.5, levelTest: false, label: "Monthly checkpoint" },
    quarterly:  { total: 36, weeksBack: 13, carry: 0.6, levelTest: true,  label: "Quarterly level test" },
    semiannual: { total: 40, weeksBack: 26, carry: 0.6, levelTest: true,  label: "Half-year review" },
    annual:     { total: 48, weeksBack: 52, carry: 0.6, levelTest: true,  label: "Annual review" },
  };
  const examScope = kind => EXAM_SCOPE[kind] || EXAM_SCOPE.weekly;

  /* ---------- retakes ----------
     His rule: "the weekly test should be something which i can take many times
     to see how far along have i gone. it could be just that by doing the test
     many times i learn as well not just by doing the lesson."

     So the test is ALWAYS open and unlimited — and it is a learning instrument,
     not just a measuring one (retrieval practice is one of the strongest levers
     there is, and his profile already lists it). Every attempt grades real SRS
     cards, so a retake teaches.

     The honest accounting: every attempt is kept and shown as a trajectory, but
     a WEEK contributes exactly ONE score to the record — its latest attempt.
     Otherwise repeating an easy week would lift a level average without any new
     learning behind it, which is precisely the hollow milestone he fears. */
  function examAttempts(log, weekN) {
    return (log || [])
      .filter(e => e && e.e === "exam-done" && typeof e.score === "number" && (weekN === undefined || e.n === weekN))
      .sort((a, b) => a.t - b.t);
  }

  /* One result per week (the latest attempt) — this is what level criteria use. */
  function examResults(log, kind) {
    const byWeek = new Map();
    for (const e of examAttempts(log)) {
      if (kind && e.kind !== kind) continue;
      byWeek.set(e.n, e);                             // later attempts overwrite earlier
    }
    return [...byWeek.values()].sort((a, b) => a.t - b.t);
  }

  /* "How far along have I gone" — the shape of the retakes within one week. */
  function examTrajectory(log, weekN) {
    const a = examAttempts(log, weekN);
    if (!a.length) return null;
    const scores = a.map(x => x.score);
    return {
      attempts: a.length, scores,
      first: scores[0], latest: scores[scores.length - 1],
      best: Math.max.apply(null, scores),
      gain: scores[scores.length - 1] - scores[0],
    };
  }

  /* ---------- week history (replayed from the log — see CURRICULUM.md §6) ---------- */
  function weekHistory(log) {
    const byN = new Map();
    for (const e of log || []) {
      if (!e || !e.n) continue;
      if (e.e === "week-start") {
        const w = byN.get(e.n) || { n: e.n };
        byN.set(e.n, Object.assign(w, {
          title: e.title, from: e.from, to: e.to, track: e.track,
          objectives: e.objectives, keys: e.keys, sizedFor: e.sizedFor, startedAt: e.t,
        }));
      } else if (e.e === "exam-done") {
        const w = byN.get(e.n) || { n: e.n };
        byN.set(e.n, Object.assign(w, {
          score: e.score, kind: e.kind, sections: e.sections, examAt: e.t,
        }));
      }
    }
    return [...byN.values()].sort((a, b) => a.n - b.n);
  }

  /* ---------- week sizing (CURRICULUM.md §4) ---------- */
  /* Sized from what he ACTUALLY did, never from an aspiration he has to keep.
     Shrink fast, grow slowly. */
  const MIN_PER_ITEM = 2.5;         // active minutes to carry one item to box >= 3
  const DEFAULT_MINS = 35;          // his observed floor, used only with no history

  function activeMinutesBetween(log, from, to) {
    const ts = (log || []).filter(e => e && e.t >= from && e.t < to).map(e => e.t).sort((a, b) => a - b);
    if (!ts.length) return 0;
    let sec = 0;
    for (let i = 1; i < ts.length; i++) {
      const gap = (ts[i] - ts[i - 1]) / 1000;
      sec += gap <= 180 ? gap : 30;   // same chaining rule as tracker.js activeMinutes()
    }
    return Math.round((sec + 30) / 60);
  }

  function weekSize(ctx) {
    const now = ctx.now || Date.now();
    const hist = weekHistory(ctx.log);
    const mins = [];
    for (let i = 1; i <= 3; i++) mins.push(activeMinutesBetween(ctx.log, now - i * 7 * DAY, now - (i - 1) * 7 * DAY));

    // Quiet weeks are counted, NOT filtered out. Dropping the zeros would size
    // next week off his best fortnight and hand a returning learner a wall —
    // the sizing is supposed to meet him where he actually is.
    const sorted = mins.slice().sort((a, b) => a - b);
    const everStudied = (ctx.log || []).some(e => e && e.t);
    let basis = "median of your last 3 weeks";
    let m;
    if (!everStudied) { m = DEFAULT_MINS; basis = "no history yet — starting small"; }
    else m = sorted[1];                               // median of the three
    m = clamp(m, 20, 120);

    let items = clamp(Math.round(m / MIN_PER_ITEM), 6, 40);

    // Re-entry: if the week just gone was near-dead, the median describes the
    // learner he was a fortnight ago, not the one opening the site today. Come
    // back at half size. A week he finishes rebuilds the habit; a week sized
    // off his best fortnight is the wall that made him stop.
    const reentry = everStudied && mins[0] < 0.25 * m;
    if (reentry) { items = Math.max(6, Math.round(items * 0.5)); basis = "half your usual — easing back in after a quiet week"; }
    const last = hist.filter(w => typeof w.score === "number").pop();
    if (last && last.score < 60) { items = Math.max(6, Math.round(items * 0.7)); basis += " — lighter after a hard week"; }
    else if (last && last.score >= 85) { items = Math.min(40, Math.round(items * 1.15)); basis += " — stepped up after a strong week"; }
    return { mins: m, items, basis };
  }

  /* LEARN → TEST (his rule).
     The target is pre-set, but carrying on past it is welcome — so the exam is
     built from what he ACTUALLY learnt, not from the list I wrote on Sunday.
     "Learnt this week" = on the week's list and now solid, OR any other card
     brought to box >= SOLID_BOX during the week (srs.u stamps the write time).
     Extra work therefore earns extra questions instead of going untested. */
  function weekLearned(week, srs, now) {
    const from = week && week.from ? Date.parse(week.from + "T00:00:00Z") : 0;
    const to = Math.min(now || Date.now(), week && week.to ? Date.parse(week.to + "T23:59:59Z") : Infinity);
    const listed = new Set(weekKeys(week));
    const out = [];
    for (const k of Object.keys(srs || {})) {
      const c = srs[k] || {};
      if ((c.box || 0) < SOLID_BOX) continue;
      const learntInWindow = (c.u || 0) >= from && (c.u || 0) <= to;
      if (listed.has(k) || learntInWindow) out.push({ key: k, listed: listed.has(k) });
    }
    return out;
  }

  /* ---------- objectives: MASTERY is the target, time is the variable ----------
     His rule: "I dont want to set a certain target of hitting a certain time. I
     want it somehow that I need to master certain clearly described things, the
     time is a variable."

     So a week is a list of OBJECTIVES, each a clearly described thing to master
     ("Al-Fatiha, verses 1-4 — by ear"), not a quantity of minutes or items. An
     objective is mastered when every one of its keys is solid. Nothing is ever
     failed for taking too long: unmastered objectives roll into the next week
     (see weekSelfSeed / CURRICULUM.md §7). The only deadline in the system is
     the exam, and the exam tests what was learnt, not what was scheduled. */
  function weekObjectives(week) {
    if (week && week.objectives && week.objectives.length) return week.objectives;
    // legacy/simple shape: a flat item list becomes one unnamed objective
    const items = (week && week.items) || [];
    if (!items.length) return [];
    return [{ id: "all", title: week && week.title ? week.title : "This week's words", keys: items.map(i => i.key) }];
  }
  const weekKeys = week => weekObjectives(week).flatMap(o => o.keys || []);

  function weekProgress(week, srs, now) {
    const objs = weekObjectives(week).map(o => {
      const keys = o.keys || [];
      const byKey = keys.map(k => ({ key: k, box: (srs[k] || {}).box || 0 }));
      const solid = byKey.filter(x => x.box >= SOLID_BOX).length;
      return {
        id: o.id, title: o.title, can: o.can, why: o.why, keys, byKey,
        solid, total: keys.length, pct: pct(solid, keys.length),
        mastered: keys.length > 0 && solid === keys.length,
      };
    });
    const total = objs.reduce((a, o) => a + o.total, 0);
    const solid = objs.reduce((a, o) => a + o.solid, 0);
    const learned = weekLearned(week, srs, now);
    const listedKeys = new Set(weekKeys(week));
    const extra = learned.filter(l => !listedKeys.has(l.key)).length;
    return {
      objectives: objs,
      mastered: objs.filter(o => o.mastered).length, objectiveCount: objs.length,
      complete: objs.length > 0 && objs.every(o => o.mastered),
      solid, total, pct: pct(solid, total),
      byItem: objs.flatMap(o => o.byKey),
      // work beyond the target is counted and shown, never capped away
      extra, learnedTotal: solid + extra,
    };
  }

  /* ---------- week boundaries ---------- */
  /* The week is anchored to his Sunday 07:00 lesson: Sunday -> Saturday. */
  function weekBounds(now) {
    const d = new Date(now);
    const dow = d.getUTCDay();                     // 0 = Sunday
    const from = new Date(now - dow * DAY);
    return { from: iso(from.getTime()), to: iso(from.getTime() + 6 * DAY), examOn: iso(from.getTime() + 6 * DAY) };
  }

  /* ---------- self-seeded week ---------- */
  /* A week is NEVER empty. If the coach has not set one, build it from what is
     leaking so he opens the site to work, not to a blank slate. */
  function weekSelfSeed(ctx) {
    const now = ctx.now || Date.now();
    const size = weekSize(ctx);
    const b = weekBounds(now);
    const hist = weekHistory(ctx.log);

    /* A week number is minted ONCE per calendar week. If this week has already
       been started, rebuild the same week rather than inventing a new one —
       otherwise every page load would mint another number and his history would
       fill with phantom weeks. */
    const already = hist.find(w => w.from === b.from && w.objectives && w.objectives.length);
    if (already) {
      return {
        n: already.n, from: b.from, to: b.to, examOn: b.examOn,
        title: already.title, why: already.why, track: already.track || "quran",
        source: "coach", selfSeeded: true, sizedFor: already.sizedFor || size,
        objectives: already.objectives, tasks: [],
      };
    }
    const n = (hist.length ? Math.max(...hist.map(w => w.n)) : 0) + 1;

    const srs = ctx.srs || {};
    const nameFor = ctx.nameFor || (g => g);

    /* Objectives are things still to MASTER. A card already at box >= SOLID_BOX
       is mastered; it belongs in ordinary review, not in this week's target —
       and putting it here would let a carried objective re-absorb the very words
       he had just finished. */
    const scored = Object.keys(srs).filter(k => ((srs[k] || {}).box || 0) < SOLID_BOX).map(k => {
      const c = srs[k];
      const due = (c.due || 0) <= now;
      // leaking-and-due first, then weakest box, then oldest due
      return { key: k, rank: (due ? 0 : 100) + (c.box || 0) * 10 + (c.due ? 0 : 5) };
    }).sort((a, b2) => a.rank - b2.rank || (srs[a.key].due || 0) - (srs[b2.key].due || 0));

    /* CARRY-OVER: time is the variable, so anything not yet mastered comes back
       rather than being written off. Unfinished objectives lead the new week. */
    const prev = hist.length ? hist[hist.length - 1] : null;
    const objectives = [];
    const byId = new Map();                      // one objective per group, ever
    const used = new Set();
    const addObj = o => { objectives.push(o); byId.set(o.id, o); o.keys.forEach(k => used.add(k)); };

    if (prev && prev.objectives && prev.n !== n) {
      for (const o of prev.objectives) {
        const unmastered = (o.keys || []).filter(k => ((srs[k] || {}).box || 0) < SOLID_BOX);
        if (!unmastered.length) continue;
        addObj({ id: o.id, title: o.title, can: o.can, keys: unmastered, why: "carried over — not finished yet, and that's fine" });
      }
    }

    /* Then group what is leaking into small, clearly described objectives.
       A named group of ~6 related words is masterable and describable; a flat
       list of 15 unrelated cards is neither. */
    const OBJ_MAX = 6;
    const byGroup = new Map();
    for (const s of scored) {
      if (used.has(s.key)) continue;
      const g = groupOf(s.key);
      if (!byGroup.has(g)) byGroup.set(g, []);
      const arr = byGroup.get(g);
      if (arr.length < OBJ_MAX) arr.push(s.key);
    }
    for (const [g, keys] of byGroup) {
      if (objectives.reduce((a, o) => a + o.keys.length, 0) >= size.items) break;
      const existing = byId.get(g);
      if (existing) {                                // same group as a carried objective — MERGE
        existing.keys = existing.keys.concat(keys);  // never show one thing twice under two headings
        keys.forEach(k => used.add(k));
        continue;
      }
      if (keys.length < 2) continue;                 // a single stray card is not an objective
      addObj({ id: g, title: nameFor(g), keys, why: "slipping — bring it back to solid" });
    }
    // last resort: never hand back an empty week
    if (!objectives.length && scored.length) {
      objectives.push({ id: "mixed", title: "Words closest to being forgotten", keys: scored.slice(0, Math.max(4, size.items)).map(s => s.key), why: "due for review" });
    }

    return {
      n, from: b.from, to: b.to, examOn: b.examOn,
      title: "Week " + n,
      why: "Set automatically from what's closest to being forgotten. Your coach replaces this each Sunday.",
      track: "quran", source: "coach", selfSeeded: true,
      sizedFor: size, objectives, tasks: [],
    };
  }

  /* ---------- exam construction ---------- */
  /* 80/20 by default (his choice): mostly this week, some carried, so earlier
     weeks cannot quietly rot. At least half of quran-track items are by EAR —
     that is the honest gap and the ranked-first goal. */
  function examBuild(week, ctx, opts) {
    opts = opts || {};
    const kind = examKind(week.n);
    const scope = examScope(kind);
    const hist = weekHistory(ctx.log);
    // LEARN -> TEST: the target is pre-set, but if he carries on past it the
    // exam must reflect that. Test what he actually brought to solid this week,
    // listed or not; fall back to the list itself before anything is solid yet.
    const learned = weekLearned(week, ctx.srs || {}, ctx.now).map(l => l.key);
    const listedKeys = weekKeys(week);
    /* The UNION of the target and whatever else he learnt — not one or the other.
       Testing only the mastered part would score ~100% every time and hide the
       very thing he wants to watch move; testing only the list would ignore the
       extra work he chose to do. Union means the score starts low and climbs as
       the week is mastered, which is what "how far along have I gone" means. */
    const thisWeek = [...new Set(listedKeys.concat(learned))];

    const carryPool = [];
    for (const w of hist) {
      if (w.n === week.n || !(w.keys || w.items)) continue;
      if (w.n < week.n - scope.weeksBack) continue;
      for (const k of (w.keys || (w.items || []).map(i => i.key))) if (!thisWeek.includes(k)) carryPool.push(k);
    }

    const nCarry = Math.min(carryPool.length, Math.round(scope.total * scope.carry));
    const nWeek = Math.min(thisWeek.length, scope.total - nCarry);
    const pick = (arr, k) => {
      const a = arr.slice();
      const out = [];
      // deterministic within a week (seeded by week number) so a refresh does
      // not reshuffle an exam he is halfway through
      let seed = ((week.n * 2654435761) ^ ((opts.attempt || 0) * 40503)) % 2147483647;
      if (seed <= 0) seed += 2147483646;
      while (out.length < k && a.length) {
        seed = (seed * 48271) % 2147483647;
        out.push(a.splice(seed % a.length, 1)[0]);
      }
      return out;
    };

    const isQuran = k => k.startsWith("qw:") || k.startsWith("qc:");
    const items = [
      ...pick(thisWeek, nWeek).map(k => ({ key: k, section: "week" })),
      ...pick(carryPool, nCarry).map(k => ({ key: k, section: "carry" })),
    ];

    // at least half the quran-track items answered by ear
    const q = items.filter(i => isQuran(i.key));
    q.forEach((it, i) => { it.form = i < Math.ceil(q.length / 2) ? "ear" : "mean"; });
    items.filter(i => !isQuran(i.key)).forEach((it, i) => { it.form = i % 3 === 0 ? "ear" : (i % 3 === 1 ? "mean" : "prod"); });

    return { kind, label: scope.label, levelTest: scope.levelTest, total: items.length, items };
  }

  function examScoreOf(answers) {
    const total = answers.length || 1;
    const correct = answers.filter(a => a.ok).length;
    const sec = s => {
      const a = answers.filter(x => x.section === s);
      return a.length ? Math.round(100 * a.filter(x => x.ok).length / a.length) : null;
    };
    const ear = answers.filter(x => x.form === "ear");
    return {
      score: Math.round(100 * correct / total), correct, total,
      sections: {
        week: sec("week"), carry: sec("carry"),
        ear: ear.length ? Math.round(100 * ear.filter(x => x.ok).length / ear.length) : null,
      },
    };
  }

  const BANDS = [
    { min: 85, band: "strong", say: "Strong — that material is yours." },
    { min: 70, band: "solid", say: "Solid. A few gaps worth another pass." },
    { min: 60, band: "shaky", say: "Shaky — I'll carry the weak third into next week." },
    { min: 0, band: "not yet", say: "Not yet. Next week gets lighter and re-teaches this." },
  ];
  const examBand = score => BANDS.find(b => score >= b.min);

  /* ---------- the feedback loop, in words ----------
     His rule: "the learn-test creates a feedback loop and the result is
     qualitatively described along with a standard course lingo like A, B, C."
     So a result is never just a number. It says what he can now DO, what is
     still shaky, where that leaves his level, and what next week will do about
     it. `nameFor(key)` is supplied by the caller (the UI knows the content
     names; the engine deliberately does not). */
  function groupOf(key) {
    let m;
    if ((m = key.match(/^qw:([a-z0-9]+):/))) return "surah:" + m[1];
    if (key.startsWith("qc:")) return "qc";
    if ((m = key.match(/^(ph|ev|fam)-([a-z0-9-]+):/))) return m[1] + "-" + m[2];
    if ((m = key.match(/^(story-\d+):/))) return m[1];
    if (key.startsWith("tw:")) return "tw";
    return "other";
  }

  function examVerdict(result, answers, opts) {
    opts = opts || {};
    const nameFor = opts.nameFor || (g => g);
    const band = examBand(result.score);

    const by = {};
    for (const a of answers) {
      const g = groupOf(a.key);
      (by[g] = by[g] || { g, ok: 0, n: 0 }).n++;
      if (a.ok) by[g].ok++;
    }
    const groups = Object.values(by).filter(x => x.n >= 2);
    const held = groups.filter(x => x.ok / x.n >= 0.8).map(x => nameFor(x.g));
    const shaky = groups.filter(x => x.ok / x.n < 0.5).map(x => nameFor(x.g));

    const lines = [];
    if (held.length) lines.push(`You held ${listOf(held)}.`);
    if (result.sections.ear !== null && result.sections.ear !== undefined) {
      lines.push(result.sections.ear >= result.score
        ? `Your ear did the heavy lifting — ${result.sections.ear}% of the by-ear questions, which is the half that counts for the Qur'an.`
        : `By ear you got ${result.sections.ear}%, below your ${result.score}% overall — the gap between reading it and hearing it is still the honest one.`);
    }
    if (result.sections.carry !== null && result.sections.carry !== undefined) {
      lines.push(result.sections.carry >= 70
        ? `Earlier weeks held up at ${result.sections.carry}% — nothing is rotting behind you.`
        : `Earlier weeks slipped to ${result.sections.carry}% — older material needs a pass, not just new words.`);
    }
    if (shaky.length) lines.push(`Still shaky: ${listOf(shaky)}.`);
    lines.push(band.say);

    return {
      band: band.band, headline: band.say, lines,
      held, shaky,
      // what the loop will DO — the half of feedback that usually goes missing
      nextWeek: result.score < 60
        ? "Next week is lighter and re-teaches this rather than moving on."
        : result.score >= 85
          ? "Next week steps up, and these carry forward for spaced review."
          : "Next week keeps its size and carries the misses forward.",
    };
  }

  function listOf(a) {
    if (a.length === 1) return a[0];
    if (a.length === 2) return a[0] + " and " + a[1];
    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  }

  /* Where a result leaves him, in course lingo: the letter plus the can-do line. */
  function levelSummary(ctx) {
    const L = levels(ctx);
    return Object.values(L).map(t => ({
      icon: t.icon, name: t.name,
      label: t.current ? t.current.label : "—",
      can: t.current ? t.current.can : null,
      next: t.next ? t.next.label : null,
      nextCan: t.next ? t.next.can : null,
      nextPct: t.nextPct,
      line: t.current
        ? `${t.icon} ${t.name} ${t.current.label} — ${t.current.can}`
        : `${t.icon} ${t.name} — working toward ${t.next.label}: ${t.next.can}`,
    }));
  }

  return {
    SOLID_BOX, expandBasket, evalCriterion, trackLevel, levels,
    examKind, examScope, examResults, examAttempts, examTrajectory, examBuild, examScoreOf, examBand, examVerdict, levelSummary, groupOf,
    weekHistory, weekSize, weekProgress, weekLearned, weekObjectives, weekKeys, weekBounds, weekSelfSeed, activeMinutesBetween,
  };
});
