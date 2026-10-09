/* ============================================================================
   SRS — the scheduler that owns the interval (Reza's ask, 2026-10-09)

   "I keep trying to judge how frequently the word should repeat — that decision
    should be taken away from me." So the five interval buttons (30d/7d/2d/1d/
   retire) become four VERDICTS and the site does the arithmetic:

       ✗  no      didn't know it
       ≈  maybe   hesitant, partial, needed a second look
       ✓  yes     knew it
       ★  solid   instant, no effort
       ⊘  (don't repeat — unchanged: his explicit "I know this permanently")

   The model is a trimmed FSRS (Jarrett Ye et al.): every card carries a
   STABILITY s = the gap in days at which recall has fallen to 90%, and a
   DIFFICULTY d (1 easy … 10 hard). Recall right now is
       R = 0.9 ^ (days since last review / s).
   A verdict updates s from R, so TIME ACTUALLY SPENT AWAY is what drives the
   schedule, not the calendar and not his guess:
     · five ✓ in one sitting barely move s (R ≈ 1 → nothing was proven yet);
     · a ✓ after a long gap, when R had sunk, is strong evidence → s jumps;
     · ✗ collapses s toward hours and asks again in ten minutes;
     · ≈ holds the card in its band and asks again a little later.

   Everything downstream (curriculum levels, the day plan, the progress chart,
   the solid counts) keeps reading `box` and `due`, which are now PROJECTED from
   s. Honesty guard: a card cannot project above box 1 until it has been
   recalled on two different days — one ★ tap is a claim, not a proof.

   Card fields (all on ats-srs, synced): box, due, u (last write), b ("never" only)
   + s (stability days), d (difficulty), n (distinct-day successes), r (ratings),
   l (lapses), g (last verdict), ls (last success time).
   Legacy cards (no s) are migrated on first touch from their box/due.

   Tests: node scripts/test-srs.js
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SRS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const DAY = 86400000;
  const BOX_DAYS = [0, 1, 3, 7, 14, 30];
  const NEVER_DUE = 4102444800000;
  const GRADES = ["no", "maybe", "yes", "solid"];
  const P = {                       // tunables — refit yearly from his log like progress-model
    target: 0.9,                    // R at which a card is due
    s0: { no: 0.15, maybe: 0.6, yes: 2, solid: 5 },
    d0: { no: 7, maybe: 6, yes: 5, solid: 3.5 },
    G: 1.6, C: 1.5,                 // growth strength / lateness bonus
    growMin: 1.05, growMax: 8, solidBonus: 1.5, solidMax: 12,
    failBase: 0.4, failPow: 0.6,
    relearnMin: 10,                 // minutes until a ✗ card is asked again
    sMin: 0.05, sMax: 3650,
    newDayGap: 12 * 3600000,        // two successes count as separate days if ≥ 12 h apart
    fuzz: 0.05,                     // ±5% on long intervals so reviews don't pile on one day
  };
  const SYMBOL = { no: "✗", maybe: "≈", yes: "✓", solid: "★", retire: "⊘" };
  const TITLE = {
    no: "No — didn't know it", maybe: "Maybe — hesitant or partly", yes: "Yes — knew it",
    solid: "Solid — instant, no effort", retire: "Don't repeat — I know this for good",
  };
  // old bucket ids / old grades → verdicts, and back (callbacks in old pages still get an id)
  const FROM_LEGACY = { strong: "solid", know: "solid", medium: "yes", later: "yes", weak: "maybe",
    learning: "no", repeat: "no", never: "retire", again: "no", hard: "maybe", good: "yes", easy: "solid" };
  const TO_LEGACY = { solid: "strong", yes: "medium", maybe: "weak", no: "repeat", retire: "never" };
  // the bucket NAME the log has always carried on vocab-rate / sentence-rate / bucket events
  const LEGACY_BUCKET = { solid: "strong", yes: "medium", maybe: "weak", no: "learning", retire: "never" };

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  function boxFromS(s, n) {
    let box = 0;
    for (let i = 5; i >= 1; i--) if (s >= BOX_DAYS[i]) { box = i; break; }
    if ((n || 0) < 2) box = Math.min(box, 1);   // one tap is a claim, not a proof
    return box;
  }
  function bandTop(box) { return box >= 5 ? P.sMax : BOX_DAYS[box + 1] - 0.01; }

  /* a card as the scheduler sees it — legacy cards get s/d/n inferred once */
  function migrate(c, now) {
    now = now || Date.now();
    if (!c) return null;
    if (typeof c.s === "number") return c;
    const box = clamp(c.box || 0, 0, 5);
    let s = BOX_DAYS[box] || 0.15;
    if (c.u && c.due && c.due < NEVER_DUE && c.due > c.u) s = clamp((c.due - c.u) / DAY, 0.15, 60);
    c.s = s;
    c.d = clamp(5 + (box <= 1 ? 1 : 0) - (box >= 4 ? 1 : 0), 1, 10);
    c.n = box >= 3 ? 2 : box >= 1 ? 1 : 0;
    c.r = c.reps || (c.u ? 1 : 0);
    c.l = c.f || c.slips || 0;
    if (c.u && !c.ls && box >= 1) c.ls = c.u;
    return c;
  }
  function retrievability(c, now) {
    if (!c || !c.u || typeof c.s !== "number") return c && c.u ? 0.5 : 0;
    if (c.b === "never") return 1;
    const days = Math.max(0, (now || Date.now()) - c.u) / DAY;
    return Math.pow(P.target, days / Math.max(P.sMin, c.s));
  }

  /* the transition: returns the NEW card (does not store) */
  function next(card, grade, now) {
    now = now || Date.now();
    grade = FROM_LEGACY[grade] || grade;
    if (grade === "retire") {
      return Object.assign({}, card || {}, { box: 5, due: NEVER_DUE, b: "never", u: now, g: "retire" });
    }
    if (GRADES.indexOf(grade) < 0) throw new Error("SRS: unknown grade " + grade);
    const c = migrate(card ? Object.assign({}, card) : null, now);
    const fresh = !c || !c.u;
    let s, d, n = (c && c.n) || 0, l = (c && c.l) || 0, ls = (c && c.ls) || 0;
    const R = fresh ? 0 : retrievability(c, now);
    const oldBox = c ? (c.box || 0) : 0;
    const ok = grade === "yes" || grade === "solid";
    if (fresh) {
      s = P.s0[grade]; d = P.d0[grade];
    } else {
      s = c.s; d = c.d;
      if (grade === "no") {
        s = Math.max(P.sMin, P.failBase * Math.pow(s, P.failPow));
        d = clamp(d + 1, 1, 10);
      } else if (grade === "maybe") {
        s = Math.min(s * (1.2 + 0.4 * (1 - R)), bandTop(oldBox));   // a stumble never promotes
        d = clamp(d + 0.4, 1, 10);
      } else {
        let grow = 1 + P.G * (11 - d) * Math.pow(Math.max(s, 0.1), -0.1) * (Math.exp(P.C * (1 - R)) - 1);
        grow = clamp(grow, P.growMin, P.growMax);
        if (grade === "solid") { grow = Math.min(P.solidMax, grow * P.solidBonus); d = clamp(d - 0.6, 1, 10); }
        else d = clamp(d + 0.05 * (5 - d), 1, 10);
        s = s * grow;
        if (grade === "yes" && s < 1) s = 1;      // graduate a learning step
        if (grade === "solid" && s < 3) s = 3;
      }
    }
    if (grade === "no") l += 1;
    if (ok && (!ls || now - ls >= P.newDayGap)) n += 1;
    if (ok) ls = now;
    s = clamp(s, P.sMin, P.sMax);
    const box = grade === "no" ? 0 : boxFromS(s, n);
    let due;
    if (grade === "no") due = now + P.relearnMin * 60000;
    else {
      const f = s >= 3 ? 1 + (Math.random() * 2 - 1) * P.fuzz : 1;
      due = now + s * f * DAY;
    }
    const out = Object.assign({}, c || {}, { s: Math.round(s * 1000) / 1000, d: Math.round(d * 100) / 100,
      n, l, ls, r: ((c && c.r) || 0) + 1, g: grade, box, due, u: now });
    delete out.b;                   // a real verdict replaces any old explicit bucket mark
    return out;
  }

  /* store-backed rate: uses the page's getSrs/store when present */
  function rate(key, grade, opts) {
    opts = opts || {};
    const now = opts.now || Date.now();
    const srs = (typeof getSrs === "function") ? getSrs() : (opts.srs || {});
    const cur = srs[key];
    const g = FROM_LEGACY[grade] || grade;
    // a retired card stays retired unless he actually MISSES it (site rule)
    if (cur && cur.b === "never" && g !== "no" && g !== "retire") return cur;
    const nc = next(cur, g, now);
    srs[key] = nc;
    if (typeof store !== "undefined" && store.set) store.set("ats-srs", srs);
    return nc;
  }
  function legacyGrade(key, grade) { return rate(key, FROM_LEGACY[grade] || grade); }

  /* ---------- ordering & batches ---------- */
  const gradeRank = { no: 0, maybe: 1, yes: 3, solid: 4 };
  function weakness(c, now) {            // lower = weaker
    if (!c || !c.u) return 2 * 10 + 5;   // never rated sits between ≈ and ✓
    if (c.b === "never") return 99;
    const gr = gradeRank[c.g] !== undefined ? gradeRank[c.g] : (c.box >= 4 ? 4 : c.box >= 2 ? 3 : c.box === 1 ? 1 : 0);
    return gr * 10 + retrievability(migrate(Object.assign({}, c), now), now) * 5 - ((c.d || 5) - 5) * 0.2;
  }
  function weakestFirst(items, srs, now) {
    now = now || Date.now();
    return items.slice().sort((a, b) => weakness(srs[a.key], now) - weakness(srs[b.key], now));
  }
  function nextLabel(c) {
    if (!c) return "";
    if (c.b === "never") return "⊘ not repeated";
    const ms = (c.due || 0) - Date.now();
    if (ms < 45 * 60000) return "again in " + Math.max(1, Math.round(ms / 60000)) + " min";
    if (ms < 36 * 3600000) return "again tomorrow";
    const dys = ms / DAY;
    if (dys < 13) return "again in " + Math.round(dys) + " d";
    if (dys < 56) return "again in " + Math.round(dys / 7) + " wk";
    if (dys < 400) return "again in " + Math.round(dys / 30) + " mo";
    return "again in " + (dys / 365).toFixed(1) + " y";
  }
  /* pool: [{key,…}]; opts: size, mode (balanced|due|new|weakest|redo), exclude:Set,
     boost: key→number (e.g. recent test misses), redoKeys: [key], srs, now */
  function buildBatch(pool, opts) {
    opts = opts || {};
    const size = opts.size || 10, now = opts.now || Date.now();
    const srs = opts.srs || ((typeof getSrs === "function") ? getSrs() : {});
    const boost = opts.boost || (() => 0);
    const live = pool.filter(it => !(srs[it.key] && srs[it.key].b === "never"));
    const elig = live.filter(it => !(opts.exclude && opts.exclude.has(it.key)));
    const base = elig.length >= Math.min(size, live.length) ? elig : live;
    if (opts.mode === "redo" && opts.redoKeys) {
      const set = new Set(opts.redoKeys);
      return weakestFirst(live.filter(it => set.has(it.key)), srs, now).slice(0, size);
    }
    if (opts.mode === "weakest") return weakestFirst(base, srs, now).slice(0, size);
    const due = [], fresh = [], ahead = [];
    base.forEach(it => {
      const c = srs[it.key];
      if (!c || !c.u) { fresh.push(it); return; }
      const R = retrievability(migrate(Object.assign({}, c), now), now);
      const isDue = (c.due || 0) <= now || R < P.target;
      (isDue ? due : ahead).push({ it, R, w: boost(it.key) || 0 });
    });
    due.sort((a, b) => (b.w - a.w) || (a.R - b.R));
    ahead.sort((a, b) => (b.w - a.w) || (a.R - b.R));
    const D = due.map(x => x.it), A = ahead.map(x => x.it);
    let chosen = [];
    if (opts.mode === "due") chosen = D.slice(0, size).concat(fresh.slice(0, Math.max(0, size - D.length)));
    else if (opts.mode === "new") chosen = fresh.slice(0, size);
    else {
      const nDue = Math.min(Math.ceil(size * 0.7), D.length);
      const nNew = Math.min(size - nDue, fresh.length);
      chosen = D.slice(0, nDue).concat(fresh.slice(0, nNew));
      if (chosen.length < size) chosen = chosen.concat(D.slice(nDue, nDue + size - chosen.length));
      if (chosen.length < size) chosen = chosen.concat(fresh.slice(nNew, nNew + size - chosen.length));
    }
    if (chosen.length < size) chosen = chosen.concat(A.slice(0, size - chosen.length));   // nothing due → the ones closest to fading
    return chosen.slice(0, size);
  }
  function stats(srs, now) {
    now = now || Date.now();
    const o = { total: 0, due: 0, fresh: 0, retired: 0, solid: 0, learning: 0, byGrade: { no: 0, maybe: 0, yes: 0, solid: 0 } };
    Object.values(srs || {}).forEach(c => {
      o.total++;
      if (c.b === "never") { o.retired++; return; }
      if (!c.u) { o.fresh++; return; }
      if ((c.due || 0) <= now) o.due++;
      if ((c.box || 0) >= 3) o.solid++; else o.learning++;
      if (c.g && o.byGrade[c.g] !== undefined) o.byGrade[c.g]++;
    });
    return o;
  }

  /* ---------- the bar ---------- */
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  function selectedGrade(c) {
    if (!c) return null;
    if (c.b === "never") return "retire";
    return c.g && c.u && Date.now() - c.u < DAY ? c.g : null;   // today's verdict shows; yesterday's doesn't nag
  }
  function buttonsHtml(key, onclickFor, opts) {
    opts = opts || {};
    const c = (typeof getSrs === "function") ? getSrs()[key] : null;
    const sel = selectedGrade(c);
    const list = opts.retire === false ? GRADES : GRADES.concat(["retire"]);
    return list.map(g => `<button type="button" class="srs-btn ${g}${sel === g ? " sel" : ""}" data-g="${g}" title="${TITLE[g]}" aria-label="${TITLE[g]}" onclick="event.stopPropagation(); ${onclickFor(g)}">${SYMBOL[g]}</button>`).join("");
  }
  /* inline-HTML bar for pages that render rows as template strings:
     rateBarHtml(key, "rateWord", [idx]) → onclick="rateWord('key','yes',idx)" */
  function rateBarHtml(key, handler, extraArgs, opts) {
    const extra = (extraArgs || []).map(a => typeof a === "string" ? `'${esc(a)}'` : String(a)).join(", ");
    const c = (typeof getSrs === "function") ? getSrs()[key] : null;
    const said = selectedGrade(c) ? nextLabel(c) : "";
    return `<span class="srs-bar${opts && opts.compact ? " compact" : ""}" data-key="${esc(key)}">${buttonsHtml(key, g => `${handler}('${esc(key)}', '${g}'${extra ? ", " + extra : ""})`, opts)}<span class="srs-said">${said}</span></span>`;
  }
  /* DOM bar: mountRateBar(slot, key, { onRate(grade, legacyId, card), src, retire }) */
  function mountRateBar(slot, key, opts) {
    if (!slot) return null;
    opts = opts || {};
    const bar = document.createElement("span");
    bar.className = "srs-bar" + (opts.compact ? " compact" : "");
    bar.dataset.key = key;
    const said = document.createElement("span");
    said.className = "srs-said";
    const c = (typeof getSrs === "function") ? getSrs()[key] : null;
    const sel = selectedGrade(c);
    if (sel) said.textContent = nextLabel(c);
    const list = opts.retire === false ? GRADES : GRADES.concat(["retire"]);
    list.forEach(g => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "srs-btn " + g + (sel === g ? " sel" : "");
      btn.dataset.g = g;
      btn.title = TITLE[g];
      btn.setAttribute("aria-label", TITLE[g]);
      btn.textContent = SYMBOL[g];
      btn.onclick = ev => {
        ev.stopPropagation();
        const nc = rate(key, g);
        [...bar.querySelectorAll(".srs-btn")].forEach(b => b.classList.remove("sel"));
        btn.classList.add("sel");
        said.textContent = nextLabel(nc);
        if (typeof logEvent === "function") logEvent({ e: "bucket", key, b: TO_LEGACY[g], g, s: nc.s, R: Math.round(retrievability(nc, Date.now()) * 100) / 100, box: nc.box, src: opts.src || "bar" });
        if (opts.onRate) opts.onRate(g, TO_LEGACY[g], nc);
        if (typeof autoSync === "function") { try { autoSync(); } catch (e) {} }
      };
      bar.appendChild(btn);
    });
    bar.appendChild(said);
    slot.innerHTML = "";
    slot.appendChild(bar);
    return bar;
  }
  /* after a template-string bar is tapped: mark the button, say the next date */
  function paintBar(container, key, nc) {
    if (!container) return;
    const bar = container.querySelector ? (container.classList && container.classList.contains("srs-bar") ? container : container.querySelector(`.srs-bar[data-key="${CSS && CSS.escape ? CSS.escape(key) : key}"]`)) : null;
    if (!bar) return;
    [...bar.querySelectorAll(".srs-btn")].forEach(b => b.classList.toggle("sel", b.dataset.g === (nc.b === "never" ? "retire" : nc.g)));
    const said = bar.querySelector(".srs-said");
    if (said) said.textContent = nextLabel(nc);
  }
  function legendHtml() {
    return `<span class="srs-legend">${GRADES.concat(["retire"]).map(g => `<span class="leg"><span class="srs-btn ${g} mini">${SYMBOL[g]}</span> ${g === "retire" ? "don't repeat" : g}</span>`).join("")}<span class="leg muted">— the site sets the next date</span></span>`;
  }

  return { DAY, BOX_DAYS, NEVER_DUE, GRADES, P, SYMBOL, TITLE, FROM_LEGACY, TO_LEGACY, LEGACY_BUCKET,
    migrate, retrievability, next, rate, legacyGrade, boxFromS, weakness, weakestFirst, nextLabel,
    buildBatch, stats, rateBarHtml, mountRateBar, paintBar, legendHtml };
});
