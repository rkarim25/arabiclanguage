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
    .lc-wrap { background: rgba(13,110,85,0.02); border: none; border-top: 1px solid var(--border, #e4ddd0); border-bottom: 1px solid var(--border, #e4ddd0); border-radius: 0; padding: 10px 4px; margin: 4px 0; text-align: left; }
    .lc-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
    .lc-cat { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 1px 0; border-radius: 0; background: transparent; color: var(--muted, #6b655c); }
    .lc-cat.cat-nuance { background: transparent; color: var(--muted, #6b655c); }
    .lc-cat.cat-quran { background: transparent; color: var(--accent, #0d6e55); }
    .lc-cat.cat-conversation { background: transparent; color: var(--muted, #6b655c); }
    .lc-cat.cat-mosque { background: transparent; color: var(--accent, #0d6e55); }
    .lc-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; width: 100%; }
    .lc-title { font-family: var(--font-serif, Georgia, serif); font-size: 17.5px; font-weight: 600; color: var(--ink, #1c1917); margin: 2px 0 0; }
    .lc-ar-title { font-family: var(--font-ar, serif); font-size: 22px; color: var(--ink, #1c1917); direction: rtl; }
    .lc-summary { font-family: var(--font-serif, Georgia, serif); font-size: 14.5px; color: var(--ink, #1c1917); line-height: 1.55; margin: 0 0 8px; padding: 4px 10px; background: transparent; border-left: 2px solid var(--accent, #0d6e55); border-radius: 0; }

    /* Diagrams (printed textbook plates) */
    .lc-diagram { margin: 6px 0 8px; }
    .lc-timeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 8px; }
    .lc-tl-node { border: none; border-top: 2px solid var(--border, #e4ddd0); border-bottom: 1px solid var(--border, #e4ddd0); border-radius: 0; padding: 7px 9px; background: rgba(0,0,0,0.012); position: relative; }
    .lc-tl-node.tone-teal { border-top: 2px solid #0d6e55; background: rgba(13,110,85,0.025); }
    .lc-tl-node.tone-blue { border-top: 2px solid #2563eb; background: rgba(37,99,235,0.025); }
    .lc-tl-node.tone-amber { border-top: 2px solid #b45309; background: rgba(180,83,9,0.03); }
    .lc-tl-node.tone-slate { border-top: 2px solid #64748b; background: rgba(100,116,139,0.03); }
    .lc-tl-era { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #6b655c); margin-bottom: 2px; }
    .lc-tl-ar { font-family: var(--font-ar, serif); font-size: 21px; color: var(--ink, #1c1917); direction: rtl; text-align: right; line-height: 1.55; }
    .lc-tl-sub { font-size: 12px; color: var(--muted, #6b655c); margin-top: 2px; }
    .lc-danger-pill { margin-top: 6px; padding: 5px 10px; border-radius: 0; background: rgba(185,28,28,0.04); border: none; border-left: 2px solid #b91c1c; color: #991b1b; font-size: 13px; font-weight: 600; line-height: 1.45; }

    .lc-lanes { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
    .lc-lane { border: none; border-top: 1.5px solid var(--border, #e4ddd0); border-bottom: 1px solid var(--border, #e4ddd0); border-radius: 0; padding: 7px 8px; background: rgba(0,0,0,0.012); }
    .lc-lane-badge { display: inline-block; font-family: var(--font-ar, serif); font-size: 18px; font-weight: 700; color: var(--accent, #0d6e55); background: transparent; border-bottom: 1px dashed var(--border, #e4ddd0); border-radius: 0; padding: 1px 4px; margin-bottom: 4px; }
    .lc-lane-title { font-family: var(--font-serif, Georgia, serif); font-size: 14px; font-weight: 600; color: var(--ink, #1c1917); margin-bottom: 2px; }
    .lc-lane-desc { font-size: 13px; color: var(--muted, #6b655c); line-height: 1.45; }

    .lc-fortress { border: 1px dashed var(--border, #e4ddd0); border-radius: 4px; padding: 9px 11px; background: rgba(0,0,0,0.012); }
    .lc-fort-layer { font-size: 13px; line-height: 1.5; color: var(--ink, #1c1917); margin-bottom: 6px; }
    .lc-fort-shield { border-left: 2px solid #0d6e55; padding: 5px 9px; background: rgba(13,110,85,0.04); font-size: 13px; font-weight: 600; line-height: 1.5; color: #065f46; margin-bottom: 6px; }
    .lc-fort-inner { border-left: 2px solid #b45309; padding: 5px 10px; background: rgba(180,83,9,0.05); font-size: 13px; font-weight: 600; line-height: 1.5; color: #92400e; }

    /* Clean Book Comparison Table */
    .lc-table-wrap { width: 100%; overflow-x: auto; border: none; border-top: 1px solid var(--border, #e4ddd0); border-bottom: 1px solid var(--border, #e4ddd0); border-radius: 0; background: transparent; margin: 8px 0; }
    .lc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .lc-table th { text-align: left; padding: 6px 8px; background: transparent; border-bottom: 1.5px solid var(--border, #e4ddd0); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted, #6b655c); white-space: nowrap; }
    .lc-table td { padding: 6px 8px; border-bottom: 1px solid var(--border, #e4ddd0); vertical-align: middle; line-height: 1.5; color: var(--ink, #1c1917); }
    .lc-table tr:last-child td { border-bottom: none; }
    .lc-table code { background: rgba(0,0,0,0.035); border: none; border-bottom: 1px solid var(--border, #e4ddd0); border-radius: 3px; padding: 1px 5px; font-family: var(--font-ar, monospace); font-size: 17.5px; line-height: 1.45; color: var(--ink, #1c1917); }
    .lc-ex-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .lc-ex-ar { font-family: var(--font-ar, serif); font-size: 21px; color: var(--ink, #1c1917); direction: rtl; line-height: 1.55; }
    .lc-ex-tr { font-size: 12px; color: var(--muted, #6b655c); font-style: italic; }
    .lc-speak-btn { border: 1px solid transparent; background: transparent; border-radius: 6px; padding: 2px 6px; font-size: 12.5px; cursor: pointer; flex-shrink: 0; color: var(--muted); opacity: 0.7; }
    .lc-speak-btn:hover { border-color: var(--ink, #1c1917); color: var(--ink, #1c1917); background: rgba(0,0,0,0.04); opacity: 1; }

    .lc-trap { margin-top: 6px; padding: 5px 10px; border-radius: 0; background: rgba(180,83,9,0.04); border: none; border-left: 2px solid #b45309; font-size: 13px; color: var(--ink, #1c1917); line-height: 1.55; }
  `;

  const _AR_CHARS = "\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF";
  const _AR_ATOM = `(?:<(?:b|strong)>[${_AR_CHARS}]+<\\/(?:b|strong)>|[${_AR_CHARS}]+)`;
  const _AR_CONTAINER = `<code\\b[^>]*>[\\s\\S]*?<\\/code>|<(span|div|p|b|strong|td|th|a)\\b[^>]*\\bclass="[^"]*\\b(?:arabic|ar-inline|lc-ex-ar|lc-tl-ar|lc-ar-title|lc-lane-badge|w-ar|s-ar-text)\\b[^"]*"[^>]*>[\\s\\S]*?<\\/\\2>|<!--[\\s\\S]*?-->`;
  const _AR_RUN = `${_AR_ATOM}(?:(?:[\\s\\/،؛؟!ـ]+|…|\\.{2,3})(?=${_AR_ATOM})|${_AR_ATOM})*`;
  const _AR_ENHANCE_RE = new RegExp(`(${_AR_CONTAINER})|(${_AR_RUN})|(<[^>]+>)`, "gi");

  function enhanceInlineArabic(html) {
    const src = String(html == null ? "" : html);
    if (!/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(src)) return src;
    return src.replace(_AR_ENHANCE_RE, (full, _cont, _contTag, arRun) =>
      arRun ? `<span class="ar-inline" dir="rtl">${arRun}</span>` : full
    );
  }

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
                <div class="lc-tl-era">${enhanceInlineArabic(n.era || "")}</div>
                <div class="lc-tl-ar">${n.ar || ""}</div>
                ${n.sub ? `<div class="lc-tl-sub">${enhanceInlineArabic(n.sub)}</div>` : ""}
              </div>
            `).join("")}
          </div>
          ${d.danger ? `<div class="lc-danger-pill">${enhanceInlineArabic(d.danger)}</div>` : ""}
        </div>`;
    }
    if (d.type === "lanes" && Array.isArray(d.lanes)) {
      return `
        <div class="lc-diagram">
          <div class="lc-lanes">
            ${d.lanes.map(l => `
              <div class="lc-lane">
                <div class="lc-lane-badge">${l.badge || ""}</div>
                <div class="lc-lane-title">${enhanceInlineArabic(l.title || "")}</div>
                <div class="lc-lane-desc">${enhanceInlineArabic(l.desc || "")}</div>
              </div>
            `).join("")}
          </div>
        </div>`;
    }
    if (d.type === "fortress") {
      return `
        <div class="lc-diagram">
          <div class="lc-fortress">
            <div class="lc-fort-layer">🏛️ ${enhanceInlineArabic(d.outer || "")}</div>
            <div class="lc-fort-shield">${enhanceInlineArabic(d.shield || "")}</div>
            <div class="lc-fort-inner">${enhanceInlineArabic(d.inner || "")}</div>
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
            <div class="lc-title">${enhanceInlineArabic(card.title)}</div>
            <div class="lc-ar-title">${card.arTitle || ""}</div>
          </div>
        ` : ""}
        <p class="lc-summary" style="margin-top:${o.hideHeader ? '0' : '8px'}"><b>Core Rule:</b> ${enhanceInlineArabic(card.summary)}</p>
        ${renderDiagramHtml(card.diagram)}
        <div class="lc-table-wrap">
          <table class="lc-table">
            <thead>
              <tr>${cols.map(c => `<th>${enhanceInlineArabic(c)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${(card.rows || []).map(r => `
                <tr>
                  <td>${enhanceInlineArabic(r.col1 || "")}</td>
                  <td>${enhanceInlineArabic(r.col2 || "")}</td>
                  <td>
                    <div class="lc-ex-cell">
                      <div>
                        <div class="lc-ex-ar">${r.ar || ""}</div>
                        ${r.tr ? `<div class="lc-ex-tr">(${r.tr})</div>` : ""}
                      </div>
                      ${r.ar ? `<button type="button" class="lc-speak-btn" onclick="event.stopPropagation(); ${r.ayahRef && speakFn === "LessonCards.speakEncoded" ? `LessonCards.reciteOrSpeak('${r.ayahRef}', '${escAttr(r.ar)}')` : `${speakFn}('${escAttr(r.ar)}')`}" title="${r.ayahRef ? `Listen to Mishary Rashid Alafasy recitation (${r.ayahRef})` : "Listen"}">🔊</button>` : ""}
                    </div>
                  </td>
                  <td>${enhanceInlineArabic(r.col4 || "")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        ${card.trap ? `<div class="lc-trap">⚠️ <b>Watch out:</b> ${enhanceInlineArabic(card.trap)}</div>` : ""}
      </div>
    `;
  }

  function speakEncoded(encodedAr) {
    const txt = decodeURIComponent(encodedAr || "");
    if (txt && typeof window !== "undefined" && typeof window.speak === "function") {
      window.speak(txt, 0.85);
    }
  }

  /* Play Mishary Rashid Alafasy recitation for Qur'ān Lesson Card ayah rows; fall back seamlessly to neural TTS */
  function reciteOrSpeak(ayahRef, encodedAr) {
    const txt = decodeURIComponent(encodedAr || "");
    if (ayahRef && typeof window !== "undefined" && typeof window.reciteVerse === "function") {
      const p = String(ayahRef).split(":").map(Number);
      if (p[0] && p[1]) {
        window.reciteVerse(p[0], p[1], txt, 0.85);
        return;
      }
    }
    if (txt && typeof window !== "undefined" && typeof window.speak === "function") {
      window.speak(txt, 0.85);
    }
  }

  /* Convert data/lesson-cards.json into Practice-ready items (SRS key: lc:<id>) */
  function buildPracticePool(cards) {
    return (cards || []).map(c => {
      const qc = c.quickCheck || {};
      const speakAr = qc.speakAr || (c.rows && c.rows[0] && c.rows[0].ar) || "";
      const matchRow = (c.rows || []).find(r => r && r.ar === speakAr && r.ayahRef);
      return {
        key: `lc:${c.id}`,
        lcId: c.id,
        kind: "lesson-card",
        effort: 1.0,
        ar: qc.answerAr || (c.rows && c.rows[0] && c.rows[0].ar) || c.arTitle || "",
        speakAr,
        ref: (c.category === "quran" && matchRow) ? matchRow.ayahRef : null,
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
    enhanceInlineArabic,
    renderDiagramHtml,
    renderBodyHtml,
    speakEncoded,
    reciteOrSpeak,
    buildPracticePool,
    buildLookup
  };
});
