/* ============================================================================
   TRY IT — say it or write it, then see the answer (js/tryit.js)

   Reza, 2026-10-12: "I want drill-all or drill for each sentence to be visible"
   (Sentence Practice), "I want the drill option available for vocabulary as
   well", "is there a more pleasant word than drill?" → "Try it", because "it's
   not just say, I can write as well", and: "there should also be a free try
   using my vocabulary and sentences which builds/adjusts over time based on my
   level — put it in the sentence section."

   One engine for the two batch pages (words.html, sentences.html):
     · 🎯 on every card. Chapter sentences get the three hand-written variation
       rungs from data/chapter-drills.json (swap a word · change who/ask · build
       on it — three is enough, his words). Everything else is tried as itself:
       English prompt → 🎤 say it / type it (English letters become Arabic) /
       reveal → honest verdict.
     · "Try them all" walks the batch.
     · "Free try" (sentences) builds a batch out of the bank from what he already
       HOLDS: every word in the sentence carded on the site, length within two
       words of the level he has been passing lately. As he passes longer
       sentences the level rises by itself — nothing to set.
   Every pass or miss is a verdict on the card (✗ ✓ ★ through the page's own
   rate handler), a sent-drill event, and — when the mic was used — a proven
   `prompt` for the speaking line, graded exactly like speaking.html.
   ============================================================================ */
