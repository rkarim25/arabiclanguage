/* ============================================================================
   MATCH — how a spoken or written answer is compared with the model (js/match.js)

   One grader for both Try it engines (js/tryit.js and the Daily Reader's own copy),
   so a sentence cannot pass on one page and fail on the other. Before 12 Oct the mic
   was a bag of words with a pass mark of half: "لَا أَعْرِفُ" passed on "لا" alone, in
   any order, and that pass went into his Sunday script. Now:
     · the same letter folding the typed path uses (hamza seats, ة/ه, ى/ي, no vowels)
     · order matters: the score is the share of the model's words heard IN SEQUENCE
     · one- and two-word sentences need every word; longer ones need three in four,
       and at most two extra words
   Pure, no DOM. Tests: node scripts/test-match.js
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Match = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const strip = s => String(s || "").replace(/[ً-ْٰـۖ-ۭ]/g, "");
  function fold(s) {
    return strip(s)
      .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[ءؤئ]/g, "ا")
      .replace(/[؟،؛.!?,:;"«»()]/g, " ").replace(/[^؀-ۿ\s]/g, "").replace(/\s+/g, " ").trim();
  }
  const toks = s => fold(s).split(" ").filter(Boolean);
  function lcs(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[m][n];
  }
  /* spoken answer vs model → { score 0..1, ok, exact } */
  function spoken(heard, target) {
    const t = toks(target), h = toks(heard);
    if (!t.length || !h.length) return { score: 0, ok: false, exact: false };
    const exact = t.join(" ") === h.join(" ");
    const inOrder = lcs(t, h);
    const score = Math.round((inOrder / t.length) * 100) / 100;
    const extra = Math.max(0, h.length - t.length);
    const enough = t.length <= 2 ? inOrder === t.length : score >= 0.75;
    const ok = exact || (enough && extra <= 2);
    return { score: exact ? 1 : score, ok, exact };
  }
  return { fold, toks, lcs, spoken };
});
