# Handover & Living Architecture — `rkarim25/arabiclanguage`

**Live URL:** https://rkarim25.github.io/arabiclanguage/  
**Last Updated:** 2026-11-20  
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
   - Continuously measures what Reza **can** and **cannot yet** do across 5 dimensions (accessible via `📊 Capabilities` on `index.html` and serialized into `LEARNER_CONTEXT.md` exports):
     - **Vocabulary:** Held (`box ≥ 3`) vs active learning vs slips.
     - **Sentences:** Held overall vs **proven active** (spoken via Whisper/mic or typed cleanly) vs passive-only recognition.
     - **Concepts:** Visual Lesson Cards (`lc:*`) studied/solid + Grammar rules (`gt:*`) solid vs recurring error categories (`js/errors.js`).
     - **Qur'ān by Ear:** Ayahs held + cold ear checks in the last 7 days.
     - **Modality Balance:** Screen vs hands-free Commute sessions and unverified pocket-heard items.

3. **Automatic Bidirectional Cross-Sync (`Practice.syncVerdict` + `data/aliases.json`):**
   - Rating any item in Screen `Practice`, `Commute Practice`, `chapters.html`, or standalone tables/tests automatically updates:
     - Primary SRS key (`chap:N:i`, `cls:*`, `ev-*`, `qc:*`, `fam-*`, `lc:*`, `gt:*`, `s:q:*`, `qw:*`) plus every cross-page twin in `data/aliases.json` (`615` groups covering `2,219` keys generated by `scripts/gen-aliases.js`).
     - Matching Chapter sentence keys (`chap:N:i`) AND advances the saved Chapter line pointer (`ats-chap-line-chap-N` + `ats-current-chap-id`) so `#homeChapStrip` (`index.html`) and `#chapMasteryStrip` (`chapters.html`) automatically reflect `X/10 sentences & Y/Z words` and flag `🔥 Test Ready` at ≥8/10 green.
     - Constituent canonical vocabulary keys (`registerWordKeys` across `index.html`, `sentences.html`, `words.html`, `chapters.html`, `audio.html`, `story.html`), `tw:*` tap-words, and raw-Arabic Chapter vocab keys.
     - Grammar completion (`gtest-done` + `gt:*` ratings) and Qur'ān word keys (`qw:*`, `qc:*`).

4. **Hands-Free Commute `Practice` (`audio.html?commute=1`) & Screen Modality Compensation:**
   - **Commute Version (`Practice.buildCommuteQueue`):** ~13-minute hands-free loop assembling (1) proven Sunday script warm-up, (2) 1 pure-English spoken Lesson Card Golden Rule cue (`audioCue` + `arModel`), (3) active weekly Chapter + `myday` sentences (audio Teach-First on unseen lines), (4) Mishary Rashid Alafasy Qur'ān ayahs by ear, and (5) due/weekly vocabulary interleaved with sentences. Supports live `✓ / ≈ / ✗`, lock-screen `⏭ / ⏮`, and crash-safe `ats-commute-live` persistence (`ungradedKeys`, `ungradedSentKeys`).
   - **Screen Modality Compensation (`Practice.analyzeCommuteBalance`):** Because audio commutes cannot show Arabic spelling/vowels, visual Lesson Card diagrams, or verify pocket-heard ungraded items, normal Screen `Practice` automatically detects heavy commute streaks (`commuteHeavy`) or unverified pocket items (`commuteDebt`) and compensates on the next screen session by:
     1. Pulling pocket-heard commute words & sentences for visual verification (`🚗→📱 Screen Check`).
     2. Boosting visual **Lesson Cards** (`lc:*`) and **Grammar** vowel checks (`gt:*`).
     3. Nudging active `🎯 Try it` spoken/typed production.

