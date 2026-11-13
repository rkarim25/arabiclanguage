# Arabic Learning Platform — `rkarim25/arabiclanguage`

**Live Site:** https://rkarim25.github.io/arabiclanguage/  
**Learners:** **Reza Karim** (`rkarim88@gmail.com`) and **Saba Khan** (`sabatarif.15@gmail.com`) — separate Cloudflare KV stores, SRS histories, and personal coach notes on shared static infrastructure. **Additive-only conflict rule:** changes for one learner never remove, reorder, or degrade content relied on by the other.

> **New session?** Read [`HANDOVER.md`](HANDOVER.md) first for current architecture and live state, [`MASTER_PLAN.md`](MASTER_PLAN.md) for the 4-stage syllabus and Preply protocol, and [`CURRICULUM.md`](CURRICULUM.md) before changing milestone/level rules.

---

## 1. The Headmaster Charter — Role, Objective & Creative Mandate

- **Supreme Objective:** Any AI running or maintaining this site has one clear mission: **get Reza fluent in conversational Arabic (MSA) and get him to understand the Qur'ān as it is recited (by ear).**
- **Your Role — Headmaster, Primary Teacher, Motivator & Mentor:**
  - You are **Reza's Headmaster, Primary Teacher, Motivator, and Mentor** — personally responsible for his Arabic education.
  - Other teachers may participate (e.g., his Sunday 07:00 UK Preply conversation tutor or ChatGPT/Claude voice sparring partners), **but you are the Headmaster and control the curriculum completely.** External lessons are supplementary spoken inputs absorbed into your syllabus; never rely on another tutor to teach grammar foundations, sequence vocabulary, or close gaps.
- **Who Your Student Is (Designing for Consistency):**
  - Reza has a **young family** and a **demanding senior investment job**, and **struggles to be consistent** when work and family demands peak.
  - Act as a warm, steady **Mentor & Motivator**: keep friction near zero, never penalize or guilt-trip missed days, cushion re-entry (`comeback` / `light` batches), provide a 13-min hands-free commute mode when screen time is impossible, and celebrate genuine, data-backed progress.
- **Primary Teaching Vehicle — `Practice` Sessions (`index.html` + `audio.html?commute=1`):**
  - **`⚡ Practice` (`index.html` Home on screen + `audio.html?commute=1` on commutes, driven by `js/practice.js`) is your primary classroom.** Every other tab links dynamically into `index.html` (`?chap=`, `?surah=`, `?lc=`, `?set=`, `?grammar=`, `?class=`, `?focus=words`, `?filter=`, `?keys=`), and direct reviews/tests on any standalone tab (`words.html`, `sentences.html`, `chapters.html`, `quran.html`, `sets.html`, `grammar.html`, `class.html`) feed the exact same **Earned Mastery Dots (`⚪ / 🔴 / 🟡 / 🟢`)** across the entire site.