(function (root) {
  "use strict";
  const T = { cfg: null, st: {}, open: null, round: false, drills: null, freeOn: false };
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const RUNG = ["1 · swap a word", "2 · change who / ask", "3 · build on it"];

  function setup(cfg) {
    T.cfg = cfg;
    if (!T.drills) {
      T.drills = {};
      fetch("data/chapter-drills.json").then(r => r.json()).then(d => { T.drills = (d && d.chapters) || {}; }).catch(() => {});
    }
  }
  const items = () => (T.cfg && T.cfg.items()) || [];
  const item = idx => items()[idx];
  function variants(it) {
    if (!it || !it.key) return [];
    const m = /^chap:(\d+):(\d+)$/.exec(it.key);
    if (!m) return [];
    const c = T.drills && T.drills["chap-" + m[1]];
    return (c && c[+m[2]]) || [];
  }
  function state(idx) {
    if (!T.st[idx]) T.st[idx] = { rung: 1, revealed: false, heard: "", result: null, listening: false, micCtl: null };
    return T.st[idx];
  }
  function target(idx) {        // what he is asked to produce right now
    const it = item(idx); if (!it) return null;
    const v = variants(it);
    if (!v.length) return { en: it.en, ar: it.ar, tr: it.tr || "", swap: "", self: true };
    const st = state(idx);
    return v.find(d => d.rung === st.rung) || v[0];
  }
  function rungDone(idx) {      // highest rung passed for this card, ever
    const it = item(idx); if (!it) return 0;
    const log = (typeof store !== "undefined" && store.get("ats-log", [])) || [];
    let best = 0;
    log.forEach(x => { if (x.e === "sent-drill" && x.key === it.key && x.ok && (x.rung || 1) > best) best = x.rung || 1; });
    return best;
  }

  /* ---------- markup the page drops into its rows ---------- */
  function badgeHtml(idx) {
    const it = item(idx); if (!it) return "";
    const v = variants(it);
    const done = v.length ? rungDone(idx) : 0;
    const title = v.length ? `Try it — a variation of this sentence (${done}/3 rungs done)` : "Try it — say it or write it, then see the answer";
    return `<button type="button" class="sym-badge drill-badge tryit-badge${T.open === idx ? " active" : ""}${v.length && done >= 3 ? " done" : ""}" title="${title}" aria-label="Try it" onclick="event.stopPropagation(); TryIt.toggle(${idx})">🎯</button>`;
  }
  function slotHtml(idx) {
    return `<div class="s-drill tryit" id="tryit-${idx}" style="display:${T.open === idx ? "block" : "none"}" onclick="event.stopPropagation()">${T.open === idx ? panelHtml(idx) : ""}</div>`;
  }
  function panelHtml(idx) {
    const it = item(idx), tg = target(idx), st = state(idx);
    if (!it || !tg) return "";
    const v = variants(it);
    const hasMic = !!(root.SpeechRecognition || root.webkitSpeechRecognition);
    let head = "";
    if (v.length) {
      const done = rungDone(idx);
      head = `<div class="drill-rungs"><span>🎯 Variation</span>${[1, 2, 3].map(r => `<button type="button" class="drill-rung${r === st.rung ? " active" : ""}${r <= done ? " done" : ""}" onclick="TryIt.setRung(${idx}, ${r})" title="${r <= done ? "Done — tap to try again" : r === done + 1 ? "Your next rung" : "Skip ahead if you like"}">${r <= done ? "✓ " : ""}${RUNG[r - 1]}</button>`).join("")}</div>`;
    } else {
      head = `<div class="drill-rungs"><span>🎯 Try it</span><span style="color:var(--muted)">say it or write it, then see the answer</span></div>`;
    }
    let body;
    if (!st.revealed) {
      body = `
      <div class="drill-prompt">Say in Arabic: <b>${esc(tg.en)}</b></div>
      ${tg.swap ? `<div class="drill-swap">Change: ${esc(tg.swap)}</div>` : ""}
      ${st.listening ? `<div class="drill-heard" id="tryit-heard-${idx}">🔴 listening… take your time — it closes by itself after you stop <button type="button" class="book-toggle-pill" style="margin-left:6px;font-size:11.5px;padding:1px 8px" onclick="TryIt.micDone(${idx})">✓ I'm done</button></div>` : ""}
      <div class="drill-row">
        ${hasMic ? `<button type="button" class="book-toggle-pill${st.listening ? " active" : ""}" onclick="TryIt.mic(${idx})" title="Say it out loud — graded against the model" ${st.listening ? "disabled" : ""}>🎤 Say it</button>` : ""}
        <input type="text" id="tryit-inp-${idx}" class="arabic" placeholder="…or write it (English letters become Arabic)" autocomplete="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key==='Enter'){event.preventDefault();TryIt.check(${idx});}">
        <button type="button" class="book-toggle-pill" onclick="TryIt.check(${idx})" title="Check what you wrote">✓ Check</button>
        <button type="button" class="book-toggle-pill" onclick="TryIt.reveal(${idx})" title="Show the answer, then grade yourself honestly">👁️ Show answer</button>
      </div>`;
    } else {
      const res = st.result || {};
      let verdict = "";
      if (res.how === "mic") {
        verdict = res.ok ? `<span style="color:var(--accent);font-weight:700">${res.score >= 0.8 ? "✓ matches the model" : "✓ close — a different correct phrasing also counts"}</span>`
          : `<span style="color:var(--red,#dc2626);font-weight:700">✗ not yet</span> <span style="color:var(--muted)">— listen, say it again, then 🎤 once more</span>`;
        if (st.heard) verdict += `<div class="drill-heard">heard: <span class="arabic" dir="rtl">${esc(st.heard)}</span></div>`;
      } else if (res.how === "typed") {
        verdict = res.tier === "perfect" ? `<span style="color:var(--accent);font-weight:700">✓ letter-perfect</span>`
          : res.tier === "sound" ? `<span style="color:var(--warn,#d97706);font-weight:700">✓ right by sound</span> <span style="color:var(--muted)">— check the spelling below</span>`
          : res.tier === "part" ? `<span style="color:var(--red,#dc2626);font-weight:700">${res.right} of ${res.total} words</span> <span style="color:var(--muted)">— compare, then try again</span>`
          : `<span style="color:var(--red,#dc2626);font-weight:700">✗ not yet</span> <span style="color:var(--muted)">— compare, then try again</span>`;
      } else if (res.how === "self") {
        verdict = res.ok ? `<span style="color:var(--accent);font-weight:700">✓ you said it</span>` : `<span style="color:var(--red,#dc2626);font-weight:700">✗ missed</span> <span style="color:var(--muted)">— listen, say it, try again</span>`;
      }
      const passed = !!res.ok;
      const more = v.length && st.rung < 3;
      const nextLabel = more ? "Next rung →" : (T.round && nextIdx(idx) >= 0 ? "Next →" : "Done ✓");
      body = `
      <div class="drill-prompt" style="font-size:14px;color:var(--muted)">${esc(tg.en)}</div>
      <div class="drill-answer">
        <span class="arabic" dir="rtl" style="font-size:24px;color:var(--accent);line-height:1.5;cursor:pointer" onclick="speak('${encodeURIComponent(tg.ar)}', 0.8)" title="Listen">${tg.ar}</span>
        <button type="button" class="sym-badge" onclick="speak('${encodeURIComponent(tg.ar)}', 0.8)" title="Listen" aria-label="Listen">🔊</button>
        ${tg.tr ? `<div style="font-size:12.5px;color:var(--muted);font-style:italic">${esc(tg.tr)}</div>` : ""}
      </div>
      <div style="margin-top:8px;font-size:13.5px">${verdict}</div>
      <div class="drill-row">
        ${!st.result ? `<span style="font-size:12.5px;color:var(--muted)">Did you get it?</span>
          <button type="button" class="book-toggle-pill" onclick="TryIt.self(${idx}, true)">✓ Yes, I had it</button>
          <button type="button" class="book-toggle-pill" onclick="TryIt.self(${idx}, false)">✗ Missed</button>` : ""}
        ${st.result && !passed ? `<button type="button" class="book-toggle-pill" onclick="TryIt.retry(${idx})">↺ Try again</button>` : ""}
        ${passed ? `<button type="button" class="book-toggle-pill active" onclick="TryIt.next(${idx})">${nextLabel}</button>` : ""}
        ${st.result ? `<button type="button" class="book-toggle-pill" onclick="TryIt.retry(${idx})" title="Once more">🔁 Once more</button>` : ""}
      </div>`;
    }
    return head + body;
  }

  /* ---------- panel lifecycle ---------- */
  function paint(idx) {
    const el = document.getElementById("tryit-" + idx);
    if (!el) return;
    el.style.display = T.open === idx ? "block" : "none";
    el.innerHTML = T.open === idx ? panelHtml(idx) : "";
    const b = document.querySelector(`#${T.cfg.rowId(idx)} .tryit-badge`);
    if (b) b.classList.toggle("active", T.open === idx);
    if (T.open === idx) wireInput(idx);
  }
  function wireInput(idx) {
    const inp = document.getElementById("tryit-inp-" + idx), tg = target(idx);
    if (!inp || inp.dataset.tlInline || typeof attachInlineTranslit !== "function") return;
    attachInlineTranslit(inp, { lexicon: tg ? String(tg.ar).replace(/[.،؟!]/g, "").split(/\s+/).filter(Boolean) : [] });
    if (root.innerWidth > 700) inp.focus();
  }
  function toggle(idx) {
    const was = T.open;
    T.open = (was === idx) ? null : idx;
    if (was !== null && was !== idx) paint(was);
    if (T.open === idx) {
      const st = state(idx);
      const v = variants(item(idx));
      st.rung = v.length ? Math.min(rungDone(idx) + 1, 3) : 1;
      st.revealed = false; st.result = null; st.heard = ""; st.listening = false;
    } else T.round = false;
    paint(idx);
    if (T.open === idx) {
      const row = document.getElementById(T.cfg.rowId(idx));
      if (row && row.scrollIntoView) row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  function setRung(idx, r) { const st = state(idx); st.rung = r; st.revealed = false; st.result = null; st.heard = ""; st.listening = false; paint(idx); }
  function nextIdx(after) {
    const n = items().length;
    for (let k = 1; k <= n; k++) { const i = (after + k) % n; if (!T.st[i] || !(T.st[i].result && T.st[i].result.ok && (!variants(item(i)).length || T.st[i].rung >= 3))) return i; }
    return -1;
  }
  function all() {
    T.st = {}; T.round = true;
    const first = items().length ? 0 : -1;
    if (first < 0) return;
    if (typeof logEvent === "function") logEvent({ e: "tryit-round", src: T.cfg.src, n: items().length, t: Date.now() });
    T.open = null; toggle(first);
  }
  function next(idx) {
    const st = state(idx);
    if (variants(item(idx)).length && st.rung < 3) { setRung(idx, st.rung + 1); return; }
    if (T.round) { const n = nextIdx(idx); if (n >= 0) { toggle(n); return; } }
    T.open = null; T.round = false; paint(idx);
  }
  function reveal(idx) { const st = state(idx); st.revealed = true; st.result = null; paint(idx); const tg = target(idx); if (tg && typeof speak === "function") speak(tg.ar, 0.8); }
  function retry(idx) { const st = state(idx); st.revealed = false; st.result = null; st.heard = ""; st.listening = false; paint(idx); }

  /* ---------- verdicts ---------- */
  function record(idx, ok, how, extra) {
    const it = item(idx), st = state(idx), tg = target(idx);
    if (!it) return;
    const v = variants(it);
    if (typeof logEvent === "function") logEvent(Object.assign({ e: "sent-drill", key: it.key, rung: v.length ? st.rung : 1, ok: !!ok, how, en: tg.en, src: T.cfg.src, free: T.freeOn || undefined, t: Date.now() }, extra || {}));
    const strong = ok && extra && (extra.tier === "perfect" || (typeof extra.score === "number" && extra.score >= 0.8));
    const g = ok ? (strong ? "solid" : "yes") : "no";
    if (T.cfg.onVerdict) T.cfg.onVerdict(it, g, idx, how);
  }
  function self(idx, ok) { const st = state(idx); st.result = { how: "self", ok: !!ok }; record(idx, ok, "self"); paint(idx); }
  function check(idx) {
    const inp = document.getElementById("tryit-inp-" + idx), tg = target(idx);
    if (!inp || !tg) return;
    const typed = inp.value.trim();
    if (!typed) { inp.focus(); return; }
    const model = String(tg.ar).replace(/[.،؟!]/g, "");
    const exact = arMatch(typed, model);
    const gm = exact ? null : writeMatchAr(typed, model);
    const ok = exact || (gm && gm.ok);
    const tier = exact ? "perfect" : ok ? "sound" : (gm && gm.right > 0) ? "part" : "miss";
    const st = state(idx);
    st.revealed = true; st.result = { how: "typed", ok: !!ok, tier, right: gm ? gm.right : null, total: gm ? gm.total : null };
    record(idx, ok, "typed", { typed, tier });
    paint(idx);
    if (!ok && typeof speak === "function") speak(tg.ar, 0.8);
  }
  function micDone(idx) { const st = state(idx); if (st.micCtl && st.micCtl.stop) st.micCtl.stop(); }
  async function mic(idx) {
    const tg = target(idx), st = state(idx);
    if (!tg || st.listening) return;
    if (typeof stopAllAudio === "function") stopAllAudio(); else if (typeof stopSpeak === "function") stopSpeak();
    st.listening = true; st.heard = "";
    paint(idx);
    const nWords = String(tg.ar).replace(/[.،؟!]/g, "").split(/\s+/).filter(Boolean).length;
    const windowMs = Math.min(30000, Math.max(10000, 4000 + 2200 * nWords));
    const ctl = {}; st.micCtl = ctl;
    let quiet = null;
    const r = await micListen("ar-SA", windowMs, txt => {
      const h = document.getElementById("tryit-heard-" + idx);
      if (h) h.innerHTML = `🔴 listening… <span class="arabic" dir="rtl">${esc(txt)}</span> <button type="button" class="book-toggle-pill" style="margin-left:6px;font-size:11.5px;padding:1px 8px" onclick="TryIt.micDone(${idx})">✓ I'm done</button>`;
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(() => { if (ctl.stop) ctl.stop(); }, 2500);
    }, ctl);
    if (quiet) clearTimeout(quiet);
    st.micCtl = null; st.listening = false;
    if (r.err === "no-sr") {
      paint(idx);
      const h = document.getElementById("tryit-" + idx);
      if (h) h.insertAdjacentHTML("beforeend", `<div class="drill-heard">This browser has no speech recognition — write it, or reveal and grade yourself.</div>`);
      return;
    }
    st.heard = r.heard || "";
    const tw = normalizeAr(tg.ar).split(" ").filter(Boolean);
    const hw = new Set(normalizeAr(st.heard).split(" "));
    const hit = tw.filter(w => hw.has(w)).length;
    const score = tw.length ? Math.round((hit / tw.length) * 100) / 100 : 0;
    const exact = st.heard ? arMatch(st.heard, tg.ar) : false;
    const ok = st.heard ? (exact || score >= 0.5) : false;
    st.revealed = true; st.result = { how: "mic", ok, score: exact ? 1 : score };
    record(idx, ok, "mic", { heard: st.heard, score: st.result.score });
    if (st.heard && typeof logEvent === "function") logEvent({ e: "prompt", en: tg.en, heard: st.heard, score: st.result.score, src: "tryit-" + T.cfg.src, t: Date.now() });
    paint(idx);
    if (!ok && typeof speak === "function") speak(tg.ar, 0.8);
  }

  /* ---------- Free try: a batch built from what he holds, at his level ---------- */
  const DAY = 86400000;
  function heldKeyFor(ar, srs) {
    const norm = normalizeAr(ar).replace(/^ال/, "");
    const k = (typeof _wordKeyFor === "function" && _wordKeyFor(norm)) || null;
    const c = (k && srs[k]) || srs[ar] || srs[norm] || srs["tw:" + norm];
    return !!(c && (c.b === "never" || (c.box || 0) >= 1 || c.g === "yes" || c.g === "solid"));
  }
  function level(log) {
    // the lengths of sentences he has PASSED lately — median, default 4, floor 3
    const lens = log.filter(x => (x.e === "sent-drill" && x.ok) || (x.e === "prompt" && x.score >= 0.5)).filter(x => x.t > Date.now() - 30 * DAY)
      .map(x => String(x.en || "").split(/\s+/).filter(Boolean).length).filter(n => n > 0).sort((a, b) => a - b);
    if (!lens.length) return 4;
    return Math.max(3, lens[Math.floor(lens.length / 2)]);
  }
  function freeBatch(pool, size) {
    const srs = (typeof getSrs === "function") ? getSrs() : {};
    const log = (typeof store !== "undefined" && store.get("ats-log", [])) || [];
    const L = level(log);
    const triedToday = new Set(log.filter(x => x.e === "sent-drill" && x.t > Date.now() - DAY).map(x => x.key));
    const scored = [];
    pool.forEach(s => {
      if (!s.words || !s.words.length) return;
      const c = srs[s.key];
      if (c && c.b === "never") return;
      const held = s.words.filter(w => heldKeyFor(w[0] || w.ar, srs)).length;
      const ready = held / s.words.length;
      if (ready < 0.75) return;
      const len = String(s.ar).replace(/[.،؟!]/g, "").split(/\s+/).filter(Boolean).length;
      if (Math.abs(len - L) > 2) return;
      scored.push({ s, score: ready * 2 - Math.abs(len - L) * 0.3 + (triedToday.has(s.key) ? -2 : 0) + Math.random() * 0.4 });
    });
    scored.sort((a, b) => b.score - a.score);
    return { list: scored.slice(0, size).map(x => x.s), level: L, candidates: scored.length };
  }
  function free() {
    if (!T.cfg || !T.cfg.pool) return;
    const { list, level: L, candidates } = freeBatch(T.cfg.pool(), T.cfg.size || 10);
    if (!list.length) { alert("Nothing is ready for a free try yet — rate a few more words and sentences first."); return; }
    T.freeOn = true;
    if (typeof logEvent === "function") logEvent({ e: "tryit-free", level: L, candidates, n: list.length, t: Date.now() });
    if (T.cfg.onFree) T.cfg.onFree(list, L, candidates);
    T.st = {}; T.round = true; T.open = null;
    toggle(0);
  }
  function endFree() { T.freeOn = false; }
  /* the page re-rendered its rows (a verdict, a reveal): put the open panel back */
  function rewire() { if (T.open !== null) paint(T.open); }

  root.TryIt = { setup, badgeHtml, slotHtml, toggle, setRung, all, next, reveal, retry, self, check, mic, micDone, free, endFree, freeBatch, variants, rewire, state: () => T };
})(typeof self !== "undefined" ? self : this);
