# Handover & Living Architecture — `rkarim25/arabiclanguage`

**Live URL:** https://rkarim25.github.io/arabiclanguage/  
**Last Updated:** 2026-11-13  
**Primary Learner:** Reza Karim (`rkarim88@gmail.com`) — senior investment manager with a **young family** and **demanding job** who struggles with consistency · **Secondary Learner:** Saba Khan (`sabatarif.15@gmail.com`, additive-only rule)

## 0. The Headmaster Charter (Read First)

- **Living Master Plan:** Read and update MASTER_PLAN.md on every coaching cycle (tracks live capability deltas, 4-stage syllabus progression, and the 25-minute Preply Spoken Match Day protocol).
- **Your Objective:** Get Reza **fluent in conversational Arabic (MSA)** AND **understanding the Qur'ān as it is recited (by ear)**.
- **Your Role — Headmaster, Primary Teacher, Motivator & Mentor:** Any AI operating this site is **personally responsible for Reza's Arabic education**. Other teachers (such as his Sunday 07:00 UK Preply tutor or AI voice sparring partners) are supplementary inputs, **but you are the Headmaster and control the curriculum completely**.
- **Your Primary Teaching Method:** **`Practice` sessions** (`index.html` Home on screen + `audio.html?commute=1` hands-free) are your primary classroom for teaching, reviewing, diagnosing, and motivating him.
- **Creative Freedom & Mentorship:** Because Reza balances a young family and demanding career, engineer effortless consistency (zero guilt on gaps, gentle re-entry, 5–10 min bursts, hands-free commutes, honest celebration of real wins) and **allow yourself full pedagogical creativity** — inventing new visual Lesson Cards, Bengali/English/Qur'ānic hooks, micro-drills, or UX improvements whenever they serve the twin fluency + Qur'ān objective.

---

## 1. Core Architecture: 7-Tab Layout + Earned Mastery Dots + Unified `Practice`

### A. Coherent 7-Tab Navigation (`js/app.js` `renderNav`)
- `⚡ Practice` (`index.html` — Home) · `📖 Chapters` (`chapters.html`) · `💬 Sentences` (`sentences.html` Master Library) · `📇 Words` (`words.html` Master Vocab + Quick 10-Word Drill) · `🕌 Qur'ān` (`quran.html` Surahs, Ayahs & Words by ear) · `🗂 Sets` (`sets.html` Visual Lesson Cards, Thematic Sets & Grammar) · `🧑‍🏫 Teacher` (`class.html` 20-Min Teacher Brief & Master Plan).

### B. Live, Read-Only Earned Mastery Dots (`⚪ / 🔴 / 🟡 / 🟢`) + Neutral `✗ · ≈ · ✓` (`js/srs.js`)
- Every item practised or tested across the site carries a **read-only Earned Mastery Dot** (`SRS.masteryState`, `SRS.dotHtml`, `SRS.summaryCounts`, `SRS.refreshDots` — 100% live client-side FSRS math with zero daily AI dependency):
  - `⚪` **Grey (`Unseen`):** Never practised or tested yet.
  - `🔴` **Red (`Needs work`):** Missed recently (`g === "no"` or `box === 0` after exposure).
  - `🟡` **Amber (`Building`):** Passed on 1 day (`box === 1`), hesitant (`g === "maybe"`), or overdue FSRS recall `R < 0.85`.
  - `🟢` **Green (`Mastered`):** Proven cleanly across **2+ separate days** (`box >= 2`, `g !== "maybe"`, `R >= 0.85`) or `⊘` retired.
- Self-report buttons (`✗ · ≈ · ✓` + optional `⊘`) are styled in calm neutral monochrome so **only the earned mastery dot carries colour**. `hydrateChapterHistory()` in `js/app.js` also hydrates historical `test-item` (`test: "chapter"`) and `sent-drill` log events onto `chap:N:i` automatically.

### C. Unified `Practice` + `Commute` + Auto-Sync

`Practice` (`index.html` + `js/practice.js`) is Reza's **primary interface** to the website across all 5 learning streams (**Vocabulary, Sentences, Qur'ān by ear, Grammar, and Lesson Cards**):