- **Mandate for Creativity:**
  - **Allow yourself to be creative in achieving this objective.** Proactively invent sharper visual **Lesson Cards** (`sets.html` + `data/lesson-cards.json`), English/Bengali/Qur'ānic memory hooks, contrast drills, commute audio cues, or motivational nudges whenever telemetry reveals a faster, stickier path to fluency and Qur'ānic comprehension (while upholding honest metrics, Mishary Rashid Alafasy recitation + neural voices, Saba's additive-only rule, and the 16 automated test suites).

---

## 2. Coherent 7-Tab Site Map & Supporting Pages

| Tab / Page | Purpose |
|---|---|
| `index.html` (`⚡ Practice` — Home) | **Unified `Practice` Hub & Dynamic Focus Classroom.** Opens directly into today's adaptive batch (`Batch 1` Daily Core + Weekly Chapter sentences → `Batch 2` / `Batch 3+` review consolidation), `#homeChapStrip` live active-chapter progress bar, `🆕 Teach` & `🚗→📱 Screen Check` modes, inline grammar rules, `📊 Capabilities` ledger, built-in `🗣 Speak Brief`, `🚗 Commute` launcher, and dynamic `?chap= / ?surah= / ?lc= / ?set= / ?grammar= / ?class= / ?focus=words / ?filter= / ?keys=` deep-link sessions. |
| `chapters.html` (`📖 Chapters`) | **10-Chapter Interactive Reader Spread.** `#chapMasteryStrip` live Earned Mastery bar, 10 high-frequency sentences + Chapter Vocabulary (auto-synced with `Practice` line pointer & `🔥 Test Ready` status), 3–5 Qur'ān ayahs by ear (Alafasy), conditional grammar note, 3-rung `🎯` variation drills, dynamic AI Voice Prompt, and 5-min Chapter Mastery Test (`≥ 80%`). |
| `sentences.html` (`💬 Sentences`) | **Master Sentence Library (1,369+ sentences).** `#sentMasteryBar`, source & Earned Dot filters (`🟢 / 🟡 / 🔴 / ⚪`), direct in-table `Review: [All \| 🇬🇧 EN → AR \| 🇸🇦 AR → EN]` tap-to-reveal mode, frozen `📉 Weakest First` sort (`↻ Resort`), search, and 1-tap `⚡ Practise in Practice →`. (`?myday=1` redirects cleanly to `index.html`). |
| `words.html` (`📇 Words`) | **Master Vocabulary Sheet & Quick 10-Word Drill.** Default `📋 All Words` sheet (`#wordsMasteryBar`, Earned Dot filters `🟢 / 🟡 / 🔴 / ⚪`, direct `Review: [All \| 🇬🇧 EN → AR \| 🇸🇦 AR → EN]` mode, frozen `📉 Weakest First` sort) + 1-tap toggle to `⚡ Quick 10-Word Drill`, Learner Dossier export, and `⚡ Practise Words in Practice →`. |
| `quran.html` (`🕌 Qur'ān`) | **Qur'ān by Ear.** Surah Grid with live Surah Earned Dot & `X/Y ayahs · A/B words` counters, Ayah-by-Ayah Mishary Rashid Alafasy recitation + Earned Dots, word-by-word human clips + Earned Dots, Cold Listen (`≥ 85%`) & meaning tests, and `⚡ Practise Surah in Practice →`. |
| `sets.html` (`🗂 Sets`) | **Visual Lesson Cards, Thematic Sets & Grammar Shelf.** Top shelf houses visual **Lesson Cards** (`#lc-<id>`) with Earned Mastery Dots & SRS bars, followed by thematic everyday sets (live `X/Y` green counts) and the 22-pattern Grammar shelf. |
| `class.html` (`🧑‍🏫 Teacher`) | **Teacher Hub, AI Voice Brief & Master Plan.** Daily-updating **20-minute Preply Teacher Brief** (`#teacherBrief`, copyable in EN / AR / Both), **collapsed-by-default Live AI Practice Session Brief** (`#aiPracticeBriefCard`), **Live Progress & Coming Weeks Master Plan** (`#masterPlanSection`), Preply chat paste box, and captured Sunday lesson archive + untimed mastery tests (`≥ 80%`). |
| `audio.html?commute=1` | **Hands-Free Commute `Practice`.** ~13-min eyes-free session (proven script → pure-English Lesson Card Golden Rule → active Chapter & `myday` sentences → Alafasy Qur'ān by ear → due/weekly vocab), live `✓ / ≈ / ✗` & lock-screen `⏭ / ⏮` grading, crash-safe `ats-commute-live` recovery. |
| `grammar.html` · `more.html` | **Grammar Spine** (22 patterns with Earned Dots & 1-min typed checks grading `gt:*`) and **Cloud Sync, Diagnostics & Backup**. |

---

## 3. Earned Mastery Dots (`⚪ / 🔴 / 🟡 / 🟢`) & SRS Namespaces

Every item practised or tested across the site carries a **read-only Earned Mastery Dot** (`js/srs.js` — 100% live client-side FSRS math) paired with calm neutral monochrome `✗ · ≈ · ✓` self-report buttons:
- `⚪` **Grey (`Unseen`):** Not practised or tested yet.
- `🔴` **Red (`Needs work`):** Missed recently (`g === "no"` or `box === 0` after exposure).
- `🟡` **Amber (`Building`):** 1st-day pass (`box === 1`), hesitant (`g === "maybe"`), or overdue recall `< 85%`.
- `🟢` **Green (`Mastered`):** Proven cleanly across **2+ separate days** (`box >= 2`, `g !== "maybe"`, `R >= 0.85`) or `⊘` retired.

Synced via `js/tracker.js` (`_mergeRemoteState` safe merge) to Cloudflare Worker `https://arabic-sync.rkarim88.workers.dev` (KV namespace `9532d5717021486a92f75efb6d7b8a94`), with universal cross-key union in `data/aliases.json` (`615` groups / `2,219` keys generated by `scripts/gen-aliases.js`):
- `chap:<num>:<i>` — Weekly Chapter sentences (`data/chapters.json`).
- `cls:<classId>:<i>` — Preply Class sentences (`data/classes.json`).
- `lc:<id>` — Visual Lesson Cards (`data/lesson-cards.json`).
- `ev-<group>:<i>` — Everyday vocabulary clusters (`data/everyday.json`).
- `qc:<i>` — Qur'ān Core top frequency lemmas (`data/quran-core.json`, **append-only**).
- `qw:<surah>:<v>:<w>` / `s:q:<surah>:<ayah>` — Qur'ān word-by-word & ayah units (`data/quran.json`, `data/sentence-bank.json`).
- `fam-<id>:<i>` — Triconsonantal root family words (`data/families.json`).
- `ph-<group>:<i>` — Conversational phrase deck (`data/phrases.json`, **append-only**).
- `story-NN:<i>` — Reading passage vocabulary (`data/story-NN.json`).
- `gt:<patId>:<i>` — Grammar pattern checks (`data/grammar.json`).
- `tw:<norm>` — Tap-to-review words adopted onto canonical keys via `registerWordKeys()` + `data/aliases.json`.
- `ats-capabilities` — Live capability summary written by `Practice.summarizeCapabilities()`.

---

## 4. Content Pipelines & Build Commands

### Sunday Preply Lesson Ingestion
When Reza shares notes/photos from Sunday's live class:
1. Add vocabulary to `data/everyday.json` (`source: "teacher"`, `lesson: "<label>"`).
2. Add ≤7-word sentences to `data/prompts.json` / `data/sentence-bank.json` and reading passage to `data/story-NN.json` (plus `STORY_LIST` in `js/app.js` and `CORE` in `sw.js`).
3. Add any system-level grammar/nuance contrast to `data/lesson-cards.json` (including pure-English `audioCue`).
4. Run generators in order:
   ```powershell
   node scripts/gen-classes.js
   node scripts/gen-curriculum.js
   node scripts/gen-sentences.js
   node scripts/gen-aliases.js
   node scripts/gen-lexicon.js
   python scripts/gen-audio.py
   node scripts/bump-version.js
   ```
5. Read-Modify-Write `coach:rkarim88@gmail.com` in KV (never drop `week` or `homework`).

### Automated Verification (16 Test Suites — All Must Pass)
Run from `arabiclanguage/` before every commit:
- `test-audio-coverage.js` · `test-chapter-drills.js` · `test-curriculum.js` · `test-drill-grade.js` · `test-errors.js` · `test-frames.js` · `test-freetry.js` · `test-lesson-cards.js` · `test-match.js` · `test-practice.js` · `test-progress-model.js` · `test-sentence-diag.js` · `test-sentences.js` · `test-shell.js` · `test-srs.js` · `test-typing.js`
