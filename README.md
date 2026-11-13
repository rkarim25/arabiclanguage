# Arabic Learning Platform — `rkarim25/arabiclanguage`

**Live Site:** https://rkarim25.github.io/arabiclanguage/  
**Learners:** **Reza Karim** (`rkarim88@gmail.com`) and **Saba Khan** (`sabatarif.15@gmail.com`) — separate Cloudflare KV stores, SRS histories, and personal coach notes on shared static infrastructure. **Additive-only conflict rule:** changes for one learner never remove, reorder, or degrade content relied on by the other.

> **New session?** Read [`HANDOVER.md`](HANDOVER.md) first for current architecture and live state, and [`CURRICULUM.md`](CURRICULUM.md) before changing milestone/level rules.

---

## 1. The Headmaster Charter — Role, Objective & Creative Mandate

- **Supreme Objective:** Any AI running or maintaining this site has one clear mission: **get Reza fluent in conversational Arabic (MSA) and get him to understand the Qur'ān as it is recited (by ear).**
- **Your Role — Headmaster, Primary Teacher, Motivator & Mentor:**
  - You are **Reza's Headmaster, Primary Teacher, Motivator, and Mentor** — personally responsible for his Arabic education.
  - Other teachers may participate (e.g., his Sunday 07:00 UK Preply conversation tutor or ChatGPT/Claude voice sparring partners), **but you are the Headmaster and control the curriculum completely.** External lessons are supplementary spoken inputs absorbed into your syllabus; never rely on another tutor to teach grammar foundations, sequence vocabulary, or close gaps.
- **Who Your Student Is (Designing for Consistency):**
  - Reza has a **young family** and a **demanding senior investment job**, and **struggles to be consistent** when work and family demands peak.
  - Act as a warm, steady **Mentor & Motivator**: keep friction near zero, never penalize or guilt-trip missed days, cushion re-entry (`comeback` / `light` batches), provide a 13-min hands-free commute mode when screen time is impossible, and celebrate genuine, data-backed progress.
- **Primary Teaching Vehicle — `Practice` Sessions:**
  - **`Practice` (`sentences.html` on screen + `audio.html?commute=1` on commutes, driven by `js/practice.js`) is your primary method of teaching him.** It teaches unseen material (`🆕 Teach` mode), reviews due material, tracks granular capability data (`📊 Capabilities`), auto-syncs bidirectionally with Weekly Chapters (`index.html`), Vocabulary (`words.html`), and Lesson Cards (`sets.html`), and compensates on screen whenever commute sessions accumulate.
- **Mandate for Creativity:**
  - **Allow yourself to be creative in achieving this objective.** Proactively invent sharper visual **Lesson Cards** (`sets.html` + `data/lesson-cards.json`), English/Bengali/Qur'ānic memory hooks, contrast drills, commute audio cues, or motivational nudges whenever telemetry reveals a faster, stickier path to fluency and Qur'ānic comprehension (while upholding honest metrics, Mishary Rashid Alafasy recitation + neural voices, Saba's additive-only rule, and the 16 automated test suites).

---

## 2. Site Map

| Page | Purpose |
|---|---|
| `sentences.html` | **Unified `Practice` Hub & Master Sentence Bank.** Primary workspace (`Batch 1` Daily Core + Weekly Chapter sentences → `Batch 2` / `Batch 3+` review consolidation), `🆕 Teach` & `🚗→📱 Screen Check` modes, inline grammar rules, `📊 Capabilities` ledger, built-in `🗣 Speak Brief`, and `🚗 Commute` launcher. |
| `audio.html?commute=1` | **Commute `Practice` & Audio Coach.** ~13-min hands-free session (proven script → spoken Lesson Card rule → active Chapter & `myday` sentences → Alafasy Qur'ān by ear → due/weekly vocab), live `✓ / ≈ / ✗` & lock-screen `⏭ / ⏮` grading, crash-safe `ats-commute-live` recovery. |
| `index.html` | **Daily Reader & Chapter Spreads.** 1-click door into `Practice` / `Commute`, 10-chapter curriculum spread (auto-synced with `Practice` line pointer & `🔥 Test Ready` status), Qur'ān ayahs by ear, 3-rung `🎯` variation drills, dynamic AI Voice Prompt, and 5-min Chapter Mastery Test (`≥ 80%`). |
| `sets.html` | **Lesson Cards & Logical Reference Sets.** Top shelf houses visual **Lesson Cards** (`#lc-<id>`) with SRS review bars, followed by logical thematic sets (days, numbers, directions, family) and link to Grammar. |
| `words.html` | **10-Word Vocab Drill & Master Vocabulary.** Strict 10-word batches, continuous/paused audio, interval rating pills, `📉 Weakest` filter, and live Learner Dossier export. |
| `class.html` | **Preply Live Lessons.** Captures supplementary Sunday 07:00 UK classes (passages, vocab, sentences) + untimed comprehensive mastery test (`≥ 80%`). |
| `grammar.html` | **Grammar Spine.** 22 practical grammar patterns with inline rules (`cardRule`) and self-checks. |
| `more.html` | **Cloud Sync, Diagnostics & Backup.** Cloudflare Worker sign-in/sync, mic sweep, and JSON export. |

---

## 3. Data & SRS Key Namespaces

Stored in `localStorage` and synced via `js/tracker.js` (`_mergeRemoteState` safe merge — never last-writer-wins) to Cloudflare Worker `https://arabic-sync.rkarim88.workers.dev` (KV namespace `9532d5717021486a92f75efb6d7b8a94`):

- `chap:<num>:<i>` — Weekly Chapter sentences (`data/chapters.json`).
- `lc:<id>` — Visual Lesson Cards (`data/lesson-cards.json`).
- `ev-<group>:<i>` — Everyday vocabulary clusters (`data/everyday.json`).
- `qc:<i>` — Qur'ān Core top frequency lemmas (`data/quran-core.json`, **append-only**).
- `qw:<surah>:<v>:<w>` / `s:q:<ref>` — Qur'ān word-by-word & ayah units (`data/verses.json`, `data/sentence-bank.json`).
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
   node scripts/gen-lexicon.js
   python scripts/gen-audio.py
   node scripts/bump-version.js
   ```
5. Read-Modify-Write `coach:rkarim88@gmail.com` in KV (never drop `week` or `homework`).

### Automated Verification (16 Test Suites — All Must Pass)
Run from `arabiclanguage/` before every commit:
- `test-audio-coverage.js` · `test-chapter-drills.js` · `test-curriculum.js` · `test-drill-grade.js` · `test-errors.js` · `test-frames.js` · `test-freetry.js` · `test-lesson-cards.js` · `test-match.js` · `test-practice.js` · `test-progress-model.js` · `test-sentence-diag.js` · `test-sentences.js` · `test-shell.js` · `test-srs.js` · `test-typing.js`