5. **Visual Lesson Cards (`data/lesson-cards.json`, `js/lesson-cards.js`, `sets.html` & `quran.html`):**
   - **15 structured visual cards** (`lc:negation`, `lc:verb-tenses`, `lc:price-triplet`, `lc:pronoun-attachments`, `lc:idafa-vs-adjective`, `lc:lookalike-roots`, `lc:sadr-vs-qalb`, `lc:requests-and-modals`, `lc:days-and-clock`, 4 Qur'ān Decoding moulds: `lc:quran-glue-chains`, `lc:quran-active-passive`, `lc:quran-plural-story`, `lc:quran-verb-shifts`, and 2 Mosque cards: `lc:khutbah-roadmap`, `lc:duas-and-imam`) with diagrams (`timeline`, `lanes`, `fortress`), neural audio tables (plus Mishary Alafasy `reciteVerse` on `ayahRef` rows), trap warnings, pure-English commute `audioCue`s, and SRS review bars. Shelved at the top of `sets.html` (`#lc-<id>`) and mirrored on `quran.html`, taught at `#1` in `Practice`, and reviewed via SRS.

6. **`🧑‍🏫 Teacher` Tab & Headmaster Master Plan (`class.html`):**
   - Top nav (`js/app.js`) exposes **`🧑‍🏫 Teacher`** (`class.html`), combining:
     - **📋 Auto-Updating 20-Minute Teacher Brief (`#teacherBrief`):** Pulls words, sentences, grammar/Lesson Cards, and Qur'ān items Reza actually practised (`ats-log` + `ats-srs`, switchable `Today` / `7 days` / `14 days`), strictly capped to fit **~20 minutes** of live lesson time (max 4 sentences, max 5 words, 1 grammar twist, 1 roleplay scenario, 1 Qur'ān ayah + up to 3 Qur'ān words + 1 short root/meaning gem, and a 5-word + 2-sentence chat wrap-up rule). 1-tap copy in **🇬🇧 English**, **🇸🇦 العربية**, or **🌐 Both**, plus `⚡ Practise Brief` deep-link into `index.html`.
     - **🗣 Collapsed Live AI Practice Session Brief (`#aiPracticeBriefCard` / `renderAiPracticeBrief`):** Collapsed-by-default `<details>` card right under `#teacherBrief` that dynamically builds a 5-minute AI Voice Sparring prompt from the same recent `Practice` & `Commute` items, with 1-tap `📋 Copy AI Voice Brief`, `📄 Learner Context`, and `⚡ Practise These Items →`.
     - **🗺️ My Progress & Coming Weeks Master Plan (`#masterPlanSection`):** Live capability metrics (`Practice.summarizeCapabilities`), 10-Chapter spine strip, dynamic Now vs Coming Weeks roadmap, and collapsible 4-Stage Master Syllabus.
     - **📥 Paste Preply Chat Notes (`#pasteLessonSection`)** + collapsible **📚 Captured Preply Lessons & Mastery Tests Archive (`#pastClassesArchive`)**.

7. **Universal Dynamic `Practice` Deep-Linking (`index.html` `loadFocusedPracticeFromUrl` + `sourceLinkMeta`):**
   - Every tab dynamically links into `index.html` (`?chap=chap-N`, `?surah=<id>`, `?qpillar=structures|core|salah|composable`, `?lc=<id>`, `?set=<id>`, `?grammar=<id>`, `?class=<id>`, `?focus=words&wsrc=...&dot=...`, `?filter=...&dot=...`, `?keys=...`), opening unseen items in Teach mode and seen items in Review mode with a 1-tap `⚡ Back to Daily Adaptive Batch` banner; every card in `index.html` also carries a clickable source badge linking back to its home tab.

8. **Direct Standalone Review Anywhere, Same Earned Dots (`words.html`, `sentences.html`, `chapters.html`, `quran.html`, `sets.html`, `grammar.html`, `class.html`):**
   - Both `words.html` (`📋 All Words` + `⚡ Quick 10-Word Drill`) and `sentences.html` feature direct **`Review: [All | 🇬🇧 EN → AR | 🇸🇦 AR → EN]`** tap-to-reveal prompts (auto-playing audio on reveal) and frozen **`📉 Weakest First`** sorting (`↻ Resort` when ready) so rows never jump while marking `✗ · ≈ · ✓`.
   - Every standalone test and table across the site — Chapter tests (`chapters.html`, including sentence, vocab, Qur'ān ayah, and grammar items), Qur'ān Cold Listen & word tests (`quran.html`), Grammar 1-minute tests (`grammar.html`), live Set tables (`sets.html`), and Preply Class Mastery Tests (`class.html`) — feeds directly into `SRS.rate()` + `data/aliases.json` so Earned Mastery Dots (`⚪ / 🔴 / 🟡 / 🟢`) stay 100% unified everywhere.

---

## 2. Current Verified State (20 Nov 2026 — Friday Coach Check, Live Site & Speak with AI Prompt PP)

- **Telemetry & SRS Progress (`data:rkarim88@gmail.com` as of `2026-11-19T21:36:25Z`):** `4,457` total telemetry events (**`5/4` active days** in the last 7 days); `1,271` tracked SRS cards (**`429` 🟢 green** across 2+ days & `R ≥ 85%` incl. `68` retired — **up +25**!, **`683` 🟡 amber**, **`141` 🔴 red**, **`18` ⚪ grey**; **`874` Box ≥ 2**). Thursday night's completed Practice batch (`21:24Z–21:35Z`) promoted `qc:150 عَنْ` to **Box 3**, `s:qs:88:13 فِيهَا سُرُرٌ مَّرْفُوعَةٌ` to **Box 2 🟢**, and `gt:nominal:0` ✓, while flagging `md:47 كَيْفَ كَانَ يَوْمُكِ؟` (`no`, Box 0 🔴), `gt:tenses:1` (`maybe`), `md:44 أُحِبُّ القَهْوَةَ كَثِيرًا.` (`maybe`), and `md:23 المَسَاءُ لِلْعَائِلَةِ.` (`maybe`). Zero `#72+` pen notes or voice/Preply pastes in KV (Cloudflare KV `keys` list API returned transient `7009` on `img:` check).
- **Capabilities & #1 Bottleneck Gap (`Practice.summarizeCapabilities`):**
  - **Vocabulary & Qur'ān Top 151 Core:** `144/691` words held (`210` seen, `11` learning, `55` slips); `57/151` Core Qur'ān words held (**`39.7%`** of Mushaf occurrences, `30,737` tokens); **`317`** composable `i+1` ayahs unlocked; `4/17` Lesson Cards seen (`0` green yet; `lc:negation` & new `lc:verb-patterns` / `lc:arabic-persons` still `⚪` unseen); `0/60` Mosque/Khutbah cues seen.
  - **#1 Gap:** **Active sentence output & verb-tense / feminine `-ki` recall under live prompts:** **`42/45` held sentences remain passive-only** (`3` proven active, **`0/10` Chapter 4 sentences rated**), compounded by Thursday night slips on `كَيْفَ كَانَ يَوْمُكِ؟` (`no`), `gt:tenses:1` (`maybe`), and `qc:82 أَرَادَ` (`maybe`), plus unseen `lc:verb-patterns`, `lc:arabic-persons`, `lc:negation`, and `0/60` Mosque/Khutbah cues on Jumu'ah.
- **Speak with AI & Associated Docs Updated (Prompt PP — Friday 20 Nov Jumu'ah & Spoken Unlock):**
  - Updated `chapters.html` (`buildChapterAiPrompt`), `class.html` (`buildClassAiPrompt`), `js/app.js` (`generateLearnerDossierMarkdown`), `SPEAK_WITH_AI.md` (Prompt PP current, Prompt OO archived), `LEARNER_CONTEXT.md`, `MASTER_PLAN.md`, and `HANDOVER.md`.
- **Sunday 15 Nov Preply Lesson Check:** Passed 5 days ago (`classes.json` latest still `c-2026-10-11`); awaiting Reza's notes/photos if class took place.

### 2.0b. Earlier 19 Nov Snapshot (Pen Note #71, 2 New Verb/Person Lesson Cards & Evening Sync Fix)
- **Pen Note #71 (Processed & Shipped — 2 New Visual Lesson Cards + Conjugation Table Link):**
  - Reza asked (`2026-11-19T06:48Z` on `index.html`): *(1)* what the general Past → Present verb patterns are (e.g. `تَعَلَّمَ → يَتَعَلَّمُ` vs `ذَهَبَ → أَذْهَبُ` — *"if yes maybe in a lesson card would help ideally"*), and *(2)* whether the 8-person core table is too short compared to the full 14 Arabic persons (dual, feminine plural, m/f `you`).
  - Added **`lc:verb-patterns`** (*Past → Present Verb Patterns: The 3 Engines* — Form I `ذَهَبَ → أَذْهَبُ`, Form II/IV `yu-/u-` `عَلَّمَ → يُعَلِّمُ` & `أَرَادَ → يُرِيدُ`, Form V/X `تَعَلَّمَ → أَتَعَلَّمُ` & `اِسْتَيْقَظَ → أَسْتَيْقِظُ`) and **`lc:arabic-persons`** (*8 Core Persons vs All 14 Arabic Persons* — showing Core 8 already includes `أَنْتِ` for Saba and covers ~97% of everyday speech, while duals `هُمَا / أَنْتُمَا` & fem. plurals `هُنَّ / أَنْتُنَّ` wait for ear recognition, with Alafasy `55:13` audio) in `data/lesson-cards.json` (`17` Lesson Cards total), updated `scripts/gen-audio.py` to compile `speakParts`, added a direct link inside `relevantVerbConjHtml()` (`js/app.js`), and added regression checks in `scripts/test-lesson-cards.js`.
- **Evening Cloud Sync & Note/Report Submission Fix (`2026-11-19T21:25Z`):**
  - Audited note/report submission after Reza said notes had been sent (`data:rkarim88@gmail.com` showed only `md:47` `كَيْفَ كَانَ يَوْمُكِ؟` rated `no` at `21:24:25Z`, zero new `#72+` notes or pastes in KV). Fixed 4 real bugs found during audit: (1) `autoSync(true)` in `js/tracker.js` now awaits and resolves the queued follow-up sync instead of returning `false` while startup `_syncing` is active; (2) moved stray `ats-mastery-updated` JS from after `</html>` back inside `<script>` on `class.html`; (3) `saveAiVoiceReport()` (`chapters.html`), `saveClassAiVoiceReport()`, and `submitPreplyLesson()` (`class.html`) now `await autoSync(true)` and report honest cloud vs device-only status; added regression assertions in `scripts/test-shell.js`.
- **Speak with AI & Associated Docs Updated (Prompt OO):**
  - Updated `chapters.html` (`buildChapterAiPrompt`), `class.html` (`buildClassAiPrompt`), `js/app.js` (`generateLearnerDossierMarkdown`), `SPEAK_WITH_AI.md` (Prompt OO current, Prompt NN archived), `LEARNER_CONTEXT.md`, `MASTER_PLAN.md`, and `HANDOVER.md`.
- **Sunday 15 Nov Preply Lesson Check:** Passed 4 days ago (`classes.json` latest still `c-2026-10-11`); awaiting Reza's notes/photos if class took place.

### 2.0. Earlier 18 Nov Snapshot (Wednesday Progress Audit & Prompt NN)

### 2.0. Earlier 17–18 Nov Milestones (`sets.html` Fix, Quick Checks, Verb Conjugations, Grammar Typing, KFGQPC Tanwīn, Scroll Continuity)

- **17 Nov 2026 — Tuesday Health Audit (`sets.html` Fix) & Prompt MM:** Caught & fixed `TypeError` in `sets.html` `refreshSetHeaders()` (`Array.isArray(EV)` guards) and published Prompt MM across Speak with AI & docs.
- **18 Nov 2026 — Lesson Card Quick-Check Inline Reveal & Built-In Quick Check Fix:** Fixed Review-mode Lesson Cards in `index.html` (`s.lcMode !== "teach"`) so cards like `lc:verb-tenses` (`Flip "I read the Qur'an" across Past → Present → Future:`) show `Check answer →` and reveal their exact Quick Check answer (`قَرَأْتُ القُرْآنَ ← أَقْرَأُ القُرْآنَ ← سَأَقْرَأُ القُرْآنَ`) inline with individual `speakParts` audio chips and a collapsed `📇 Full Lesson Card:` drawer instead of replacing the row with the `ذَهَبْتُ` paradigm table. Updated `js/lesson-cards.js` (`renderQuickCheckHtml`, `speakParts`, `renderBodyHtml`) and `data/lesson-cards.json` (`speakParts` on multi-part Quick Checks) so full Lesson Cards on `sets.html` / `quran.html` and Teach-mode Practice also display their Quick Check automatically.
- **18 Nov 2026 — Relevant-Verb Conjugations Everywhere (No More Repeated `فَعَلَ / يَفْعَلُ` Templates):** Added 12 missing everyday/Preply verbs (`عَادَ / يَعُودُ`, `عَاذَ / يَعُوذُ`, `تَنَاوَلَ / يَتَنَاوَلُ`, `سَاعَدَ / يُسَاعِدُ`, `رَتَّبَ / يُرَتِّبُ`, `اسْتَغْفَرَ / يَسْتَغْفِرُ`, `فَضَّلَ / يُفَضِّلُ`, `فَازَ / يَفُوزُ`, `انْتَظَرَ / يَنْتَظِرُ`, `نَسِيَ / يَنْسَى`, `انْتَهَى / يَنْتَهِي`, `قَضَى / يَقْضِي` — `94` verbs total in `data/conjugations.json`, `0` mismatches in `gen-conj.js --check`), generated neural audio for all new + `سَـ` future forms (`11,635` total clips, `0` failed), built `findRelevantVerb()` + `relevantVerbConjHtml()` in `js/app.js`, and wired verb-specific Past/Present/Future + expandable 8-person tables across `index.html` (sentences, verb-grammar checks `gt:*`, word cards, and `lc:verb-tenses`), `sentences.html`, and `words.html` (both Quick Drill & Master Sheet).
- **18 Nov 2026 — Inline English-to-Arabic Typing & Grading on `grammar.html` (plus `al ` + `-tun/-tan` on `ة` + `h:`/`t:` legends):** Wired `attachInlineTranslit` onto every `.fill-input` box in `grammar.html` with an inline transliteration key caption, stopped auto-opening/stealing focus into `#kbDock` on load (`⌨ typing box` remains an optional toggle), and switched `gCheck` to forgiving `answerMatchAr()` grading (`✓ Right by sound — exact spelling:` feedback for phonetic approximations). Also enhanced `expandArticles()` (`al misbaahu` space-separated article joining), `writeMatchAr()` (`-tun`/`-tan`/`-tin` on tanwin `ة` while keeping bare consonant endings strict), `attachInlineTranslit()` (external value sync + select-all replacement), and added `h:` → `ة` alongside `t:` across `LATIN_TO_AR`, `keyboard.html`, `learn.html`, and all legends.
- **18 Nov 2026 — Normalized Legacy KFGQPC Tanwīn Codepoints (`U+065E` / `U+0657` / `U+0656` → `ٌ` / `ً` / `ٍ`):** Replaced pre-Unicode-6.1 KFGQPC font codepoints in `data/verses.json` and `data/quran-sentences.json` (which caused `Noto Sans Arabic` to draw `U+065E` dammatan in `سُرُرٞ مَّرۡفُوعَةٞ` like a slanted division sign `◌ٞ`) with standard Unicode `U+064C` (`ٌ`), `U+064B` (`ً`), and `U+064D` (`ٍ`), hardened `import-quran-sentences.js` and `gen-surah.js`, regenerated `sentence-bank.json`, `aliases.json`, and `lexicon.json`, and added regression guards in `scripts/test-sentences.js`.
- **18 Nov 2026 — Top-of-Section Landing & Exact-Spot Back Navigation:** Added `scroll-margin-top: 64px` in `css/style.css` so sticky `<nav>` never covers `#hash` targets (`sets.html#lc-...`, `quran.html#lc-...`); added `history.scrollRestoration = "manual"` + top `requestAnimationFrame(() => window.scrollTo(0, 0))` in `grammar.html` (`renderPattern` & `renderVerbEars`) so `Full rule →` always lands at `scrollY = 0`; added `← Back to Practice` links inside `sets.html` Lesson Cards & Set tables; and added `savePracticeScrollSpot()` / `restorePracticeScrollSpot()` (`sessionStorage["ats-practice-scroll"]`, aligning the exact clicked card's viewport `top`) plus `saveNonAdaptiveBatchSession()` / `restoreNonAdaptiveBatchSession()` (`ats-live-focused-batch`) in `index.html`.

## 2.1. Historical Milestones & Features Added (16 Nov 2026 — Monday Mid-Week Session & Link Continuity Fix)

- **Telemetry & SRS Progress:** 4,338 total telemetry events; 1,268 tracked SRS cards (796 green/mastered incl. 64 retired, 311 amber building, 161 red needs work). Practice session active this morning (rated `lc:quran-glue-chains` and `qc:0`).
- **Recent Slips Queue:** `مِصْعَد` (lift/elevator), `طَابِق` (floor), `الآنَ` (now), `مَرَّة` (time/occasion: `مَرَّةً أُخْرَى`), `الاثْنَيْن` (Monday), `يَوْمَ الثُّلَاثَاءِ` (Tuesday), `أُرَتِّبُ` (I arrange/tidy), `حَفْلَة` (party), `عَبَدْتُ اللهَ` (I worshipped Allah), `كَيْفَ كَانَ يَوْمُكِ؟` (to Saba, -ki), `فِيهَا سُرُرٌ مَرْفُوعَةٌ` (88:13), and `ٱلْمَغْضُوبِ` (1:7 wrath/anger root).
- **Pen Note #70 (Processed & Verified):** Reza reported that in Practice, clicking "Full rule →" on a word with a grammar note navigated to the general list rather than the dedicated rule section, and pressing Back scrambled the Practice page to a different batch.
  - *Root Cause 1:* `index.html` (lines 950, 952) and `sentences.html` (line 348) used `grammar.html#${g.id}` instead of `grammar.html?g=${g.id}`, while `grammar.html` only checked `URLSearchParams.get("g")` and lacked hash routing or `popstate` listeners.
  - *Root Cause 2:* `index.html` had no in-flight batch persistence; navigating away and pressing Back triggered a fresh `loadPracticeBatch()`, which re-randomized the 10 cards and wiped progress.
  - *Fix Deployed:*
    1. Updated all grammar links across `index.html` and `sentences.html` to `grammar.html?g=${encodeURIComponent(g.id)}`.
    2. Enhanced `grammar.html` with `getRoutePatternId()` (supporting both `?g=` and `#` hashes), a prominent `← Back to Practice` link calling `history.back()`, and active `popstate`/`hashchange` event listeners.
    3. Implemented robust session batch persistence (`savePracticeBatchSession` / `restorePracticeBatchFromSession` via `sessionStorage['ats-live-practice-batch']`) in `index.html` so leaving Practice and returning via Back restores the exact 10 cards, revealed state, and ratings without re-randomizing or emitting duplicate batch logs.
    4. Enhanced routing and `hashchange`/`popstate` listeners in `sets.html`, `quran.html`, and `chapters.html` to ensure site-wide linking continuity.
    5. Added 4 automated regression assertions in `scripts/test-shell.js`.
- **Speak with AI Updated:** Added **Prompt LL (Monday 16 Nov Mid-Week Spoken Reinforcement & Continuity Workout)** in `SPEAK_WITH_AI.md` covering Chapter 4 routine & times, Monday/Tuesday work routines, past negation (`لَمْ` vs `مَا`), recent slips (`مِصْعَد`, `الآن`, `مَرَّة`), and 4-Pillar Qur'ān Decoding + Mosque landmarks.
- **Learner Dossier Synchronized:** Updated `LEARNER_CONTEXT.md` with verified 4,338 telemetry events, 1,268 SRS cards, and prompt references.
- **Sunday 15 Nov Preply Lesson Check:** Lesson passed yesterday; awaiting lesson notes/photos to run ingestion pipeline.

## 2.1. Historical Milestones & Features Added (15 Nov 2026)

- **Telemetry & SRS Progress:** 4,269 total telemetry events; 1,266 tracked SRS cards (215 green/mastered incl. 64 retired, 890 amber building, 161 red needs work). Completed Sunday Practice and awaiting Sunday 15 Nov Preply lesson notes/photos to ingest.
- **Recent Slips Queue:** `مِصْعَد` (lift/elevator), `طَابِق` (floor), `الآنَ` (now), `مَرَّة` (time/occasion), `الاثْنَيْن` (Monday), `يَوْمَ الثُّلَاثَاءِ` (Tuesday), `أُرَتِّبُ` (I arrange/tidy), `حَفْلَة` (party), `كَيْفَ كَانَ يَوْمُكِ؟` (to Saba, -ki), `فِيهَا سُرُرٌ مَرْفُوعَةٌ` (88:13), and `ٱلْمَغْضُوبِ` (1:7 wrath/anger root).
- **Sunday 15 Nov 07:00 UK Preply Lesson:** Post-lesson debrief & 4-Pillar Qur'ān Decoding prompt primed in `SPEAK_WITH_AI.md` (Prompt KK), `chapters.html`, and `class.html` (Village breakfast, time, ordinals, past verbs, negative past).
- **Chapters 1–3:** Mastered at 100% on chapter tests; **Chapter 4 (Daily Routine, Time & Tenses)** is the active weekly Chapter advancing automatically via Practice.
- **Motivation, Energy & Session-Adjustment Engine (`Practice.summarizeMotivation`, `#motivationStrip`):** Live 7-day consistency rhythm (`X/4 target days` — zero guilt on rest days) + 1-tap `😮‍💨 Low energy / 🙂 Steady / ⚡ Energised` selector at the top of Practice that immediately scales session budget (`6.0` light confidence review vs `10.0` daily core vs `surge`) and feeds post-batch check-ins (`planMoodHTML`) + `📊 Capabilities`.
- **Decluttered Practice Layout & Next-Batch Flow (`index.html`):** Removed confusing `"🎯 Try them all · ✨ Free try · 🎧 By ear"` row, moved Chapter 4 progress (`#homeChapStrip`) and Coach's Note (`#coachCard`) below `#viewPractice`, and added always-visible **`▶ Batch N →`** controls in both the Practice header and `#doneArea` (even on partially rated batches).
- **Recent Pen Notes Resolved (#66, #67, #68, #69):**
  - **#66:** Added `She (هِيَ: ذَهَبَتْ / تَذْهَبُ / سَتَذْهَبُ)` and `They (هُمْ: ذَهَبُوا / يَذْهَبُونَ / سَيَذْهَبُونَ)` to `lc:verb-tenses` and `data/grammar.json` (+ neural MP3 generated).
  - **#67:** Enlarged inline Arabic via `.ar-inline` + `enhanceInlineArabic()` across hints, grammar boxes, and Lesson Cards (`19–28px` `Noto Sans Arabic`, preserving mid-word `<b>` cursive joining).
  - **#68:** Added direct `✗ · ≈ · ✓` word rating buttons (`rateSurahWord`) to every word row in `quran.html` Study mode alongside ayah ratings.
  - **#69:** Upgraded `fuzzyEn()` (`js/app.js`) with multi-group Qur'ānic synonym matching (`wrath / anger / angered`, `astray / lost / misguided`, `favoured / blessed`, etc.) and included `aiMeaning` head glosses in `quran.html` `gradeVerse()`.
- **15 Nov 2026 — 4-Layer Qur'ān-by-Ear Engine Re-Gear:** Re-geared `Practice` (`js/practice.js`, `index.html`) and `Commute` (`audio.html`) so Qur'ān-by-ear builds foundational decoding leverage first: Glue & Pronoun Chains (`lc:quran-glue-chains`) + Qur'ān Ear Moulds (`lc:quran-active-passive`, `lc:quran-plural-story`, `lc:quran-verb-shifts`, proactively taught at `#1`), frequency-ranked Top 151 Core Words (`qc:0..150`, ~45.8% of the 77,430-word Mushaf), the 13 Salah Surahs, and `i + 1` Composable Juz' 'Amma Ayahs (`Practice.ayahReadiness` gating cold dense verses). Upgraded `quran.html` into the visual 4-Layer Engine Strip & reference/review hub (`🧱 Structures & Moulds`, `📊 Top 151 Core Words`, `🕋 13 Salah Surahs`, `🔓 Unlocked i+1 Ayahs`) with `?qpillar=` deep-links into `Practice`.
- **15 Nov 2026 — Friday Khutbahs, Common Du'ās & What the Imam Says (Build `mwi7yu2g`):** Expanded `data/everyday.json` (`khutba`: 22, `duas`: 18 with `ayahRef` on Qur'ānic *Rabbanā* & sermon ayahs, `masjid`: 20 = **60 cues**), added `lc:khutbah-roadmap` and `lc:duas-and-imam` Lesson Cards (`15` total), updated `ms-masjid` in `gen-curriculum.js`, wired daily `Practice` (with Thu/Fri Jumu'ah boost + `summarizeCapabilities().mosque`), `Commute`, `sets.html` (`Mosque, Friday khutbah & common du'ās` section), `sentences.html` (`🕋 Mosque & Du'ās` filter), and the 5th pillar/tab on `quran.html?tab=mosque` (`index.html?qpillar=mosque`). Regenerated curriculum/sentences/aliases/lexicon + 87 new neural MP3s (`11,334` clips, 0 failures); **16/16** test suites pass.
- **15 Nov 2026 — Quiet Interactive Book Redesign & Printable Weekly Booklet (`weekly.html`):** Restyled `css/style.css`, `js/lesson-cards.js`, and all tabs (`index.html`, `chapters.html`, `sentences.html`, `words.html`, `quran.html`, `sets.html`, `class.html`) into a wide `1160px` two-column Open-Book Spread (`--font-serif` editorial English, horizontal parallel rows with target prompt first, quiet italic `.book-cue` reveals, flat small right-margin Earned Mastery Dots, stripped diagnostic percentage/slip pills & visual badge clutter, auto-collapsing Lesson Cards on `✓ Got it`, and secondary controls tucked under `⋯` `<details class="more">`) with 100% interactive audio/SRS parity. Added `weekly.html` (`980px` booklet screen measure, precached in `sw.js`, quiet in `js/plan.js`, exposed via `#navPrintWeek` in the persistent top nav, `.print-week-cta` in Practice, and links on Chapters, Qur'ān & Teacher with `?print=1` 1-click auto-print) generating a Weekly Learning Booklet + `⚡ My Week` / `📖 Book Chapter` toggle formatted for screen audio reading and crisp A4 `@media print` PDF (`🖨️ Print / Save This Week's PDF`). **16/16** test suites pass.
- **15 Nov 2026 — Wikipedia (`Vector 2022`) Reading-First Redesign:** Rebuilt the visual system in `css/style.css`, `js/lesson-cards.js`, and across `index.html`, `chapters.html`, `sentences.html`, `words.html`, `quran.html`, `sets.html`, `class.html`, and `weekly.html` around Wikipedia `Vector 2022` readability: crisp `#ffffff` paper (`#101418` dark), `#202122` charcoal ink, `#3366cc` editorial links & flat active underlines, regular-weight (`400`) serif `h1`/`h2` headings with full-width bottom hairlines, regular `16px` `--font-ui` body/meanings, crisp black `#202122` Arabic (`24–26px`, `line-height: 1.85`), `2px`-radius Codex controls & `#f8f9fa` `wikitable` / infobox surfaces replacing `999px` capsule pills, a single-line hatnote consistency bar, and **`Read` | `Test recall`** Vector tabs on `Practice` (`ats-practice-view`, defaulting to **`Read`** so English & Arabic appear side-by-side without tapping).

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