1. **Both Teaches Unseen Material & Reviews Seen Material:**
   - **Teach Mode (`🆕 Teach`, `practiceMode: "teach"`):** Unseen items open pre-revealed (`_autoReveal: true`) with word-by-word glosses, transliteration, inline grammar rule explanations (`.s-gram-box`), or full visual **Lesson Cards** (`lc:<id>` positioned at `#1` before sentences apply the rule) so Reza learns them cleanly before rating.
   - **Review Mode (`practiceMode: "review"`):** Seen/due items stay masked (`_autoReveal: false`) for active recall, spoken `🎯 Try it`, or Latin-to-Arabic typed production.
   - **Incremental Multi-Batch Flow (`Batch 1` → `Batch 2` → `Batch 3+`):** Batch 1 completes the daily core (`10.0` effort units) and advances the active weekly Chapter's sentences; Batch 2 (~75–85% review) and Batch 3+ (~90–100% deep review) stay in the exact same screen without switching pages. Every batch generates a tailored **3–5 min AI Speaking Brief (`🗣 Speak Brief`)**.

2. **Granular Capability Ledger (`Practice.summarizeCapabilities` → `ats-capabilities`):**
   - Continuously measures what Reza **can** and **cannot yet** do across 5 dimensions (accessible via `📊 Capabilities` on `sentences.html` and serialized into `LEARNER_CONTEXT.md` exports):
     - **Vocabulary:** Held (`box ≥ 3`) vs active learning vs slips.
     - **Sentences:** Held overall vs **proven active** (spoken via Whisper/mic or typed cleanly) vs passive-only recognition.
     - **Concepts:** Visual Lesson Cards (`lc:*`) studied/solid + Grammar rules (`gt:*`) solid vs recurring error categories (`js/errors.js`).
     - **Qur'ān by Ear:** Ayahs held + cold ear checks in the last 7 days.
     - **Modality Balance:** Screen vs hands-free Commute sessions and unverified pocket-heard items.

3. **Automatic Bidirectional Cross-Sync (`Practice.syncVerdict`):**
   - Rating any item in Screen `Practice`, `Commute Practice`, `index.html`, or Master tables automatically updates:
     - Primary SRS key (`chap:N:i`, `ev-*`, `qc:*`, `fam-*`, `lc:*`, `gt:*`, `s:q:*`).
     - Matching Chapter sentence keys (`chap:N:i`) AND advances the saved Chapter line pointer (`ats-chap-line-chap-N` + `ats-current-chap-id`) so `index.html` automatically reflects `X/10 sentences & Y/Z words solid` and flags `🔥 Test Ready` at ≥8/10 solid.
     - Constituent canonical vocabulary keys (`registerWordKeys` on `sentences.html`, `index.html`, `audio.html`, `story.html`), `tw:*` tap-words, and raw-Arabic Chapter vocab keys.
     - Grammar completion (`gtest-done`) and Qur'ān word keys (`qw:*`, `qc:*`).

4. **Hands-Free Commute `Practice` (`audio.html?commute=1`) & Screen Modality Compensation:**
   - **Commute Version (`Practice.buildCommuteQueue`):** ~13-minute hands-free loop assembling (1) proven Sunday script warm-up, (2) 1 pure-English spoken Lesson Card Golden Rule cue (`audioCue` + `arModel`), (3) active weekly Chapter + `myday` sentences (audio Teach-First on unseen lines), (4) Mishary Rashid Alafasy Qur'ān ayahs by ear, and (5) due/weekly vocabulary interleaved with sentences. Supports live `✓ / ≈ / ✗`, lock-screen `⏭ / ⏮`, and crash-safe `ats-commute-live` persistence (`ungradedKeys`, `ungradedSentKeys`).
   - **Screen Modality Compensation (`Practice.analyzeCommuteBalance`):** Because audio commutes cannot show Arabic spelling/vowels, visual Lesson Card diagrams, or verify pocket-heard ungraded items, normal Screen `Practice` automatically detects heavy commute streaks (`commuteHeavy`) or unverified pocket items (`commuteDebt`) and compensates on the next screen session by:
     1. Pulling pocket-heard commute words & sentences for visual verification (`🚗→📱 Screen Check`).
     2. Boosting visual **Lesson Cards** (`lc:*`) and **Grammar** vowel checks (`gt:*`).
     3. Nudging active `🎯 Try it` spoken/typed production.

5. **Visual Lesson Cards (`data/lesson-cards.json`, `js/lesson-cards.js`, `sets.html`):**
   - 9 structured visual cards (`lc:negation`, `lc:verb-tenses`, `lc:price-triplet`, `lc:pronoun-attachments`, `lc:idafa-vs-adjective`, `lc:lookalike-roots`, `lc:sadr-vs-qalb`, `lc:requests-and-modals`, `lc:days-and-clock`) with diagrams (`timeline`, `lanes`, `fortress`), neural audio tables, trap warnings, pure-English commute `audioCue`s, and SRS review bars. Shelved at the top of `sets.html` (`#lc-<id>`), taught at `#1` in `Practice`, and reviewed via SRS.

