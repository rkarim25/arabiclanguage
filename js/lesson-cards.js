/* ==========================================================================
   LESSON CARDS (js/lesson-cards.js)
   Structured visual teaching & spaced-review cards for Arabic systems:
   grammar pairings, semantic word nuances, look-alike roots, conversation
   ladders, and Qur'ānic concepts.
   - Resides as a reference & revision shelf on sets.html (#lc-<id>)
   - Actively TAUGHT inside Practice (sentences.html) when unseen concepts appear
   - Periodically REVIEWED via SRS (key: lc:<id>) when due
   ========================================================================== */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.LessonCards = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STYLE_ID = "lesson-cards-styles";
  const CSS = `
    .lc-wrap { background: var(--card, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 14px 16px; margin: 6px 0; text-align: left; }
    .lc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
    .lc-cat { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 999px; background: var(--accent-soft, rgba(13,122,95,0.1)); color: var(--accent, #0d7a5f); }
    .lc-cat.cat-nuance { background: #eff6ff; color: #1d4ed8; }
    .lc-cat.cat-quran { background: #fef3c7; color: #b45309; }
    .lc-cat.cat-conversation { background: #f3e8ff; color: #7e22ce; }
    .lc-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; width: 100%; }
    .lc-title { font-size: 16px; font-weight: 700; color: var(--ink, #111827); margin: 3px 0 0; }
    .lc-ar-title { font-family: var(--font-ar, serif); font-size: 21px; color: var(--accent, #0d7a5f); direction: rtl; }
    .lc-summary { font-size: 13.5px; color: var(--ink, #1f2937); line-height: 1.45; margin: 0 0 12px; padding: 8px 11px; background: rgba(13,122,95,0.05); border-left: 3px solid var(--accent, #0d7a5f); border-radius: 6px; }

    /* Diagrams */
    .lc-diagram { margin: 10px 0 12px; }
    .lc-timeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 8px; }
    .lc-tl-node { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 9px 11px; background: var(--bg, #f9fafb); position: relative; }
    .lc-tl-node.tone-teal { border-top: 3px solid #0d7a5f; background: rgba(13,122,95,0.04); }
    .lc-tl-node.tone-blue { border-top: 3px solid #2563eb; background: rgba(37,99,235,0.04); }
    .lc-tl-node.tone-amber { border-top: 3px solid #d97706; background: rgba(217,119,6,0.05); }
    .lc-tl-node.tone-slate { border-top: 3px solid #64748b; background: rgba(100,116,139,0.05); }
    .lc-tl-era { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: var(--muted, #6b7280); margin-bottom: 3px; }
    .lc-tl-ar { font-family: var(--font-ar, serif); font-size: 19px; color: var(--ink, #111827); direction: rtl; text-align: right; line-height: 1.45; }
    .lc-tl-sub { font-size: 11.5px; color: var(--muted, #6b7280); margin-top: 3px; }
    .lc-danger-pill { margin-top: 8px; padding: 7px 11px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; font-size: 12.5px; font-weight: 600; line-height: 1.4; }

    .lc-lanes { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
    .lc-lane { border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 10px 12px; background: var(--bg, #f9fafb); }
    .lc-lane-badge { display: inline-block; font-family: var(--font-ar, serif); font-size: 16px; font-weight: 700; color: var(--accent, #0d7a5f); background: var(--card, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 7px; padding: 2px 8px; margin-bottom: 5px; }
    .lc-lane-title { font-size: 13px; font-weight: 700; color: var(--ink, #111827); margin-bottom: 3px; }
    .lc-lane-desc { font-size: 12px; color: var(--muted, #4b5563); line-height: 1.4; }

    .lc-fortress { border: 2px dashed #cbd5e1; border-radius: 12px; padding: 11px 13px; background: #f8fafc; }
    .lc-fort-layer { font-size: 12.5px; line-height: 1.45; color: var(--ink, #1f2937); margin-bottom: 8px; }
    .lc-fort-shield { border: 1.5px solid #0d7a5f; border-radius: 10px; padding: 8px 11px; background: rgba(13,122,95,0.07); font-size: 12.5px; font-weight: 600; color: #065f46; margin-bottom: 8px; }
    .lc-fort-inner { border: 2px solid #d97706; border-radius: 9px; padding: 9px 12px; background: #fffbeb; font-size: 12.5px; font-weight: 600; color: #92400e; }

    /* Clean Book Table (matches Reza's reference table) */
    .lc-table-wrap { width: 100%; overflow-x: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; background: var(--card, #fff); margin: 8px 0; }
    .lc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .lc-table th { text-align: left; padding: 9px 12px; background: rgba(0,0,0,0.03); border-bottom: 1px solid var(--border, #e5e7eb); font-size: 12px; font-weight: 600; color: var(--ink, #374151); white-space: nowrap; }
    .lc-table td { padding: 9px 12px; border-bottom: 1px solid var(--border, #e5e7eb); vertical-align: middle; line-height: 1.45; color: var(--ink, #1f2937); }
    .lc-table tr:last-child td { border-bottom: none; }
    .lc-table code { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 5px; padding: 1px 6px; font-family: var(--font-ar, monospace); font-size: 15px; color: #0f172a; }
    .lc-ex-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .lc-ex-ar { font-family: var(--font-ar, serif); font-size: 19px; color: var(--ink, #111827); direction: rtl; line-height: 1.4; }
    .lc-ex-tr { font-size: 11.5px; color: var(--muted, #6b7280); font-style: italic; }
    .lc-speak-btn { border: 1px solid var(--border, #e5e7eb); background: var(--bg, #f9fafb); border-radius: 6px; padding: 2px 7px; font-size: 12px; cursor: pointer; flex-shrink: 0; }
    .lc-speak-btn:hover { border-color: var(--accent, #0d7a5f); background: var(--accent-soft, rgba(13,122,95,0.1)); }

    .lc-trap { margin-top: 8px; padding: 8px 11px; border-radius: 8px; background: #fffbeb; border: 1px solid rgba(217,119,6,0.3); border-left: 3px solid #d97706; font-size: 12.5px; color: #78350f; line-height: 1.45; }
  `;

  function ensureStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function escAttr(s) {
    return encodeURIComponent(String(s || ""));
  }

  function renderDiagramHtml(d) {
    if (!d || !d.type) return "";
    if (d.type === "timeline" && Array.isArray(d.nodes)) {
      return `
        <div class="lc-diagram">
          <div class="lc-timeline">
            ${d.nodes.map(n => `
              <div class="lc-tl-node tone-${n.tone || "teal"}">
                <div class="lc-tl-era">${n.era || ""}</div>
                <div class="lc-tl-ar">${n.ar || ""}</div>
                ${n.sub ? `<div class="lc-tl-sub">${n.sub}</div>` : ""}
              </div>
            `).join("")}
          </div>
          ${d.danger ? `<div class="lc-danger-pill">${d.danger}</div>` : ""}
        </div>`;
    }
    if (d.type === "lanes" && Array.isArray(d.lanes)) {
      return `
        <div class="lc-diagram">
          <div class="lc-lanes">
            ${d.lanes.map(l => `
              <div class="lc-lane">
                <div class="lc-lane-badge">${l.badge || ""}</div>
                <div class="lc-lane-title">${l.title || ""}</div>
                <div class="lc-lane-desc">${l.desc || ""}</div>
              </div>
            `).join("")}
          </div>
        </div>`;
    }
    if (d.type === "fortress") {
      return `
        <div class="lc-diagram">
          <div class="lc-fortress">
            <div class="lc-fort-layer">🏛️ ${d.outer || ""}</div>
            <div class="lc-fort-shield">${d.shield || ""}</div>
            <div class="lc-fort-inner">${d.inner || ""}</div>
          </div>
        </div>`;
    }
    return "";
  }

  function renderBodyHtml(card, opts) {
    if (!card) return "";
    const o = opts || {};
    const cols = card.columns || ["Item", "Form", "Example", "Notes"];
    const speakFn = o.speakFn || "LessonCards.speakEncoded";
    return `
      <div class="lc-wrap" onclick="event.stopPropagation()">
        ${!o.hideHeader ? `
          <div class="lc-top">
            <span style="display:inline-flex;align-items:center;gap:7px">${typeof SRS === "object" && SRS && SRS.dotHtml ? SRS.dotHtml("lc:" + card.id, { lg: true }) : ""}<span class="lc-cat cat-${card.category || "grammar"}">${card.icon || "📇"} Lesson Card · ${card.categoryLabel || card.category || "Concept"}</span></span>
            ${o.setsLink ? `<a href="sets.html#lc-${card.id}" style="font-size:12px;font-weight:600;color:var(--accent);text-decoration:none">View in Sets →</a>` : ""}
          </div>
          <div class="lc-title-row">
            <div class="lc-title">${card.title}</div>
            <div class="lc-ar-title">${card.arTitle || ""}</div>
          </div>
        ` : ""}
        <p class="lc-summary" style="margin-top:${o.hideHeader ? '0' : '8px'}"><b>Core Rule:</b> ${card.summary}</p>
        ${renderDiagramHtml(card.diagram)}
        <div class="lc-table-wrap">
          <table class="lc-table">
            <thead>
              <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${(card.rows || []).map(r => `
                <tr>
                  <td>${r.col1 || ""}</td>
                  <td>${r.col2 || ""}</td>
                  <td>
                    <div class="lc-ex-cell">
                      <div>
                        <div class="lc-ex-ar">${r.ar || ""}</div>
                        ${r.tr ? `<div class="lc-ex-tr">(${r.tr})</div>` : ""}
                      </div>
                      ${r.ar ? `<button type="button" class="lc-speak-btn" onclick="event.stopPropagation(); ${speakFn}('${escAttr(r.ar)}')" title="Listen">🔊</button>` : ""}
                    </div>
                  </td>
                  <td>${r.col4 || ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${card.trap ? `<div class="lc-trap">⚠️ <b>Watch out:</b> ${card.trap}</div>` : ""}
      </div>
    `;
  }

  function speakEncoded(encodedAr) {
    const txt = decodeURIComponent(encodedAr || "");
    if (txt && typeof window !== "undefined" && typeof window.speak === "function") {
      window.speak(txt, 0.85);
    }
  }

  /* Convert data/lesson-cards.json into Practice-ready items (SRS key: lc:<id>) */
  function buildPracticePool(cards) {
    return (cards || []).map(c => {
      const qc = c.quickCheck || {};
      return {
        key: `lc:${c.id}`,
        lcId: c.id,
        kind: "lesson-card",
        effort: 1.0,
        ar: qc.answerAr || (c.rows && c.rows[0] && c.rows[0].ar) || c.arTitle || "",
        speakAr: qc.speakAr || (c.rows && c.rows[0] && c.rows[0].ar) || "",
        en: qc.prompt || `${c.title}: ${c.summary}`,
        tr: qc.tr || "",
        note: qc.answerEn || c.summary || "",
        title: c.title,
        arTitle: c.arTitle || "",
        category: c.category || "grammar",
        categoryLabel: c.categoryLabel || "Lesson Card",
        icon: c.icon || "📇",
        lcCard: c,
        triggers: c.triggers || {},
        words: [],
        src: "lesson-cards",
        track: c.category === "quran" ? "quran" : "lesson-card"
      };
    });
  }

  /* Map pattern IDs & normalized words to their primary Lesson Card for quick links */
  function buildLookup(cards) {
    const byId = {};
    const byPattern = {};
    (cards || []).forEach(c => {
      if (!c || !c.id) return;
      byId[c.id] = c;
      ((c.triggers && c.triggers.patterns) || []).forEach(p => {
        if (!byPattern[p]) byPattern[p] = c;
      });
    });
    return { byId, byPattern };
  }

  return {
    ensureStyles,
    renderDiagramHtml,
    renderBodyHtml,
    speakEncoded,
    buildPracticePool,
    buildLookup
  };
});
