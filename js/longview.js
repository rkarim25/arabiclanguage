/* The long view: the honest forecast model and the commute experiment.
   Lifted out of index.html when the home page became milestone-first. This is
   the engine underneath the ladder, kept available but out of the way. */
(function () {
/* ============ 🎧🗣 The two skills — reality & forecast ============
   SKILL AXIS (redesign 2026-08-07, his ask): the Quran panel plots listening —
   how much of the recitation he'd actually catch/follow by ear — and the
   conversation panel plots speaking deployability. Word retention is the engine
   underneath (js/progress-model.js) but is no longer the thing drawn.
   Data: data/progress-series.json (nightly, scripts/gen-progress.js).
   Placement tests (placement.html, Converse oral exam) appear as ◆ anchors and
   recalibrate the model's factors — if reality is off the forecast, the next
   nightly regeneration adjusts the forecast. */
(function () {
  const panels = document.getElementById("pgPanels");
  if (!panels) return;
  const fmtD = iso => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const fmtDY = iso => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });

  // three lines only (his ask): current pace · one higher · one lower
  const SCEN_STYLE = {
    current: { c: "#8a8578", w: 1.3, dash: "5 4" },
    higher:  { c: "#0d7a5f", w: 1.6, dash: "2 3" },
    lower:   { c: "#b03535", w: 1,   dash: "1.5 3.5" },
  };

  function drawPanel(tr, icon) {
    const W = 560, H = 260, L = 40, R = 14, T = 16, B = 30; // plot box
    const pw = W - L - R, ph = H - T - B;
    const total = 1, target = tr.target; // skill axis: 0..1, goal line at the stage target
    const reality = tr.reality.slice();  // nightly skill series (already ends today)

    const t0 = new Date(reality[0].d).getTime();
    // x-domain: reality span + forecast horizon (cap at latest completion + 60d, else 9 months out)
    const comps = tr.scenarios.map(s => s.completion).filter(Boolean).map(d => new Date(d).getTime());
    const tEnd = Math.min(
      Math.max(Date.now() + 270 * 86400000, ...(comps.length ? [Math.max(...comps) + 60 * 86400000] : [])),
      Date.now() + 550 * 86400000);
    const x = iso => L + ((new Date(iso).getTime() - t0) / (tEnd - t0)) * pw;
    const y = m => T + (1 - m / total) * ph;
    const path = (pts, get) => pts.map((p, i) => (i ? "L" : "M") + x(p.d).toFixed(1) + " " + y(get(p)).toFixed(1)).join(" ");

    // month ticks
    let ticks = "";
    const tick = new Date(t0); tick.setDate(1); tick.setMonth(tick.getMonth() + 1);
    for (let m = new Date(tick); m.getTime() < tEnd; m.setMonth(m.getMonth() + 1)) {
      const xx = x(m.toISOString().slice(0, 10));
      ticks += `<line x1="${xx.toFixed(1)}" y1="${T}" x2="${xx.toFixed(1)}" y2="${H - B}" stroke="var(--border)" stroke-width="0.5"></line>
        <text x="${xx.toFixed(1)}" y="${H - B + 14}" font-size="8.5" text-anchor="middle" fill="var(--muted)" font-family="var(--font-ui)">${m.toLocaleDateString(undefined, { month: "short" })}${m.getMonth() === 0 ? " " + String(m.getFullYear()).slice(2) : ""}</text>`;
    }
    // y grid: 25/50/75/goal
    let grid = "";
    [0.25, 0.5, 0.75].forEach(f => {
      grid += `<line x1="${L}" y1="${y(f * total).toFixed(1)}" x2="${W - R}" y2="${y(f * total).toFixed(1)}" stroke="var(--border)" stroke-width="0.5"></line>
        <text x="${L - 4}" y="${(y(f * total) + 3).toFixed(1)}" font-size="8.5" text-anchor="end" fill="var(--muted)" font-family="var(--font-ui)">${f * 100}%</text>`;
    });

    // scenarios: dotted from today; completion markers on the goal line
    let scen = "", markers = "";
    for (const s of tr.scenarios) {
      const st = SCEN_STYLE[s.id]; if (!st) continue;
      scen += `<path d="${path(s.series, p => Math.min(p.skill, total))}" fill="none" stroke="${st.c}" stroke-width="${st.w}" stroke-dasharray="${st.dash}" stroke-linejoin="round" opacity="0.95"></path>`;
      if (s.completion && new Date(s.completion).getTime() < tEnd) {
        markers += `<circle cx="${x(s.completion).toFixed(1)}" cy="${y(target).toFixed(1)}" r="2.4" fill="${st.c}"></circle>`;
      }
    }
    // placement-test anchors: ◆ where a real test measured the skill
    for (const p of tr.tests || []) {
      markers += `<rect x="${(x(p.d) - 2.6).toFixed(1)}" y="${(y(p.skill) - 2.6).toFixed(1)}" width="5.2" height="5.2"
        transform="rotate(45 ${x(p.d).toFixed(1)} ${y(p.skill).toFixed(1)})" fill="#7b5ea8" stroke="#fff" stroke-width="0.7"></rect>`;
    }
    const lastR = reality[reality.length - 1];

    const legend = tr.scenarios.map(s => {
      const st = SCEN_STYLE[s.id]; if (!st) return "";
      return `<span style="white-space:nowrap"><span style="display:inline-block;width:16px;border-top:2px dashed ${st.c};vertical-align:middle;margin-right:4px"></span>${s.label} → <strong style="color:${st.c}">${s.completion ? fmtDY(s.completion) : "18mo+"}</strong></span>`;
    }).join(" · ");

    const todaySkill = reality.length ? reality[reality.length - 1].skill : 0;
    const held = tr.held || [];
    const goalText = tr.kind === "listen"
      ? (tr.stage === "salah" ? `goal: catch ${Math.round(target * 100)}% of the words by ear` : `goal: follow ${Math.round(target * 100)}% of the meaning`)
      : `goal: deploy ${Math.round(target * 100)}% in speech`;
    const lagNote = tr.kind === "listen" ? "the ear lags the eye until words are certified" : "the mouth lags the eye until words are spoken";
    const el = document.createElement("div");
    el.style.cssText = "flex:1 1 420px;min-width:0";
    el.innerHTML = `
      <div style="font-weight:700;font-size:14px">${icon} ${tr.label}</div>
      <div style="font-size:12.5px;color:var(--accent);font-weight:600;margin:2px 0 4px">today: ~${(100 * todaySkill).toFixed(0)}%${tr.heldToday ? ` <span style="color:var(--muted);font-weight:400">· ${(100 * tr.heldToday).toFixed(0)}% held on screen — ${lagNote}</span>` : ""} · ${goalText}</div>
      <div style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;touch-action:pan-y">
        ${ticks}${grid}
        <line x1="${L}" y1="${y(target).toFixed(1)}" x2="${W - R}" y2="${y(target).toFixed(1)}" stroke="var(--accent)" stroke-width="0.8" stroke-dasharray="6 3" opacity="0.65"></line>
        <text x="${W - R}" y="${(y(target) - 4).toFixed(1)}" font-size="9" text-anchor="end" fill="var(--accent)" font-family="var(--font-ui)">${goalText}</text>
        ${held.length > 1 ? `<path d="${path(held, p => p.frac)}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-dasharray="1 2.5" opacity="0.55"></path>` : ""}
        <path d="${path(reality, p => p.skill)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"></path>
        ${scen}${markers}
        <circle cx="${x(lastR.d).toFixed(1)}" cy="${y(lastR.skill).toFixed(1)}" r="3" fill="var(--accent)"></circle>
        <text x="${x(lastR.d).toFixed(1)}" y="${(y(lastR.skill) - 7).toFixed(1)}" font-size="9" text-anchor="middle" fill="var(--accent)" font-weight="bold" font-family="var(--font-ui)">today</text>
        <line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="var(--muted)" stroke-width="0.7"></line>
        <line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="var(--muted)" stroke-width="0.7"></line>
        <g class="pg-cross" style="display:none">
          <line y1="${T}" y2="${H - B}" stroke="var(--ink)" stroke-width="0.6" opacity="0.45" stroke-dasharray="2 2"></line>
          <circle r="2.6" fill="var(--accent)" stroke="#fff" stroke-width="0.8"></circle>
        </g>
      </svg>
      <div class="pg-tip" style="display:none;position:absolute;top:6px;z-index:5;pointer-events:none;background:var(--card);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);padding:6px 9px;font-size:11.5px;line-height:1.55;max-width:230px"></div>
      </div>
      <div style="font-size:10.5px;color:var(--muted);line-height:1.9;margin-top:2px">${legend}</div>`;

    /* ---- track-the-line: crosshair + readout (his 2026-08-07 ask) ----
       Follows mouse or finger (pointer events; touch-action:pan-y keeps the
       page scrollable). Snaps to the day, interpolates every visible line:
       past → what he actually held; future → what each scenario projects. */
    const svg = el.querySelector("svg");
    const tip = el.querySelector(".pg-tip");
    const cross = el.querySelector(".pg-cross");
    const cLine = cross.querySelector("line");
    const cDot = cross.querySelector("circle");
    const tsOf = p => new Date(p.d).getTime();
    const lastRT = tsOf(lastR);
    const lerp = (series, t, get) => {
      get = get || (p => p.skill);
      if (!series.length || t < tsOf(series[0]) || t > tsOf(series[series.length - 1])) return null;
      for (let i = 1; i < series.length; i++) {
        if (t <= tsOf(series[i])) {
          const a = series[i - 1], b = series[i];
          const f = (t - tsOf(a)) / Math.max(1, tsOf(b) - tsOf(a));
          return get(a) + f * (get(b) - get(a));
        }
      }
      return get(series[series.length - 1]);
    };
    let tracked = false;
    function trackAt(clientX) {
      const rect = svg.getBoundingClientRect();
      const vx = Math.max(L, Math.min(W - R, (clientX - rect.left) / rect.width * W));
      const t = Math.round((t0 + ((vx - L) / pw) * (tEnd - t0)) / 86400000) * 86400000;
      const iso = new Date(t).toISOString().slice(0, 10);
      const xr = L + ((t - t0) / (tEnd - t0)) * pw;
      cross.style.display = "";
      cLine.setAttribute("x1", xr.toFixed(1)); cLine.setAttribute("x2", xr.toFixed(1));
      const rows = [];
      const skillWord = tr.kind === "listen" ? (tr.stage === "salah" ? "words caught by ear" : "meaning followed") : "deployable in speech";
      const rv = t <= lastRT ? lerp(reality, t) : null;
      if (rv !== null) {
        cDot.style.display = "";
        cDot.setAttribute("cx", xr.toFixed(1)); cDot.setAttribute("cy", y(rv).toFixed(1));
        rows.push(`<div>${skillWord}: <strong>${(100 * rv).toFixed(0)}%</strong></div>`);
        const hv = lerp(held, t, p => p.frac);
        if (hv !== null) rows.push(`<div style="color:var(--muted)">words held on screen: ${(100 * hv).toFixed(0)}%</div>`);
      } else {
        cDot.style.display = "none";
        for (const s of tr.scenarios) {
          const st = SCEN_STYLE[s.id]; if (!st) continue;
          const sw = `<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${st.c};margin-right:5px;vertical-align:-1px"></span>`;
          if (s.completion && t >= new Date(s.completion).getTime()) {
            rows.push(`<div>${sw}${s.label}: <strong style="color:${st.c}">✓ goal ${fmtD(s.completion)}</strong></div>`);
          } else {
            const v = lerp(s.series, t);
            if (v !== null) rows.push(`<div>${sw}${s.label}: <strong style="color:${st.c}">${(100 * Math.min(v, total)).toFixed(0)}%</strong></div>`);
          }
        }
      }
      tip.innerHTML = `<div style="font-weight:700;margin-bottom:1px">${fmtDY(iso)}${rv === null ? ' <span style="color:var(--muted);font-weight:400">forecast</span>' : ""}</div>` + rows.join("");
      tip.style.display = "block";
      const px = (xr / W) * rect.width;
      if (px > rect.width / 2) { tip.style.left = "auto"; tip.style.right = (rect.width - px + 10) + "px"; }
      else { tip.style.right = "auto"; tip.style.left = (px + 10) + "px"; }
      if (!tracked) { tracked = true; logEvent({ e: "pg-track", panel: tr.kind }); }
    }
    svg.addEventListener("pointermove", e => trackAt(e.clientX));
    svg.addEventListener("pointerdown", e => { e.preventDefault(); trackAt(e.clientX); });
    svg.addEventListener("pointerleave", () => { cross.style.display = "none"; tip.style.display = "none"; });
    return el;
  }

  function renderSkills(sk) {
    if (!sk || !sk.listening) return;
    const li = sk.listening, sp = sk.speaking;
    const pc = v => (100 * v).toFixed(0) + "%";
    const rows = document.getElementById("pgSkillRows");
    const liMove = li.certifiedWords === 0
      ? `No words are certified by ear yet — a 🎧 Ears round or an Audio Coach session starts certifying, and each one lifts this honestly.`
      : `${li.certifiedWords} word${li.certifiedWords > 1 ? "s" : ""} certified by ear so far — more ear-tests keep firming this up.`;
    const spMove = sp.outputMinutes < 30
      ? `Only ${sp.outputMinutes} speaking minutes logged — the estimate is capped by real output time (Speak, Sentences, Converse raise the ceiling; vocabulary alone can't).`
      : `${sp.outputMinutes} speaking minutes logged.`;
    rows.innerHTML = `
      <div>🎧 <strong>Salah recitation, by ear:</strong> played a word alone you'd likely get ${pc(li.isolatedCov)} · inside the recitation stream ~${pc(li.connectedCov)} · following the <em>meaning</em> as it flows: ~${pc(li.comprehension)}. <span style="color:var(--muted)">${liMove}</span></div>
      <div style="margin-top:4px">🗣 <strong>Speaking:</strong> ${sp.provenItems} item${sp.provenItems === 1 ? "" : "s"} proven out loud or in writing · conservatively deployable in a real exchange: ~${sp.deployable} of ${sp.basketSize}. <span style="color:var(--muted)">${spMove}</span></div>`;
    document.getElementById("pgSkills").style.display = "";
  }

  fetch("data/progress-series.json").then(r => r.json()).then(pg => {
    // fall back gracefully if the nightly hasn't regenerated to the skill format yet
    if (!pg.tracks.quran.kind) { panels.innerHTML = `<p style="font-size:13px;color:var(--muted)">The skill chart appears after the next coaching run refreshes the data.</p>`; return; }
    panels.innerHTML = "";
    panels.appendChild(drawPanel(pg.tracks.quran, "🎧"));
    panels.appendChild(drawPanel(pg.tracks.conv, "🗣"));
    if (pg.narrative) {
      const nEl = document.getElementById("pgNarrative");
      nEl.innerHTML = `<strong>📝 This week</strong> <span style="color:var(--muted);font-size:11.5px">(rewritten nightly from your data)</span><br>${pg.narrative}`;
      nEl.style.display = "";
    }
    renderSkills(pg.skills);
    // headline: the week's movement in the SKILL, honestly (may be negative)
    const rq = pg.tracks.quran.reality;
    const week = rq.filter(p => new Date(p.d).getTime() >= Date.now() - 8 * 86400000);
    if (week.length >= 2) {
      const d = 100 * (week[week.length - 1].skill - week[0].skill);
      document.getElementById("pgToday").textContent =
        d >= 0.5 ? `this week: +${d.toFixed(1)} points of listening` :
        d <= -0.5 ? `this week: ${d.toFixed(1)} points — the ear fades without listening practice; one Audio round recovers fastest` : "";
    }
  }).catch(() => { panels.innerHTML = `<p style="font-size:13px;color:var(--muted)">The chart data hasn't been generated yet — it appears after the next coaching run.</p>`; });
})();