6. **`🧑‍🏫 Teacher` Tab & Headmaster Master Plan (`class.html`):**
   - Top nav (`js/app.js`) exposes **`🧑‍🏫 Teacher`** (`class.html`), combining:
     - **📋 Auto-Updating 20-Minute Teacher Brief (`#teacherBrief`):** Pulls words, sentences, grammar/Lesson Cards, and Qur'ān items Reza actually practised (`ats-log` + `ats-srs`, switchable `Today` / `7 days` / `14 days`), strictly capped to fit **~20 minutes** of live lesson time (max 4 sentences, max 5 words, 1 grammar twist, 1 roleplay scenario, 1 Qur'ān ayah + up to 3 Qur'ān words + 1 short root/meaning gem, and a 5-word + 2-sentence chat wrap-up rule). 1-tap copy in **🇬🇧 English**, **🇸🇦 العربية**, or **🌐 Both**.
     - **🗺️ My Progress & Coming Weeks Master Plan (`#masterPlanSection`):** Live capability metrics (`Practice.summarizeCapabilities`), 10-Chapter spine strip, dynamic Now vs Coming Weeks roadmap, and collapsible 4-Stage Master Syllabus.
     - **📥 Paste Preply Chat Notes (`#pasteLessonSection`)** + collapsible **📚 Captured Preply Lessons & Mastery Tests Archive (`#pastClassesArchive`)**.

---

## 2. Current Verified State (13 Nov 2026 — Friday Evening)

- **Telemetry & SRS Progress:** 4,063 total telemetry events; 1,221 tracked SRS cards (698 cleared: 595 active solid in Box 3–5 + 103 retired/never; 382 active learning, 141 in Box 0).
- **Chapters 1–3:** Mastered at 100% on chapter tests; **Chapter 4 (Daily Routine, Time & Tenses)** is the active weekly Chapter advancing automatically via Practice.
- **Speak with AI:** Refreshed with **Prompt II** for Friday Eve / Saturday 14 Nov weekend workout & Sunday 15 Nov 07:00 UK Preply class warmup (9 visual Lesson Cards, past negation `لَمْ` vs `مَا`, Friday practice slips `عُقَد` 113:4, `حَاسِد`, `غَاسِق`, `عَبَدْتُ اللهَ`, `تَقَبَّلَ اللهُ`, `أُرَتِّبُ`, `حَفْلَة`, and village breakfast foods).
- **Audio Manifest:** `11,377` verified neural clips (`5,611` Arabic `ar-SA-HamedNeural` + `5,766` English `en-GB-RyanNeural`), plus Mishary Rashid Alafasy recitation for all Qur'ān ayahs and word-by-word clips.
- **Recent Pen Notes Resolved:** Notes #64 & #65 (`لَمْ أَذْهَبْ` vs `مَا ذَهَبْتُ`, never `✗ لَا ذَهَبْتُ`; redundant `#planBar` removed from `sentences.html`, multi-batch Practice with per-batch `🗣 Speak Brief`).

---

## 3. Non-Negotiable Operations Checklist

1. **Cloudflare KV Read-Modify-Write (`coach:rkarim88@gmail.com`):**
   - Namespace ID: `9532d5717021486a92f75efb6d7b8a94`.
   - **ALWAYS** fetch existing JSON first (`npx wrangler kv key get ... --remote`), modify only intended fields (`updated`, `note`, `focus`, etc.) while preserving `week` and `homework`, and write back via `--path`.
2. **Audio & Cache Stamp Before Every Deploy:**
   ```powershell
   python scripts/gen-audio.py
   node scripts/bump-version.js
   ```
3. **Run All 16 Automated Test Suites (`arabiclanguage/scripts/test-*.js`):**
   - `test-audio-coverage.js`, `test-chapter-drills.js`, `test-curriculum.js`, `test-drill-grade.js`, `test-errors.js`, `test-frames.js`, `test-freetry.js`, `test-lesson-cards.js`, `test-match.js`, `test-practice.js`, `test-progress-model.js`, `test-sentence-diag.js`, `test-sentences.js`, `test-shell.js`, `test-srs.js`, `test-typing.js` — all **16/16** must pass before pushing to `main`.
