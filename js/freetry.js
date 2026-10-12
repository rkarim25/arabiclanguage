/* ============================================================================
   FREE TRY — the coach's engine for "what should he try next?" (js/freetry.js)

   Reza, 2026-10-12: "free try needs to have a clever engine that builds from my
   practised sentences and vocabulary based on what I know and practise. It
   should have a level of difficulty but also not so difficult that I can't do
   it… that really is the essence of the coach where you adjust these sentences
   to try and get me to be proficient quicker."

   Three ideas from the learning science, each measurable here:

   1. COMPREHENSIBLE INPUT, i+1 (Krashen). A sentence is a good try when he
      already holds nearly all of it and it stretches him by ONE thing: one new
      word, or a word that has gone due. His knowledge of each word is the
      scheduler's recall-right-now (js/srs.js): known ≥ 0.6, due < 0.6, new =
      never carded. Lexical gate: at most 1 new word, at most 2 due.

   2. DESIRABLE DIFFICULTY (Bjork) at a success rate of about 3 in 4. Every
      sentence has a STRUCTURAL difficulty d (length, rarity of its words in real
      Arabic, the grammar frame it needs, Qur'anic register) and he has an
      ABILITY θ on the same scale, estimated from his own tries: a pass on a hard
      sentence raises θ, a miss on an easy one lowers it (a one-parameter logistic
      model, P(pass) = σ(θ − d), updated event by event from his log — nothing is
      stored, so it can never drift from the evidence). The engine aims at the
      sweet spot d ≈ θ − 1.1 (P ≈ 0.75), never above θ − 0.4 (P ≈ 0.6).

   3. RETRIEVAL + INTERLEAVING. Sentences carrying a word that is due for review
      are preferred (the review happens inside a sentence, not on a card), the
      current homework contract's words jump the queue, a sentence he MISSED in
      the last day comes back first, and one he passed today does not.

   Composition of a batch of 10: ≤2 retries · ~5 stretches (one new / due word)
   · ~3 consolidations (all known, a little easier) · best of the rest. If the
   gates leave too few, they relax step by step — a batch is never empty while
   the bank has anything he can mostly do.

   Pure functions; node scripts/test-freetry.js pins the behaviour.
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FreeTry = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DAY = 86400000;
  const P = {
    known: 0.75,             // recall-right-now at which a word counts as held for a sentence (below it: due — reviewed inside a sentence)
    sweet: 1.1,              // d = θ − sweet → P(pass) ≈ 0.75
    ceiling: 0.4,            // never harder than θ − ceiling (P ≈ 0.6)
    theta0: 3.5,             // a learner we know nothing about: 3-word everyday sentences at ~75%
    K: { mic: 0.35, typed: 0.35, self: 0.2 },
    lookbackDays: 60,
    maxNew: 1, maxDue: 2, minKnown: 0.6,
    frame: { "-": 0.5, nominal: 0.3, demonstratives: 0.4, have: 0.6, wujud: 0.6, questions: 0.7, idafa: 0.8, connectors: 0.8,
      pronouns: 0.9, imperative: 0.9, "prep-pron": 1.0, negation: 1.0, tenses: 1.1, "past-tu": 1.1, ordinals: 1.0, gender: 0.8,
      kana: 1.2, dual: 1.2, plurals: 1.3, inna: 1.3, "who-acts": 1.3, alladhina: 1.6 },
  };
  const sig = x => 1 / (1 + Math.exp(-x));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const strip = s => String(s || "").replace(/[ً-ْٰـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/[^؀-ۿ\s]/g, "").trim();
  const tokens = ar => strip(ar).split(/\s+/).filter(Boolean);

  /* ---------- word knowledge: recall right now, from the scheduler ---------- */
  function recall(card, now) {
    if (!card) return 0;
    if (card.b === "never") return 1;
    if (!card.u) return 0;
    if (typeof card.s === "number") return Math.pow(0.9, Math.max(0, now - card.u) / DAY / Math.max(0.05, card.s));
    const BOX = [0, 1, 3, 7, 14, 30];                      // legacy card: its box as a half-life
    const h = Math.max(1, (BOX[card.box] || 0) * 5) * DAY;
    return Math.pow(2, -Math.max(0, now - card.u) / h);
  }
  /* a word's best card among its keys (twins) */
  function wordState(keys, srs, now) {
    let best = null, bestR = -1;
    (keys || []).forEach(k => { const c = srs[k]; if (!c) return; const r = recall(c, now); if (r > bestR) { bestR = r; best = c; } });
    if (!best) return { r: 0, state: "new" };
    return { r: bestR, state: bestR >= P.known ? "known" : "due" };
  }
  /* rarity of a word in real Arabic, 0 (very common) … 1 (rare / unseen) */
  function rarity(tok, freq) {
    // attached forms (بِالقِطَارِ، لِلْعَائِلَةِ، وَأَنَا) are looked up by their bare word too
    const cands = [tok];
    let t = tok;
    if (/^[وف]/.test(t) && t.length > 3) { t = t.slice(1); cands.push(t); }
    if (/^[بلك]/.test(t) && t.length > 3) { cands.push(t.slice(1)); if (/^لل/.test(t)) cands.push("ال" + t.slice(2)); t = t.slice(1); }
    if (/^ال/.test(t) && t.length > 3) cands.push(t.slice(2));
    const f = Math.max(...cands.map(c => (c.length >= 2 ? (freq[c] || 0) : 0)));
    return clamp(1 - Math.log10(1 + f) / Math.log10(51), 0, 1);   // 50 per 10k → 0
  }

  /* ---------- the two scales ---------- */
  function features(s, ctx) {
    const toks = tokens(s.ar);
    const n = toks.length || 1;
    const freq = ctx.freq || {};
    const rar = toks.reduce((a, t) => a + rarity(t, freq), 0) / n;
    const frame = P.frame[s.pattern || "-"] != null ? P.frame[s.pattern || "-"] : 0.9;
    const quran = s.track === "quran" ? 0.5 : 0;
    const dStruct = 0.5 * n + 1.5 * rar + 0.8 * frame + quran;
    // lexical state per word: keys from the bank, else resolved by the page
    const keysPerWord = (s.wk && s.wk.length) ? s.wk
      : (s.words || []).map(w => { const ar = Array.isArray(w) ? w[0] : (w && w.ar); const k = ctx.wordKeyFor ? ctx.wordKeyFor(ar) : null; return [k, ar, strip(ar).replace(/^ال/, ""), "tw:" + strip(ar).replace(/^ال/, "")].filter(Boolean); });
    let known = 0, due = 0, fresh = 0;
    const gaps = [];
    keysPerWord.forEach((keys, i) => {
      const st = wordState(keys, ctx.srs, ctx.now);
      if (st.state === "known") known++; else if (st.state === "due") { due++; gaps.push({ i, why: "due" }); } else { fresh++; gaps.push({ i, why: "new" }); }
    });
    const total = keysPerWord.length || 1;
    return { n, rarity: rar, frame, dStruct, known, due, fresh, total, knownShare: known / total, gaps };
  }
  function difficulty(s, ctx) { return features(s, ctx).dStruct; }

  /* every try he has made on a sentence the bank knows, oldest first:
     sent-drill by key (Try it), sent-drill by chapter+line (the Daily Reader's
     🎯, logged as chap/idx), and spoken prompts graded by the mic (score ≥ 0.5) */
  function triesOf(pool, ctx) {
    const byKey = new Map(pool.map(s => [s.key, s]));
    const byEn = new Map(pool.map(s => [String(s.en).trim().toLowerCase(), s.key]));
    const since = ctx.now - P.lookbackDays * DAY;
    const out = [];
    (ctx.log || []).forEach(x => {
      if (!x || x.t < since) return;
      if (x.e === "sent-drill") {
        const key = x.key || (x.chap != null && x.idx != null ? "chap:" + String(x.chap).replace(/^chap-/, "") + ":" + x.idx : null);
        if (key && byKey.has(key)) out.push({ key, ok: !!x.ok, how: x.how || "self", t: x.t });
      } else if (x.e === "prompt" && typeof x.score === "number" && x.en && !x.via) {   // via: a Try it prompt — its sent-drill is already counted
        const key = byEn.get(String(x.en).trim().toLowerCase());
        if (key) out.push({ key, ok: x.score >= 0.5, how: "mic", t: x.t });
      }
    });
    return out.sort((a, b) => a.t - b.t);
  }
  /* ability θ, replayed from his own tries (oldest first) */
  function ability(pool, ctx) {
    const byKey = new Map(pool.map(s => [s.key, s]));
    const ev = triesOf(pool, ctx);
    let theta = P.theta0, n = 0;
    ev.forEach(x => {
      const d = difficulty(byKey.get(x.key), ctx);
      const p = sig(theta - d);
      const K = P.K[x.how] || P.K.self;
      theta += x.ok ? K * (1 - p) : -K * p;
      n++;
    });
    return { theta: clamp(theta, 1, 12), tries: n };
  }

  /* ---------- grammar: where is he weak, and what has he never met? ----------
     Reza, 12 Oct: "it also needs to understand where the weakness of my grammar
     could be and design sentences in a way which makes me absorb the essential
     grammar." Evidence per frame: his tries on sentences of that frame (recent
     ones count more) and his grammar-page tests (gtest-done). Weakness is the
     miss rate; a frame with no evidence is an UNKNOWN worth one sentence per
     batch, in the order a learner needs them. */
  const ESSENTIAL = ["nominal", "idafa", "have", "questions", "demonstratives", "negation", "pronouns", "tenses", "prep-pron",
    "connectors", "past-tu", "kana", "ordinals", "plurals", "imperative", "gender", "inna", "dual", "wujud", "who-acts", "alladhina"];
  /* every frame a sentence exercises: stamped by the pipeline (frames), else its label, else tagged on the spot */
  const framesOf = s => {
    if (s.frames && s.frames.length) return s.frames;
    if (s.pattern && s.pattern !== "-") return [s.pattern];
    const Fr = (typeof Frames !== "undefined" && Frames) || (typeof require === "function" ? (() => { try { return require("./frames.js"); } catch (e) { return null; } })() : null);
    return Fr ? Fr.detect(s.ar).frames : [];
  };
  const primaryOf = s => (s.pattern && s.pattern !== "-") ? s.pattern : (framesOf(s)[0] || null);
  function grammarProfile(pool, ctx) {
    const byKey = new Map(pool.map(s => [s.key, s]));
    const since = ctx.now - P.lookbackDays * DAY;
    const prof = {};
    const touch = p => (prof[p] = prof[p] || { tries: 0, passes: 0, w: 0, wPass: 0, tests: 0, testScore: 0 });
    triesOf(pool, ctx).forEach(x => {
      const s = byKey.get(x.key);
      const prim = primaryOf(s);
      const w0 = 0.5 + 0.5 * (x.t - since) / (ctx.now - since);   // recent tries weigh up to 2× old ones
      // a try is evidence for EVERY frame the sentence exercises: the label at full weight, the rest at half
      framesOf(s).forEach(p => {
        const w = p === prim ? w0 : w0 * 0.5;
        const r = touch(p);
        r.tries += p === prim ? 1 : 0.5; r.w += w; if (x.ok) { r.passes += p === prim ? 1 : 0.5; r.wPass += w; }
      });
    });
    (ctx.log || []).forEach(x => {
      if (x && x.t >= since && x.e === "gtest-done" && x.g && x.total) { const r = touch(x.g); r.tests++; r.testScore += x.score / x.total; }
    });
    const out = {};
    ESSENTIAL.concat(Object.keys(prof)).forEach(p => {
      if (out[p]) return;
      const r = prof[p];
      if (!r || (!r.tries && !r.tests)) { out[p] = { weakness: 0.5, evidence: 0, unseen: true }; return; }
      const tryMiss = r.w ? 1 - r.wPass / r.w : null;
      const testMiss = r.tests ? 1 - r.testScore / r.tests : null;
      const parts = [tryMiss, testMiss].filter(v => v !== null);
      const weakness = parts.reduce((a, b) => a + b, 0) / parts.length;
      out[p] = { weakness: Math.round(weakness * 100) / 100, evidence: r.tries + r.tests, unseen: false, passRate: r.tries ? Math.round(100 * r.passes / r.tries) : null };
    });
    // the focus: the weakest frame with real evidence (≥ 3 tries) — else the first essential frame never met
    const seen = Object.entries(out).filter(([, v]) => !v.unseen && v.evidence >= 3).sort((a, b) => b[1].weakness - a[1].weakness);
    const unseen = ESSENTIAL.filter(p => out[p] && out[p].unseen);
    const focus = seen.length && seen[0][1].weakness >= 0.3 ? seen[0][0] : (unseen[0] || (seen.length ? seen[0][0] : null));
    return { profile: out, focus, introduce: unseen.find(p => p !== focus) || null };   // the new-grammar slot is never the focus again
  }

  /* ---------- the plan ---------- */
  function plan(pool, ctx) {
    ctx = Object.assign({ now: Date.now(), srs: {}, log: [], freq: {}, homework: new Set(), size: 10 }, ctx || {});
    const { theta, tries } = ability(pool, ctx);
    const sweet = theta - P.sweet - (ctx.sweetShift || 0), ceiling = theta - P.ceiling - (ctx.sweetShift || 0);
    const dayAgo = ctx.now - DAY, weekAgo = ctx.now - 7 * DAY;
    const lastTry = new Map();
    triesOf(pool, ctx).forEach(x => { if (x.t > weekAgo) { const prev = lastTry.get(x.key); if (!prev || x.t > prev.t) lastTry.set(x.key, x); } });
    const hw = ctx.homework instanceof Set ? ctx.homework : new Set(ctx.homework || []);
    // a caller's priority (the morning after a commute, his own day's lines): a function or a map, per key
    const bst = typeof ctx.boost === "function" ? ctx.boost : (ctx.boost && typeof ctx.boost === "object") ? (k => ctx.boost[k] || 0) : (() => 0);

    const rows = [];
    pool.forEach(s => {
      if (!s || !s.ar || !s.key) return;
      const c = ctx.srs[s.key];
      if (c && c.b === "never") return;
      const f = features(s, ctx);
      const last = lastTry.get(s.key);
      if (!ctx.includeRecent && last && last.ok && last.t > dayAgo) return;   // passed today → not again today (a rehearse asks for them)
      const retry = !!(last && !last.ok && last.t > dayAgo);
      const hwHit = (s.wk || []).some(keys => keys.some(k => hw.has(k))) || hw.has(s.key);
      const useful = Math.log(1 + (s.use || 0));
      rows.push({ s, f, retry, hwHit, useful, recentPass: !!(last && last.ok) });
    });

    const G = grammarProfile(pool, ctx);
    const pat = r => primaryOf(r.s);
    const exercises = (r, p) => !!p && framesOf(r.s).includes(p);
    // the sentence's weakest exercised frame drives its grammar value
    const gw = r => framesOf(r.s).reduce((m, p) => Math.max(m, G.profile[p] ? G.profile[p].weakness : 0), 0);
    const score = r => {
      const dist = Math.abs(r.f.dStruct - sweet);
      const p = pat(r);
      return -dist + (r.hwHit ? 1.5 : 0) + (r.f.due > 0 ? 0.8 : 0) + (r.f.fresh === 1 ? 0.6 : 0) + 0.4 * r.useful
        + 1.2 * gw(r) + (exercises(r, G.focus) ? 0.8 : 0) + (exercises(r, G.introduce) ? 0.6 : 0)
        - (r.recentPass ? 1.0 : 0) + (r.retry ? 3 : 0) + (Number(bst(r.s.key)) || 0) + Math.random() * 0.3;
    };
    // the gates, relaxed step by step so a batch is never empty
    const gates = [
      // a review inside a sentence is worth a slightly harder sentence (+0.5 when a word is due)
      r => r.f.fresh <= P.maxNew && r.f.due <= P.maxDue && r.f.knownShare >= P.minKnown && r.f.dStruct <= ceiling + (r.f.due > 0 ? 0.5 : 0),
      r => r.f.fresh <= P.maxNew && r.f.due <= P.maxDue && r.f.knownShare >= P.minKnown,
      r => r.f.fresh <= 2 && r.f.knownShare >= 0.5,
      r => r.f.knownShare >= 0.34,
      r => true,
    ];
    let ok = [], level = Math.min(gates.length - 1, ctx.relaxFrom || 0);   // a caller may start from a looser gate
    for (; level < gates.length; level++) { ok = rows.filter(gates[level]); if (ok.length >= ctx.size) break; }
    ok.forEach(r => { r.score = score(r); });
    ok.sort((a, b) => b.score - a.score);

    // composition: retries · grammar focus · one new frame · stretches · consolidations · best of the rest
    // — never more than 4 of one frame in a batch (interleaving beats blocking)
    const CAP = Math.max(3, Math.ceil(ctx.size * 0.4));
    const count = (out, p) => out.filter(r => pat(r) === p).length;
    const take = (pred, n, out, noCap) => { for (const r of ok) { if (out.length >= ctx.size || n <= 0) break; if (out.includes(r) || !pred(r)) continue; const p = pat(r); if (!noCap && p && count(out, p) >= CAP) continue; out.push(r); n--; } };
    const out = [];
    take(r => r.retry, 2, out);
    take(r => exercises(r, G.focus), 3, out);
    take(r => exercises(r, G.introduce), 1, out);
    take(r => r.f.fresh === 1 || r.f.due > 0, 4, out);
    take(r => r.f.fresh === 0 && r.f.due === 0 && r.f.dStruct <= sweet, 3, out);
    take(() => true, ctx.size, out);
    take(() => true, ctx.size, out, true);     // a short bank must not shrink the batch — the cap yields last

    const why = r => {
      const p = pat(r);
      if (r.retry) return "missed yesterday — again";
      if (G.focus && exercises(r, G.focus) && G.profile[G.focus] && !G.profile[G.focus].unseen) return `grammar focus: ${G.focus}${G.profile[G.focus].passRate != null ? ` (you pass ${G.profile[G.focus].passRate}%)` : ""}`;
      if (G.introduce && exercises(r, G.introduce)) return `new grammar: ${G.introduce}`;
      if (r.hwHit) return "homework word";
      if (r.f.fresh === 1) return "one new word";
      if (r.f.due > 0) return `${r.f.due} word${r.f.due > 1 ? "s" : ""} due for review`;
      return r.f.dStruct <= sweet ? "consolidate" : "stretch";
    };
    return {
      list: out.map(r => Object.assign({}, r.s, { _try: { why: why(r), d: Math.round(r.f.dStruct * 10) / 10, p: Math.round(sig(theta - r.f.dStruct) * 100) } })),
      theta: Math.round(theta * 10) / 10, tries, sweet: Math.round(sweet * 10) / 10,
      candidates: ok.length, relaxed: level, gated: rows.length,
      grammar: { focus: G.focus, introduce: G.introduce, profile: G.profile },
      mix: { retry: out.filter(r => r.retry).length, grammar: out.filter(r => !r.retry && (exercises(r, G.focus) || exercises(r, G.introduce))).length,
        stretch: out.filter(r => !r.retry && (r.f.fresh === 1 || r.f.due > 0)).length, consolidate: out.filter(r => !r.retry && r.f.fresh === 0 && r.f.due === 0).length },
    };
  }

  /* how many short sentences (≤ maxWords) exercise each essential frame — the content audit Free try depends on */
  function coverage(pool, maxWords) {
    maxWords = maxWords || 5;
    const out = {};
    ESSENTIAL.forEach(p => { out[p] = { short: 0, all: 0 }; });
    pool.forEach(s => {
      const n = tokens(s.ar).length;
      framesOf(s).forEach(p => { if (!out[p]) return; out[p].all++; if (n <= maxWords) out[p].short++; });
    });
    return out;
  }
  return { P, ESSENTIAL, recall, wordState, rarity, features, difficulty, tries: triesOf, ability, grammarProfile, plan, coverage, framesOf, primaryOf, sigmoid: sig };
});