/* ---- 🚗 commute check: does commute listening actually stick? (2026-08-09) ----
   After each 🚗 commute session, the NEXT sitting (≥8h later, within 7 days)
   offers a 6-word by-ear check: 3 words the commute trained + 3 controls
   matched by review box that no recent commute touched — shuffled, unlabeled.
   Every answer grades the real SRS (it is normal study, not extra); the
   trained-vs-control gap, accumulated over ~2 weeks, is the honest verdict
   on whether commute listening is worth his scarce time. */
(async function () {
  const card = document.getElementById("commuteCard");
  if (!card) return;
  const log = store.get("ats-log", []);
  const checks = log.filter(e => e.e === "commute-check");
  const verdictHTML = () => {
    const t = checks.filter(c => c.trained), c0 = checks.filter(c => !c.trained);
    const rate = a => a.length ? a.filter(x => x.ok).length / a.length : 0;
    if (t.length < 10 || c0.length < 10)
      return `<span style="color:var(--muted)">Measuring: ${t.length} trained + ${c0.length} control answers banked — the verdict lands at 10 of each (~2 weeks of commutes).</span>`;
    const dt = Math.round(100 * (rate(t) - rate(c0)));
    const line = `Commute-trained words: <strong>${Math.round(100 * rate(t))}%</strong> recalled by ear (n=${t.length}) vs <strong>${Math.round(100 * rate(c0))}%</strong> for matched words it never touched (n=${c0.length}).`;
    if (dt >= 12) return `${line} <strong style="color:var(--accent)">+${dt} points — the commute is genuinely teaching you. Keep it.</strong>`;
    if (t.length >= 20 && c0.length >= 20 && dt <= 2) return `${line} <strong style="color:#b03535">No real gap — honest verdict: the commute isn't beating normal study for you. Worth rethinking.</strong>`;
    return `${line} <span style="color:var(--muted)">+${dt} points — promising, not yet proven; keep measuring.</span>`;
  };

  const lastCommute = [...log].reverse().find(e => e.e === "commute-done" && e.keys && e.keys.length >= 3);
  if (!lastCommute && !checks.length) return;   // feature untouched — stay hidden

  const since = lastCommute ? Date.now() - lastCommute.t : Infinity;
  const already = lastCommute && log.some(e => e.e === "commute-check-done" && e.forT === lastCommute.t);
  const due = lastCommute && !already && since >= 8 * 3600e3 && since <= 7 * 86400e3;

  if (!due) {
    if (checks.length) {
      card.style.display = "";
      card.innerHTML = `<h2>🚗 Commute effect</h2><p style="font-size:13.5px;margin:0">${verdictHTML()}</p>`;
    }
    return;
  }

  // build the probe: 3 trained + 3 box-matched controls no recent commute touched
  const srs = getSrs();
  const recentKeys = new Set();
  log.forEach(e => { if (e.e === "commute-done" && e.keys && Date.now() - e.t < 7 * 86400e3) e.keys.forEach(k => recentKeys.add(k)); });
  const shuffle = a => a.sort(() => 0.5 - Math.random());
  const boxOf = k => (srs[k] && srs[k].box) || 0;
  const trainedKeys = shuffle(lastCommute.keys.filter(k => srs[k] && srs[k].b !== "never")).slice(0, 3);
  const controlPool = shuffle(Object.keys(srs).filter(k => !recentKeys.has(k) && srs[k].b !== "never"));
  const controls = [];
  for (const tk of trainedKeys) {
    let best = null, bestD = 99;
    for (const ck of controlPool) {
      if (controls.includes(ck)) continue;
      const d = Math.abs(boxOf(ck) - boxOf(tk));
      if (d < bestD) { bestD = d; best = ck; if (!d) break; }
    }
    if (best) controls.push(best);
  }
  if (trainedKeys.length < 2 || controls.length < 2) return;
  const probe = shuffle([
    ...trainedKeys.map(k => ({ key: k, trained: true })),
    ...controls.map(k => ({ key: k, trained: false })),
  ]);
  const resolved = await resolveCards(probe.map(p => p.key));
  const byKey = {}; resolved.forEach(c => { byKey[c.key] = c.v; });
  const items = probe.filter(p => byKey[p.key] && byKey[p.key].ar && byKey[p.key].en);
  if (items.length < 4) return;

  card.style.display = "";
  let i = -1; const results = [];
  const head = () => `<h2>🚗 Commute check <span style="font-weight:400;font-size:13px;color:var(--muted)">${i + 1}/${items.length}</span></h2>`;
  const intro = () => {
    card.innerHTML = `<h2>🚗 Commute check — 90 seconds, by ear</h2>
      <p style="font-size:13.5px;color:var(--muted);margin:0 0 10px">${items.length} words: some from your last commute session, some it never touched — you won't know which. The gap between them is the proof that commute listening works <em>for you</em> (or doesn't). Every answer counts as a real review.</p>
      <button class="primary" id="ccStart">▶ Start the check</button>
      <p style="font-size:12.5px;margin:10px 0 0">${verdictHTML()}</p>`;
    document.getElementById("ccStart").onclick = () => { primeSpeak(); next(); };
  };
  const next = () => {
    i++;
    if (i >= items.length) return finish();
    const it = items[i];
    card.innerHTML = `${head()}
      <div style="text-align:center;padding:10px 0">
        <button class="primary" id="ccPlay" style="font-size:17px">🔊 hear it again</button>
        <p style="font-size:14px;color:var(--muted);margin:12px 0">…what does it mean?</p>
        <button id="ccReveal" style="font-size:15px">show the answer</button>
      </div>`;
    const play = () => speak(byKey[it.key].ar, 0.7);
    document.getElementById("ccPlay").onclick = play;
    document.getElementById("ccReveal").onclick = () => reveal(it);
    play();
  };
  const reveal = it => {
    const v = byKey[it.key];
    card.innerHTML = `${head()}
      <div style="text-align:center;padding:6px 0">
        <div class="arabic" dir="rtl" style="font-size:34px">${v.ar}</div>
        ${v.tr ? `<div style="font-size:14px;color:var(--muted);font-style:italic">${v.tr}</div>` : ""}
        <div style="font-size:19px;font-weight:700;margin:6px 0 14px">${v.en}</div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button id="ccNo" style="min-width:130px">✗ didn't have it</button>
          <button class="primary" id="ccYes" style="min-width:130px">✓ had it</button>
        </div>
      </div>`;
    const grade = ok => {
      const preBox = boxOf(it.key);          // record the box BEFORE the grade moves it
      gradeCard(it.key, ok ? "good" : "again");
      const ev = { e: "commute-check", key: it.key, trained: it.trained, ok, box: preBox };
      logEvent(ev); checks.push(ev); results.push(ev);
      next();
    };
    document.getElementById("ccYes").onclick = () => grade(true);
    document.getElementById("ccNo").onclick = () => grade(false);
  };
  const finish = () => {
    logEvent({ e: "commute-check-done", forT: lastCommute.t, n: results.length });
    autoSync();
    const got = results.filter(r => r.ok).length;
    card.innerHTML = `<h2>🚗 Commute check — done</h2>
      <p style="font-size:14px;margin:0 0 6px">${got}/${results.length} by ear — all ${results.length} graded into your review boxes, nothing wasted.</p>
      <p style="font-size:13px;margin:0">${verdictHTML()}</p>`;
  };
  intro();
})();
})();
