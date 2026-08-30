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

  /* Dates are LOCAL, not UTC. Under BST a Monday 00:30 is Sunday 23:30 UTC, and
     a UTC-based week boundary would put him in the wrong week for an hour every
     morning. js/plan.js already formats local dates this way. */
  const iso = t => {
    const d = new Date(t);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const startOfDay = ymd => { const p = String(ymd).split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 0, 0, 0, 0).getTime(); };
  const endOfDay = ymd => startOfDay(ymd) + DAY - 1;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pct = (a, b) => (b > 0 ? clamp(a / b, 0, 1) : 0);

  /* ---------- "don't repeat this one" ----------
     His ask, 2026-08-30: "give me the option where i can click dont repeat as
     well. there are words like Allah which really i dont need to repeat."

     The store already had a retire bucket (b === "never", app.js setBucket) from
     the old word-card pages, and review/speaking/vocab already honoured it — but
     nothing in the sentence engine did, so retiring a word still left it being
     taught, tested and counted as weak. Every selector below now asks this
     first. A retired card keeps box 5 and a year-2100 due date, so it still
     counts as HELD: retiring is him saying "I know this", which is the same
     claim the ✓ self-grade already makes, and it must not quietly delete the
     word from his inventory. Getting one wrong un-retires it (see gradeCard). */
  const isRetired = (key, ctx) => ((ctx.srs || {})[key] || {}).b === "never";

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
    const from = week && week.from ? startOfDay(week.from) : 0;
    const to = Math.min(now || Date.now(), week && week.to ? endOfDay(week.to) : Infinity);
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
  /* MONDAY -> SUNDAY, anchored to his Sunday 07:00 class (his 2026-08-29 ask:
     "start the week from Monday, so the first lesson starts after my class").

       Sun 07:00  class  ->  he pastes it  ->  Mon: the week opens ON that material
       Mon..Fri   study
       Sat        the test opens (retakeable all week after)
       Sun 07:00  next class — the last day of the week, walked into prepared

     The class therefore BOOKENDS the week: the one that starts it supplies the
     material, and the one that ends it is what the week was preparing for. */
  function weekBounds(now) {
    const d = new Date(now);
    const daysSinceMon = (d.getDay() + 6) % 7;     // getDay(): 0=Sun -> Mon=0 … Sun=6
    const from = startOfDay(iso(now)) - daysSinceMon * DAY;
    return {
      from: iso(from),
      to: iso(from + 6 * DAY),                     // Sunday — next class day
      examOn: iso(from + 5 * DAY),                 // Saturday — the test opens
      classOn: iso(from + 6 * DAY),
    };
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
        n: already.n, from: b.from, to: b.to, examOn: b.examOn, classOn: b.classOn,
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
      n, from: b.from, to: b.to, examOn: b.examOn, classOn: b.classOn,
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
    // band.say is already the headline, and for low scores it repeats nextWeek
    // almost word for word — only fall back to it when there is nothing else
    if (!lines.length) lines.push(band.say);

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


  /* ==========================================================================
     THE MILESTONE LADDER — the site's spine (CURRICULUM.md).

     His instruction (2026-08-29): "in language learning itself [weeks] don't
     have any intrinsic value but the milestones are everything. either i know a
     list of words or not, whether it is 3 weeks before or after my plan is a bit
     irrelevant. so downplay the timeline aspect of it and make the entire
     website milestone based."

       MILESTONE (a capability, written as a can-do sentence)
         -> LESSONS (one thing to master, each with its own test section)
           -> CHUNKS (~5 min, with due reviews folded in invisibly)

     Weeks survive only as `plannedWeek`, a pacing annotation used to say how far
     ahead or behind the plan he is. They are never the headline.
     ========================================================================== */
  const PASS = 80;
  const CLEAR_MIN = 3;              // questions a lesson needs before a score may clear it
                                    // (3 of 3 = 100 clears; 2 of 3 = 67 does not)                  // his choice: a lesson section at 80+ is mastered
  const CHUNK_ITEMS = 8;            // items one ~5-minute pass can cover
  const REVIEW_PER_CHUNK = 4;       // due cards folded into the front of each chunk

  /* The most recent score for each lesson, from any milestone-test attempt. */
  function lessonScores(log) {
    const out = {};
    const sorted = (log || []).filter(e => e && e.e === "exam-done" && e.lessons).sort((a, b) => a.t - b.t);
    for (const e of sorted) {
      for (const id in e.lessons) {
        const sc = e.lessons[id];
        const prev = out[id];
        // passes counts CONSECUTIVE passes — a failed re-check resets it, so the
        // re-verification interval starts short again rather than staying long
        const passes = sc >= PASS ? ((prev && prev.score >= PASS ? prev.passes : 0) + 1) : 0;
        out[id] = { score: sc, t: e.t, passes };
      }
    }
    return out;
  }

  /* PROOF IS THE ONLY ROUTE (his rule, 2026-08-29): "everything needs to be
     proved by test, unless i achieve a 80, i cannot claim i know words."

     So solid SRS cards no longer auto-master a lesson. They do something else,
     which matters just as much: a lesson whose words are already solid skips
     straight to its test instead of making him walk chunks he does not need
     (see nextChunk). Knowing it saves him the LEARNING, not the PROOF.

     A pass is re-verified after a while. If the re-check fails, the lesson
     reopens — he asked for exactly this standard. (Levels, by contrast, are
     never revoked; a lesson reopening simply slows the next level down.) */
  const REVERIFY_D = [45, 120, 300];        // days after each successive pass
  function lessonState(lesson, srs, scores, now) {
    const keys = lesson.keys || [];
    const solid = keys.filter(k => ((srs[k] || {}).box || 0) >= SOLID_BOX).length;
    const sc = scores[lesson.id];
    const score = sc ? sc.score : null;
    const passed = score !== null && score >= PASS;
    const passes = sc ? sc.passes : 0;
    const gap = REVERIFY_D[Math.min(passes - 1, REVERIFY_D.length - 1)] || REVERIFY_D[0];
    const reverifyAt = passed ? sc.t + gap * DAY : null;
    const reverifyDue = passed && (now || Date.now()) >= reverifyAt;
    return {
      id: lesson.id, title: lesson.title, keys,
      solid, total: keys.length, pct: pct(solid, keys.length),
      score, passes,
      mastered: passed,
      provedByTest: passed,
      // already known but unproven — the test is all that is left to do
      readyToProve: !passed && keys.length > 0 && solid / keys.length >= 0.8,
      reverifyAt, reverifyDue,
    };
  }

  function milestoneState(ctx) {
    const srs = ctx.srs || {};
    const scores = lessonScores(ctx.log);
    const list = (ctx.curriculum.milestones || []).map(m => {
      const lessons = (m.lessons || []).map(l => lessonState(l, srs, scores, ctx.now));
      const done = lessons.filter(l => l.mastered).length;
      const items = lessons.reduce((a, l) => a + l.total, 0);
      const solid = lessons.reduce((a, l) => a + l.solid, 0);
      const scored = lessons.filter(l => l.score !== null);
      const chunks = (m.lessons || []).reduce((a, l) => a + lessonChunks(l).length, 0);
      return Object.assign({}, m, {
        lessons,
        lessonsDone: done, lessonCount: lessons.length,
        chunks,
        items, solid, pct: pct(solid, items),
        achieved: lessons.length > 0 && done === lessons.length,
        score: scored.length ? Math.round(scored.reduce((a, l) => a + l.score, 0) / scored.length) : null,
      });
    });
    const currentIdx = list.findIndex(m => !m.achieved);
    return {
      milestones: list,
      achieved: list.filter(m => m.achieved),
      current: currentIdx === -1 ? null : list[currentIdx],
      currentIdx,
      upcoming: currentIdx === -1 ? [] : list.slice(currentIdx + 1),
    };
  }

  /* ---------- chunks ----------
     A lesson is walked in passes: meet the words, produce them, say them in a
     whole sentence, prove them by ear. Each pass is one ~5-minute chunk. Due
     reviews ride at the front of every chunk, so reviewing never becomes a
     separate chore (his choice). */
  /* A LESSON IS ONE SITTING (~7 min). It used to be split into four passes of
     five minutes each, which made a "lesson" 20-40 minutes — far too big for the
     way he actually studies. Now the lesson is the atomic unit and the passes
     happen INSIDE it: meet the words, then work them in mixed forms.

     lessonChunks() survives as a single entry so progress logging (`chunk-done`)
     and any older logs keep working. */
  const CHUNK_MODES = [
    { mode: "lesson", label: "Learn it", sub: "Meet the words, then work them — about seven minutes." },
  ];

  function lessonChunks(lesson) {
    const keys = lesson.keys || [];
    if (!keys.length) return [];
    return [{
      id: lesson.id + ":lesson",
      lessonId: lesson.id, mode: "lesson",
      label: "Learn it", sub: CHUNK_MODES[0].sub, keys,
    }];
  }

  const chunkDone = (chunkId, log) => (log || []).some(e => e && e.e === "chunk-done" && e.chunk === chunkId);

  /* Continue = the next unfinished chunk of the current milestone's first
     unmastered lesson. One button, no decision. */
  function nextChunk(ctx, state) {
    state = state || milestoneState(ctx);
    const ms = state.current;
    if (!ms) return null;
    const src = (ctx.curriculum.milestones || []).find(m => m.id === ms.id) || ms;
    for (const l of ms.lessons) {
      if (l.mastered) continue;
      // he already holds these words — do not make him walk chunks he does not
      // need; the only thing outstanding is the proof
      if (l.readyToProve) return { milestone: ms, lesson: l, chunk: null, testNext: true, skipToTest: true };
      const source = (src.lessons || []).find(x => x.id === l.id) || l;
      const chunks = lessonChunks(source);
      const next = chunks.find(c => !chunkDone(c.id, ctx.log));
      if (next) return { milestone: ms, lesson: l, chunk: next, chunks };
    }
    // every chunk walked but not yet proved — the test is what remains
    return { milestone: ms, lesson: ms.lessons.find(l => !l.mastered) || null, chunk: null, testNext: true };
  }

  /* Due cards folded into the front of a chunk — never the chunk's own words
     (those are the lesson), always something else that is slipping. */
  function reviewsFor(chunk, ctx, n) {
    const srs = ctx.srs || {}, now = ctx.now || Date.now();
    const own = new Set(chunk.keys || []);
    return Object.keys(srs)
      .filter(k => !own.has(k) && !isRetired(k, ctx) && (srs[k].due || 0) <= now)
      .sort((a, b) => (srs[a].due || 0) - (srs[b].due || 0))
      .slice(0, n === undefined ? REVIEW_PER_CHUNK : n);
  }

  /* ==========================================================================
     SENTENCES — what he actually studies (his rule, 2026-08-30)

       "i just keep working with sentences only and as primary method … while i
        will never review the word by word but you have to pick out words from
        there on what i am weak and design sentences in this way."

     The ladder is untouched: a lesson still OWNS a set of word keys, and is
     still proved at 80 like everything else. What changes is the MATERIAL — a
     lesson's words are met inside whole sentences drawn from data/sentence-bank.json,
     chosen so that between them they cover the lesson's words. The word is the
     unit of measurement; the sentence is the unit of study.

     Selection is a greedy set cover, which is exactly the "engineered coverage"
     that word lists used to provide by accident: at each step take the sentence
     that carries the most of the lesson's still-uncovered words, breaking ties
     toward fewer unfamiliar extras (so a sentence doesn't smuggle in five new
     words to teach one) and then toward the commoner vocabulary.
     ========================================================================== */
  const SENTENCE_MAX = 5;          // a ~7-minute sitting, four steps per sentence
  /* A lesson is seven MINUTES, not five sentences. Ayat run from two words to
     twenty-one (median 4, but 73:20 is long), so counting sentences would make one
     lesson a stroll and another a slog. Size by words instead, with at least one
     sentence always taken: a long ayah is simply a lesson on its own. */
  const LESSON_WORDS = 26;
  /* lexicographic compare of the score tuples below — first field decides */
  const cmp = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

  function sentenceIndex(ctx) {
    const bank = (ctx.bank && ctx.bank.sentences) || [];
    if (!ctx._byKey) {
      ctx._byKey = new Map();       // word key -> sentences containing it
      ctx._byId = new Map();
      bank.forEach(s => {
        ctx._byId.set(s.key, s);
        (s.teaches || []).forEach(k => {
          if (!ctx._byKey.has(k)) ctx._byKey.set(k, []);
          ctx._byKey.get(k).push(s);
        });
      });
    }
    return ctx._byKey;
  }

  /* How well he holds a word, 0 (never seen) to 1 (long-term). Drives both which
     words are worth building a sentence around and the tie-breaks below. */
  function holdOf(key, ctx) {
    const c = (ctx.srs || {})[key];
    if (!c) return 0;
    return Math.min(1, (c.box || 0) / 5);
  }

  /* The sentences that teach a set of word keys. `track` biases the pick toward
     the lesson's own track without excluding the other — a Qur'an word met in an
     everyday sentence is still that word. */
  function sentencesFor(targetKeys, ctx, opts) {
    opts = opts || {};
    const byKey = sentenceIndex(ctx);
    const want = new Set((targetKeys || []).filter(k => k && !isRetired(k, ctx)));
    if (!want.size) return [];
    const limit = opts.limit || SENTENCE_MAX;
    const track = opts.track;

    const candidates = new Map();
    want.forEach(k => (byKey.get(k) || []).forEach(s => candidates.set(s.key, s)));
    if (!candidates.size) return [];

    const chosen = [], covered = new Set(), used = new Set(opts.exclude || []);
    const budget = opts.maxWords || LESSON_WORDS;
    let spent = 0;
    while (chosen.length < limit && covered.size < want.size) {
      let best = null, bestScore = null;
      candidates.forEach(s => {
        if (used.has(s.key) || isRetired(s.key, ctx)) return;
        const gain = (s.teaches || []).filter(k => want.has(k) && !covered.has(k)).length;
        if (!gain) return;
        // unfamiliar extra baggage: words this sentence needs that are neither
        // the lesson's nor already held
        const extra = (s.teaches || []).filter(k => !want.has(k) && holdOf(k, ctx) < 0.4).length;
        const score = [
          -gain,                                   // cover the most first
          s.track === track ? 0 : 1,               // then prefer this track
          extra,                                   // then the least baggage
          -(s.weight || 0),                        // then the commoner words
        ];
        if (!bestScore || cmp(score, bestScore) < 0) { best = s; bestScore = score; }
      });
      if (!best) break;
      const cost = (best.words || []).length || 1;
      // always take the first, then stop once the sitting is full
      if (chosen.length && spent + cost > budget) break;
      used.add(best.key);
      chosen.push(best);
      spent += cost;
      (best.teaches || []).forEach(k => { if (want.has(k)) covered.add(k); });
    }
    return chosen;
  }

  /* Review, his way: never a bare word list. Take the cards that are due or
     slipping and hand back SENTENCES that contain them, so revision is reading
     and saying real Arabic. Falls back to nothing rather than to word cards —
     if no sentence carries a due word, the word simply waits for one. */
  function reviewSentencesFor(chunk, ctx, n) {
    const srs = ctx.srs || {}, now = ctx.now || Date.now();
    const own = new Set(chunk.keys || []);
    const due = Object.keys(srs)
      .filter(k => !own.has(k) && !isRetired(k, ctx) && (srs[k].due || 0) <= now)
      .sort((a, b) => (srs[a].due || 0) - (srs[b].due || 0))
      .slice(0, 40);
    return sentencesFor(due, ctx, { limit: n === undefined ? 2 : n });
  }

  /* The words he is weakest on right now, worst first — what the coach uses to
     decide which sentences to write next, and what the lesson strip reports. */
  function weakWords(ctx, n) {
    const srs = ctx.srs || {}, now = ctx.now || Date.now();
    return Object.keys(srs)
      .map(k => {
        const c = srs[k] || {};
        const overdue = Math.max(0, now - (c.due || now)) / 86400000;
        return { key: k, box: c.box || 0, overdue, score: (5 - (c.box || 0)) + Math.min(5, overdue / 7) };
      })
      .filter(w => !isRetired(w.key, ctx) && (w.box < 5 || w.overdue > 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, n || 20);
  }

  /* A grammar pattern is explained ONCE, the first time a sentence that uses it
     comes up — his condition: "if there are grammar rules which i do need to
     learn or understand then that needs to be added on from time to time."
     Seen-ness is replayed from the log, like every other piece of history. */
  function grammarToShow(sentences, ctx) {
    const seen = new Set((ctx.log || []).filter(e => e && e.e === "pattern-seen").map(e => e.pattern));
    for (const s of sentences || []) {
      if (s.pattern && !seen.has(s.pattern)) return s.pattern;
    }
    return null;
  }


  /* ==========================================================================
     INTERLEAVING — vocabulary and grammar bursts between the sentence lessons
     ==========================================================================
     His spec, 2026-08-30:

       "the idea is that i learn XY sentences which are high probability. Then at
        times I memorise some vocabulary to help me along and get me to build
        sentences quicker. then at times i learn some grammar which also helps
        build sentences quicker."
       — and then, plainly: "okay schedule that in. also it is based on
        probability of use."

     So a burst is not decoration between lessons; it has to EARN its slot by
     removing a bottleneck. Both kinds are chosen the same way — by measured
     probability of use (data/frequency.json), never by theme or by what looks
     tidy.

       · a VOCABULARY burst  — the commonest words in the language he does not
         hold yet, each one shown inside a real sentence from the bank, because
         the site's rule is that words are met in sentences.
       · a GRAMMAR burst     — the unseen pattern that unlocks the most sentences
         he has still to meet. Reach IS the frequency measure here: a pattern
         used by 225 bank sentences is worth a slot, one used by 2 is not.

     Placement: one of each per week at most, after the 2nd and 5th lesson, so a
     week is still overwhelmingly sentences (his primary method) and a burst is
     the exception it was described as. Computed for the CURRENT week only —
     bursts depend on what he holds today, so drawing them onto week 4 would be
     showing him a prediction dressed as a plan. */

  const BURST_WORDS = 8;             // a ~4-minute sitting, recall-then-show
  const BURST_AT = { vocab: 2, grammar: 5 };

  /* Must match scripts/gen-frequency.js norm() exactly — that is what the keys
     of frequency.json were built with. */
  const normAr = s => String(s).replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/\u0649/g, "\u064A")
    .replace(/[^\u0600-\u06FF\s]/g, "").replace(/\s+/g, " ").trim();

  /* Every distinct word the sentence bank teaches, with how likely it is to be
     used and how many sentences it appears in. Built once per ctx. */
  function wordIndex(ctx) {
    if (ctx._wordIdx) return ctx._wordIdx;
    const freq = (ctx.freq && ctx.freq.words) || {};
    /* An article-stripped fallback is right for nouns — الشَّقَّة is counted under
       شقة — but only when what is left is still a word. Without the length guard
       الآن stripped to "ان" and inherited إِنَّ's score, which put "now" into the
       burst at the frequency of "indeed". */
    const per10k = form => {
      const bare = form.replace(/^ال/, "");
      return Math.max(freq[form] || 0, bare.length >= 3 ? (freq[bare] || 0) : 0);
    };
    /* Display comes from data/lexicon.json when it has the word — the CURATED
       gloss, ordered by quality in gen-lexicon.js. The bank's own words carry
       whatever gloss their source used, and for Qur'anic tokens that is
       contextual and Uthmani: فِي glossed "(will be) in", أَنَا۠ written with a
       superscript alif. Neither is a vocabulary entry. The card KEYS still come
       from the bank, so the burst grades exactly what the lessons grade. */
    const lex = ctx.lexicon || null;
    const m = new Map();
    ((ctx.bank && ctx.bank.sentences) || []).forEach(s => {
      (s.words || []).forEach(w => {
        if (!w.en || !w.ar || !w.key) return;
        const form = normAr(w.ar);
        if (form.length < 2) return;
        let e = m.get(form);
        if (!e) {
          const L = lex && (lex[form] || lex[form.replace(/^ال/, "")]);
          m.set(form, e = {
            form, ar: (L && L[0]) || w.ar, en: (L && L[2]) || w.en, tr: (L && L[1]) || w.tr || "",
            key: w.key, keys: (w.keys && w.keys.length ? w.keys : [w.key]),
            per10k: per10k(form), reach: 0, example: null, curated: !!L,
          });
        }
        e.reach++;
        // the shortest sentence carrying it — that is the one worth showing
        if (!e.example || (s.words || []).length < (e.example.words || []).length) e.example = s;
      });
    });
    return (ctx._wordIdx = m);
  }

  /* The vocabulary burst: highest probability of use FIRST, and only words he
     does not already hold. Words the coming week's lessons will teach anyway are
     excluded — the burst exists to get ahead of the ladder, not to duplicate it. */
  function vocabBurst(ctx, opts) {
    opts = opts || {};
    const srs = ctx.srs || {};
    /* A burst is ADDITIVE or it is nothing. Everything any lesson owns is skipped
       here rather than by the caller, so the guarantee holds wherever this is
       called from: a burst that teaches a word the ladder was going to teach a
       fortnight later is not an accelerator, it is a duplicate. */
    if (!ctx._ladderKeys) ctx._ladderKeys = new Set((ctx.curriculum.milestones || [])
      .flatMap(ms => (ms.lessons || []).flatMap(l => l.keys || [])));
    const skip = new Set([...ctx._ladderKeys, ...(opts.exclude || [])]);
    const out = [];
    wordIndex(ctx).forEach(w => {
      if (!w.per10k) return;                                  // unmeasured is not "high probability"
      if (!w.curated) return;                                 // no curated gloss = not a vocabulary entry
      if (isRetired(w.key, ctx)) return;                       // he has told us to stop
      if (((srs[w.key] || {}).box || 0) >= SOLID_BOX) return;  // already his
      if (w.keys.some(k => skip.has(k))) return;               // something else already teaches it
      out.push(w);
    });
    out.sort((a, b) => (b.per10k - a.per10k) || (b.reach - a.reach));
    return out.slice(0, opts.n || BURST_WORDS);
  }

  /* The grammar burst: the unseen pattern with the widest reach across the bank,
     preferring one this week's own sentences actually use so the rule lands on
     material he is about to meet. Returns the pattern id; grammar.json supplies
     the explanation, exactly as the in-lesson gate does. */
  function grammarBurst(ctx, opts) {
    opts = opts || {};
    const seen = new Set((ctx.log || []).filter(e => e && e.e === "pattern-seen").map(e => e.pattern));
    const reach = new Map();
    ((ctx.bank && ctx.bank.sentences) || []).forEach(s => {
      if (!s.pattern || seen.has(s.pattern)) return;
      reach.set(s.pattern, (reach.get(s.pattern) || 0) + 1);
    });
    if (!reach.size) return null;
    const soon = new Set((opts.sentences || []).map(s => s.pattern).filter(p => p && !seen.has(p)));
    const rank = p => [soon.has(p) ? 0 : 1, -(reach.get(p) || 0)];
    let best = null;
    reach.forEach((n, p) => { if (!best || cmp(rank(p), rank(best)) < 0) best = p; });
    return best && (reach.get(best) || 0) >= 2 ? best : null;
  }

  /* What to interleave into ONE week, as insertion points its renderer can use.
     Returns [] rather than a half-full burst when there is nothing worth the
     slot — a burst that teaches four words he half-knows is worse than none. */
  function burstsFor(week, ctx) {
    if (!week) return [];
    const weekKeys = new Set(week.lessons.flatMap(x => x.lesson.keys || []));
    const out = [];
    const words = vocabBurst(ctx, {});
    if (words.length >= 4) out.push({ kind: "vocab", at: BURST_AT.vocab, words, mins: 4 });
    const sents = sentencesFor([...weekKeys], ctx, { limit: 12, maxWords: 999 });
    const pat = grammarBurst(ctx, { sentences: sents });
    if (pat) out.push({ kind: "grammar", at: BURST_AT.grammar, pattern: pat, mins: 3 });
    return out;
  }

  /* ---------- what he actually holds ----------
     His ask (2026-08-29): "if i do have a vocabulary of a certain number of
     words and if i can also say a certain number of sentences or at least
     understand it then things should start to make sense."

     So the site states the two inventories plainly. WORDS are single-word cards;
     SENTENCES are whole utterances (the phrase deck and story sentences) — those
     are what turn vocabulary into speech. Both counted at box >= 3 (held), with
     box >= 5 called out separately as long-term. */
  /* `s:` is the sentence bank's own namespace (Qur'an ayah units, story
     sentences, verb frames); ph- and story- sentences predate it and keep their
     original keys so his history carries over. */
  const isSentenceKey = k => k.startsWith("s:") || k.startsWith("ph-") || /^story-\d+:/.test(k) || k.startsWith("gt:");
  function inventory(ctx) {
    const srs = ctx.srs || {};
    let words = 0, wordsLong = 0, sents = 0, sentsLong = 0;
    for (const k in srs) {
      const b = (srs[k] || {}).box || 0;
      if (b < SOLID_BOX) continue;
      if (isSentenceKey(k)) { sents++; if (b >= 5) sentsLong++; }
      else { words++; if (b >= 5) wordsLong++; }
    }
    /* Comprehension thresholds are the standard vocabulary-coverage findings
       (Nation 2006; van Zeeland & Schmitt 2013): understanding rises slowly and
       then sharply once coverage passes ~95%. Stated as what he can DO, never as
       a percentage of a goal he hasn't reached. */
    const nextBand = words < 250 ? { at: 250, say: "everyday sentences start holding together" }
      : words < 500 ? { at: 500, say: "you follow the gist of simple spoken Arabic" }
      : words < 1000 ? { at: 1000, say: "most ordinary conversation becomes followable" }
      : null;
    return { words, wordsLong, sentences: sents, sentencesLong: sentsLong, nextBand, toMaster: toMaster(ctx, srs) };
  }

  /* ---------- X × Y: the whole thing to be mastered, counted ----------
     His ask, 2026-08-30: "i also want to know the list of sentences then the
     times of its variants. so something like X sentences and Y variants. so
     X x Y to be mastered."

     Counted separately per track, because they differ in kind and averaging them
     would be a lie: an ayah is fixed revelation and is never conjugated, so the
     Qur'an track has no variants at all. The everyday track is where X × Y is
     real — a frame times its person/tense cells.

     The Qur'an total is not a guess either. It is the corpus behind his own
     definition of the goal: Al-Fatiha + juz' 'Amma, the short surahs. */
  function toMaster(ctx, srs) {
    const bank = (ctx.bank && ctx.bank.sentences) || [];
    if (!bank.length) return null;
    const held = k => ((srs || {})[k] || {}).box >= SOLID_BOX;

    const quran = bank.filter(s => s.track === "quran");
    const conv = bank.filter(s => s.track !== "quran");
    const frames = conv.filter(s => (s.vary || []).length);
    const variants = frames.reduce((a, s) => a + s.vary.length, 0);
    // a plain sentence is one utterance; a frame is as many as it has cells
    const convTotal = conv.length - frames.length + variants;

    return {
      quran: { sentences: quran.length, held: quran.filter(s => held(s.key)).length, variants: 0 },
      conv: {
        sentences: conv.length, held: conv.filter(s => held(s.key)).length,
        frames: frames.length,
        variantsPerFrame: frames.length ? Math.round(variants / frames.length) : 0,
        utterances: convTotal,
      },
      total: quran.length + convTotal,
    };
  }

  /* ---------- pace ----------
     Reported because he asked for it, but deliberately secondary: the milestone
     is the achievement, the week is only how the plan was drawn. He also asked
     to be told WHY, since the two causes deserve opposite responses. */
  function pace(ctx, state) {
    state = state || milestoneState(ctx);
    const now = ctx.now || Date.now();
    const cur = state.current;
    const perWeek = (ctx.curriculum.planning && ctx.curriculum.planning.minPerWeek) || 50;

    /* The clock starts when the LADDER starts — the first chunk walked or test
       sat — NOT at his first-ever logged event. He had months of history before
       this curriculum existed, and measuring against that reported "6.1 weeks
       behind" before he had done a single thing, which is both wrong and
       dispiriting. Before he starts, there is no pace to report at all. */
    let planStart = 0;
    for (const e of (ctx.log || [])) {
      if (!e || !e.t || e.t < 16e11) continue;
      if (e.e !== "chunk-done" && e.e !== "exam-done" && e.e !== "exam-start") continue;
      if (!planStart || e.t < planStart) planStart = e.t;
    }
    if (!cur) return { known: false };
    if (!planStart) return { known: false, notStarted: true };

    // pace only becomes meaningful once there is a week of it to measure
    const elapsedWeeks = (now - planStart) / (7 * DAY);
    if (elapsedWeeks < 1) return { known: false, tooEarly: true, elapsedWeeks };

    // where the plan expected him to be by now, measured from the FIRST milestone
    const startWeek = (state.milestones[0] && state.milestones[0].plannedWeek) || 1;
    const weeksAhead = (cur.plannedWeek - startWeek) - elapsedWeeks;

    const mins = [];
    for (let i = 1; i <= 3; i++) mins.push(activeMinutesBetween(ctx.log, now - i * 7 * DAY, now - (i - 1) * 7 * DAY));
    const typical = mins.slice().sort((a, b) => a - b)[1];

    let reason;
    if (weeksAhead > 0.5) {
      const knewIt = state.achieved.reduce((a, m) => a + m.lessons.filter(l => l.provedByTest && l.solid < l.total).length, 0);
      reason = knewIt >= 2
        ? "mostly because you already knew a lot of it — worth telling me, so I can start you higher"
        : "you are getting through it faster than the plan assumed";
    } else if (weeksAhead < -0.5) {
      reason = typical < perWeek * 0.5
        ? "and it is time, not difficulty — about " + Math.round(typical) + " min a week against the ~" + perWeek + " the plan assumes"
        : "and it is not the time — you are putting the minutes in, so the material is the hard part and I should slow the steps down";
    } else reason = "right on the plan";

    return {
      known: true,
      weeksAhead: Math.round(weeksAhead * 10) / 10,
      state: weeksAhead > 0.5 ? "ahead" : weeksAhead < -0.5 ? "behind" : "on track",
      typicalMin: Math.round(typical), perWeek, reason,
      achievedCount: state.achieved.length, total: state.milestones.length,
    };
  }

  /* ---------- the milestone test ----------
     Sectioned BY LESSON, so a section he aces marks that lesson mastered and it
     drops out of the milestone. Always open, unlimited retakes, reshuffled per
     attempt so he cannot memorise the paper. */
  /* ONE test engine, three scopes (his question, 2026-08-29: "one test for each
     lesson with a weekly test?"). Every question belongs to a lesson and is
     scored per lesson at PASS; only the SELECTION differs:
        · one lesson   — a sub-test
        · a week       — everything unproved on that week's shelf
        · a milestone  — everything unproved in the capability
     Clearing a lesson clears it everywhere, so the wider scopes simply stop
     asking about it. There is no separate kind of "weekly exam" to maintain. */
  function examForLessons(lessonIds, ctx, opts) {
    opts = opts || {};
    const want = new Set(lessonIds);
    const state = opts.state || milestoneState(ctx);
    const items = [];
    let seed = (((opts.seed || 1) * 2654435761) ^ ((opts.attempt || 0) * 40503)) % 2147483647;
    if (seed <= 0) seed += 2147483646;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const isQuran = k => k.indexOf("qw:") === 0 || k.indexOf("qc:") === 0;

    for (const m of (ctx.curriculum.milestones || [])) {
      const mState = state.milestones.find(x => x.id === m.id);
      for (const l of (m.lessons || [])) {
        if (!want.has(l.id)) continue;
        l.keys.filter(k => !isRetired(k, ctx)).forEach((k, i) => {
          const form = isQuran(k) ? (i % 2 === 0 ? "ear" : "mean") : (i % 3 === 0 ? "ear" : i % 3 === 1 ? "mean" : "prod");
          items.push({ key: k, lessonId: l.id, lessonTitle: l.title, milestoneId: m.id, section: l.id, form });
        });
      }
    }
    /* A LESSON TEST SHOULD FILL ITS 3 MINUTES. A six-word lesson would otherwise
       be six questions and over in ninety seconds. So when one lesson is being
       tested and there is room, each word is asked a SECOND time in a different
       form — recognition and production are different skills, and testing both is
       a better proof than testing one twice as fast. */
    const single = new Set(items.map(i => i.lessonId)).size === 1;
    if (single) {
      const room = ((ctx.curriculum.planning || {}).maxLessonTestItems || 9) - items.length;
      if (room > 0) {
        const second = { ear: "mean", mean: "prod", prod: "ear" };
        for (const it of items.slice(0, room)) {
          items.push(Object.assign({}, it, { form: second[it.form] || "mean", second: true }));
        }
      }
    }

    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = items[i]; items[i] = items[j]; items[j] = t;
    }

    /* NO TEST OVER ~7 MINUTES (his rule). A week's seven lessons hold ~42 items,
       which would be a 15-minute sit. So a wide test SAMPLES — evenly across the
       lessons, so every lesson is still represented and still scored. A lesson
       needs enough questions for its score to mean anything: below CLEAR_MIN it
       is reported but cannot clear the lesson, and the per-lesson test (which is
       never sampled) stays the reliable way to prove one. */
    /* A lesson test is ~3 minutes, a wider one ~7 (his rule). At roughly 20
       seconds a question that is 9 items and 20 items respectively. */
    const pl = ctx.curriculum.planning || {};
    const lessonCount = new Set(items.map(i => i.lessonId)).size;
    const cap = lessonCount <= 1 ? (pl.maxLessonTestItems || 9) : (pl.maxTestItems || 20);
    let sampled = items, clearable = true;
    if (items.length > cap) {
      const byLesson = new Map();
      for (const it of items) (byLesson.get(it.lessonId) || byLesson.set(it.lessonId, []).get(it.lessonId)).push(it);
      const per = Math.max(1, Math.floor(cap / byLesson.size));
      sampled = [];
      for (const arr of byLesson.values()) sampled.push(...arr.slice(0, per));
      let i = 0;
      for (const arr of byLesson.values()) { if (sampled.length >= cap) break; if (arr[per]) sampled.push(arr[per]); i++; }
      clearable = per >= CLEAR_MIN;
    }
    return {
      total: sampled.length, items: sampled, passMark: PASS,
      sampled: sampled.length < items.length, clearable,
      minutes: Math.max(1, Math.round(sampled.length * 20 / 60)),
    };
  }

  function milestoneExam(ms, ctx, opts) {
    opts = opts || {};
    const only = opts.lessonIds && opts.lessonIds.length ? new Set(opts.lessonIds) : null;
    const src = (ctx.curriculum.milestones || []).find(m => m.id === ms.id) || ms;
    const items = [];
    let seed = (((ms.order || 1) * 2654435761) ^ ((opts.attempt || 0) * 40503)) % 2147483647;
    if (seed <= 0) seed += 2147483646;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const isQuran = k => k.indexOf("qw:") === 0 || k.indexOf("qc:") === 0;

    /* NOT REPETITIVE (his rule): a lesson already proved is not re-tested, EXCEPT
       when its re-verification has come due — and then only a sample of it, so a
       long-term check costs a few questions rather than a whole re-sit. Learning
       mode may repeat freely; the TEST is where repetition is wasteful. */
    const stateById = {};
    for (const l of (ms.lessons || [])) stateById[l.id] = l;

    for (const l of (src.lessons || [])) {
      if (only && !only.has(l.id)) continue;
      const st = stateById[l.id];
      let keys = l.keys;
      if (st && st.mastered && !only) {
        if (!st.reverifyDue) continue;                       // proved and still fresh — skip entirely
        keys = l.keys.slice(0, Math.max(2, Math.ceil(l.keys.length * 0.3)));   // a spot-check only
      }
      keys.filter(k => !isRetired(k, ctx)).forEach((k, i) => {
        // at least half of Qur'an-track items by EAR — the honest gap
        const form = isQuran(k) ? (i % 2 === 0 ? "ear" : "mean") : (i % 3 === 0 ? "ear" : i % 3 === 1 ? "mean" : "prod");
        items.push({ key: k, lessonId: l.id, lessonTitle: l.title, section: l.id, form });
      });
    }
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = items[i]; items[i] = items[j]; items[j] = t;
    }
    return { milestoneId: ms.id, total: items.length, items, passMark: PASS };
  }

  /* Overall score, plus one score PER LESSON (that is what clears a lesson), plus
     the by-ear split stated separately. */
  function milestoneScoreOf(answers) {
    const by = {};
    for (const a of answers) {
      const b = by[a.lessonId] || (by[a.lessonId] = { ok: 0, n: 0, title: a.lessonTitle });
      b.n++; if (a.ok) b.ok++;
    }
    const lessons = {}, titles = {};
    for (const id in by) { lessons[id] = Math.round(100 * by[id].ok / by[id].n); titles[id] = by[id].title; }
    const ear = answers.filter(a => a.form === "ear");
    const correct = answers.filter(a => a.ok).length;
    return {
      score: Math.round(100 * correct / (answers.length || 1)), correct, total: answers.length,
      lessons, lessonTitles: titles,
      cleared: Object.keys(lessons).filter(id => lessons[id] >= PASS),
      sections: { ear: ear.length ? Math.round(100 * ear.filter(a => a.ok).length / ear.length) : null },
    };
  }


  /* ---------- weeks as a GROUPING, not a deadline ----------
     His ask: "shouldnt it show week 1 and week 2 lessons with the ability to do
     any of the week1 lessons and do the sub test for each lesson" — then "in
     fact shouldnt it show the 4 weeks worth of lessons".

     So lessons are packed into ~50-minute weeks, in ladder order, deterministically
     (the packing never shifts as he progresses — week 3 is always the same lessons).
     A week is a shelf of work he can pick from in any order, NOT a deadline: the
     milestone is still what gets achieved, and nothing is ever late. */
  function weekPlan(ctx, state) {
    state = state || milestoneState(ctx);
    const pl = ctx.curriculum.planning || {};
    const perWeek = pl.lessonsPerWeek || 7;          // seven 7-minute lessons
    const minsEach = pl.minPerLesson || 7;
    const quranPerWeek = pl.quranPerWeek || 4;

    /* EVERY WEEK MIXES BOTH TRACKS (his rule, 2026-08-29: "the week needs to be
       split between quranic and everyday language"). Drawing straight down the
       ladder gave whole weeks of one track. So each track keeps its own queue and
       a week is dealt from both — Qur'an slightly heavier, because it is his
       ranked-first goal.

       Class material comes FIRST — but first WITHIN ITS OWN TRACK, not ahead of
       the whole week. A single class can be thirteen lessons (30 Aug was), and
       letting it head the week outright emptied the Qur'an half for a month,
       which breaks the rule above. So a teacher lesson jumps its track's queue
       and the mix is preserved. Both of his rules survive. */
    const quran = [], conv = [];
    const tQuran = [], tConv = [];
    for (const m of state.milestones) {
      for (const l of m.lessons) {
        const row = { milestone: m, lesson: l, mins: minsEach };
        const isTeacher = m.source === "teacher" || m.track === "teacher";
        const isQuran = m.track === "quran";
        (isTeacher ? (isQuran ? tQuran : tConv) : (isQuran ? quran : conv)).push(row);
      }
    }
    // class material sits at the head of its own track's queue
    quran.unshift(...tQuran);
    conv.unshift(...tConv);

    const weeks = [];
    while (quran.length || conv.length) {
      const slot = { week: weeks.length + 1, lessons: [], mins: 0 };
      let q = 0, c = 0;
      while (slot.lessons.length < perWeek && (quran.length || conv.length)) {
        // keep the ratio honest as the week fills, and fall back to whichever
        // queue still has work when one runs dry
        const wantQuran = quran.length && (!conv.length || q * (perWeek - quranPerWeek) <= c * quranPerWeek);
        if (wantQuran) { slot.lessons.push(quran.shift()); q++; }
        else if (conv.length) { slot.lessons.push(conv.shift()); c++; }
        else break;
      }
      slot.mins = slot.lessons.length * minsEach;
      slot.quran = slot.lessons.filter(x => x.milestone.track === "quran").length;
      slot.conv = slot.lessons.length - slot.quran;
      weeks.push(slot);
      if (slot.lessons.length === 0) break;
    }
    for (const wk of weeks) {
      wk.done = wk.lessons.every(x => x.lesson.mastered);
      wk.provedCount = wk.lessons.filter(x => x.lesson.mastered).length;
    }
    return weeks;
  }

  /* The week he is actually on: the first that still has something unproved. */
  function currentWeek(weeks) {
    const i = weeks.findIndex(w => !w.done);
    return i === -1 ? weeks.length : i + 1;
  }

  /* The next unfinished chunk of ONE named lesson (he can pick any lesson,
     not just whatever Continue would have chosen). */
  function nextChunkOfLesson(lessonId, ctx) {
    for (const m of (ctx.curriculum.milestones || [])) {
      const l = (m.lessons || []).find(x => x.id === lessonId);
      if (!l) continue;
      const chunks = lessonChunks(l);
      return { milestoneId: m.id, lesson: l, chunks, chunk: chunks.find(c => !chunkDone(c.id, ctx.log)) || null };
    }
    return null;
  }


  /* ---------- what you scored last time ----------
     His question (2026-08-30): "when i take a test will it display the last score
     on it?" — yes. A test is identified by its SCOPE (the exact set of lessons it
     covers), so retaking the same lesson or the same week lines up into a run of
     scores he can watch move. That was the whole point of unlimited retakes. */
  const scopeKey = lessonIds => lessonIds.slice().sort().join("|");

  function scopeHistory(log, lessonIds) {
    const key = scopeKey(lessonIds);
    const runs = (log || [])
      .filter(e => e && e.e === "exam-done" && typeof e.score === "number" && e.scope === key)
      .sort((a, b) => a.t - b.t);
    if (!runs.length) return null;
    const scores = runs.map(r => r.score);
    return {
      attempts: runs.length, scores,
      last: scores[scores.length - 1],
      best: Math.max.apply(null, scores),
      first: scores[0],
      gain: scores[scores.length - 1] - scores[0],
      at: runs[runs.length - 1].t,
    };
  }

  return {
    SOLID_BOX, expandBasket, evalCriterion, trackLevel, levels,
    examKind, examScope, examResults, examAttempts, examTrajectory, examBuild, examScoreOf, examBand, examVerdict, levelSummary, groupOf,
    weekHistory, weekSize, weekProgress, weekLearned, weekObjectives, weekKeys, weekBounds, weekSelfSeed, activeMinutesBetween,
    PASS, CLEAR_MIN, CHUNK_MODES, milestoneState, lessonState, lessonScores, lessonChunks, chunkDone,
    nextChunk, nextChunkOfLesson, weekPlan, currentWeek, examForLessons, scopeKey, scopeHistory, reviewsFor, inventory, pace, milestoneExam, milestoneScoreOf,
    SENTENCE_MAX, sentencesFor, reviewSentencesFor, weakWords, grammarToShow, holdOf, isRetired,
    BURST_WORDS, wordIndex, vocabBurst, grammarBurst, burstsFor,
  };
});
