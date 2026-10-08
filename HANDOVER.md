# Handover — Arabic (rkarim25/arabiclanguage)

**Updated 2026-10-08.** Read this first in any new session. It defines the live site status, today's deployed lesson batch, multi-AI coordination protocols, test suite audit results, and deferred operations.

---

## 1. What This Is & The Learners

A private Arabic-learning platform for **Reza Karim** (`rkarim88@gmail.com`) and his wife **Saba Khan** (`sabatarif.15@gmail.com`).
- **Live URL:** `https://rkarim25.github.io/arabiclanguage/`
- **Current Deployed Commit:** `06a954c` (remote `origin/main` clean, cache `v=muvqnvdi`).
- **Primary Goal (Rank 1):** Understand the Qur'an **by ear** as it is recited (Reza has memorized the text; auditory decoding at speed is the barrier; favourite Qari: **Mishary Rashid Alafasy**).
- **Secondary Goal (Rank 2):** Hold practical conversation in Modern Standard Arabic (MSA / الفصحى).
- **Learner Constraint:** Senior investment manager + young family. Low energy at night. Needs 5–10 minute zero-friction, decision-free sittings.
- **Weekly Schedule:** Preply teacher **every Sunday 07:00 UK** (*Al-Arabiyyah Bayna Yadayk* + Qur'anic Arabic).
- **Conflict Rule:** Requests from one user must never degrade the other. All additions for Saba are **strictly additive**.

---

## 2. Today's Deployed Lesson Batch (27 Sep 2026 — Commit `f13ab73`)

### A. Reading Dialogue (`data/story-08.json`)
- **Title:** "يَوْمُ العَمَلِ وَالعُطْلَةِ" (The Working Day and The Day Off — Bayna Yadayk Unit 1).
- 12 full dialogue sentences with word-by-word gloss arrays (`words`), neural audio, and 5 comprehension questions.

### B. Dedicated Qur'an Section on `class.html`
- **Surahs Covered:** Surah Al-Falaq (113) & Surah An-Nas (114).
- **Real Recitation Audio:** Full verse streaming by **Mishary Rashid Alafasy** (`reciteVerse()`).
- **Word-by-Word Audio:** Interactive chips playing Alafasy word audio (`speakQuranWord()`).

### C. 10 Deep Conceptual Protection Cards
Classical linguistic and contextual breakdowns of core protection concepts:
1. `أَعُوذُ` (The Act of Seeking Refuge — fleeing and clinging to an impregnable sanctuary).
2. `الْفَلَقِ` (The Daybreak / Cleaving — tearing the darkness like morning light).
3. `غَاسِقٍ` (Intense Nightfall — darkness when it gathers and blankets everything).
4. `وَقَبَ` (Penetrating Darkness — when evil enters and settles unseen).
5. `النَّفَّاثَاتِ فِي الْعُقَدِ` (Blowers Upon Knots — hidden malignant influences).
6. `حَاسِدٍ إِذَا حَسَدَ` (The Envier When He Envies — active toxic intent desiring deprivation).
7. `الْوَسْوَاسِ` (The Repetitive Whisperer — quiet, cyclical internal prompting).
8. `الْخَنَّاسِ` (The Slinker — retreating the moment Allah is remembered).
9. `صُدُور` vs `قَلْب` (Chests vs Heart — whisper arrives at the chest; the firm heart repels it).
10. `Falaq vs Nas Contrast` (Falaq seeks refuge in 1 attribute from 4 external evils; Nas seeks refuge in 3 Divine attributes from 1 internal evil).

### D. Lesson Switcher & Practice Modes
- **Lesson Switcher:** `class.html` includes a top selector to switch between lessons (27 Sep, 20 Sep, 30 Aug).
- **Practice Modes:** Available on Vocabulary and Sentences (`[All]`, `[Arabic Prompt]`, `[English Prompt]`) with tap-to-reveal.
- **Weakest-First Sorting:** `[📉 Weakest First]` pill prioritizes struggle items (`1d`/`2d`/test slips).

### E. Vocabulary, Sentences & Audio
- 37 new vocabulary items in `data/everyday.json`.
- 10 new sentence frames in `data/prompts.json` and `data/sentence-bank.json`.
- 4 new curated root families (`ع و ذ`, `ف ل ق`, `ح س د`, `ع ق د`) in `data/families.json`.
- Milestone `ms-class-0927` added in `data/curriculum.json` (11 lessons, 59 items).
- 283 neural audio clips generated (`ar-SA-HamedNeural`, `en-GB-RyanNeural`).
- Cache stamped `v=muk2v7lt` in 18 HTML files and `sw.js`.

---

## 3. Test Suites Audit & Known Status

There are **8 automated test suites** in `scripts/`. Always run them from `arabiclanguage/`:

| Script | Purpose | Status (at `06a954c`) | Notes |
|---|---|---|---|
| `node scripts/test-audio-coverage.js` | Checks all manifest entries resolve to disk | **PASS (exit 0)** | 10,061 entries verified |
| `node scripts/test-curriculum.js` | Validates ladder, 7-min chunking, proof rules | **PASS (exit 0)** | 84 assertions pass |
| `node scripts/test-drill-grade.js` | Answer grading, partial credit, typos | **PASS (exit 0)** | 11 assertions pass |
| `node scripts/test-progress-model.js` | Half-life decay math, conservatism invariants | **PASS (exit 0)** | 24 assertions pass |
| `node scripts/test-sentence-diag.js` | Verb tense/pronoun error diagnosis | **PASS (exit 0)** | 11 assertions pass |
| `node scripts/test-sentences.js` | Sentence bank integrity, grammar patterns | **PASS (exit 0)** | 45 assertions pass |
| `node scripts/test-shell.js` | App integration, homework parts, speed switch | **PASS (exit 0)** | 93 assertions pass |
| `node scripts/test-typing.js` | Transliteration dock, typing acceptance | **PASS (exit 0)** | 52 assertions pass (floor 92%) |

---

## 4. Cloudflare KV, Telemetry & Speak with AI Status

- **`coach:rkarim88@gmail.com` in KV:** Stamped `2026-10-08` and verified active in Cloudflare KV. Acknowledges 294 solid cards milestone, 4 newly deployed memory hooks (أتناول "tuna wallow", فطور "mini-iftar", أعود "return to refuge", صحيفة "pages-root"), and prompts for 5-min listening placement test before Sunday 07:00 UK.
- **Telemetry Verified (08 Oct 2026):** 3,053 logged events; 745 cards in SRS: **294 solid/strong** in Box 3–5 (235 Box 5, 25 Box 4, 34 Box 3 — up from 255!), 381 active learning (338 Box 1, 43 Box 2), 70 Box 0 (need review), 27 retired. Active Reader: Chapter 2 ("Wants & Requests") line 5/10. Qur'an A1 sits at 86%, Conversation at 73%.
- **Speak with AI Enhancements (08 Oct):**
  - Updated `SPEAK_WITH_AI.md` with **Prompt H** (The Breakfast Mnemonic Drill & Routine Mastery) and added Mnemonic Quick-Reference Matrix for AI Voice Partners.
  - Added Speaking Lab (`speaking.html`) to practice table, and equipped `speaking.html` with direct 1-click **📄 Copy Learner Dossier** and **📘 AI Voice Guide** buttons.
  - Updated `LEARNER_CONTEXT.md` Section 1, Section 3.D, and Section 7 with **Prompt 8** and all 6 active mnemonics.
  - Enhanced live dossier exporter in `js/app.js` (`generateLearnerDossierMarkdown`) with all 6 mnemonics and latest telemetry.
  - Updated voice prompt review challenges in `index.html` (`buildChapterAiPrompt`) and `class.html` (`buildClassAiPrompt`) to explicitly cue the AI on the 4 breakfast memory hooks.
  - Verified all prompt builders and 1-click copy buttons across `index.html`, `class.html`, `converse.html`, `words.html`, and `speaking.html`.

### Strict KV Read-Modify-Write Protocol:
When updating `coach:<email>`:
- **Rule:** Rebuilding this payload from scratch and dropping `week` or `homework` orphans student pacing.
- **Workflow:**
  1. Fetch existing payload:
     `npx wrangler kv key get --namespace-id=9532d5717021486a92f75efb6d7b8a94 "coach:rkarim88@gmail.com" --remote > coach.json`
  2. Modify only intended fields (e.g., `updated`, `note`, `focus`, or update `homework`).
  3. Ensure `week` and existing `homework` properties are preserved.
  4. Write back:
     `npx wrangler kv key put --namespace-id=9532d5717021486a92f75efb6d7b8a94 "coach:rkarim88@gmail.com" --path coach.json --remote`

---

## 5. Generator Pipeline Execution Sequence

When content is added or modified in `data/*.json` or `data/story-*.json`, execute the build pipeline in this exact order:

```bash
# 1. Compile class view from metadata
node scripts/gen-classes.js

# 2. Recompile curriculum milestone ladder
node scripts/gen-curriculum.js

# 3. Compile sentence bank & cross-references
node scripts/gen-sentences.js

# 4. Rebuild dictionary / lexicon lookup
node scripts/gen-lexicon.js

# 5. Generate neural audio clips for new text
# Note: On Windows PowerShell, ensure UTF-8 encoding: $env:PYTHONIOENCODING="utf-8"
python scripts/gen-audio.py

# 6. Run all test suites
node scripts/test-curriculum.js
node scripts/test-sentences.js
node scripts/test-shell.js
node scripts/test-audio-coverage.js

# 7. Bump cache version (?v= tokens and sw.js)
node scripts/bump-version.js
```

---

## 6. Universal AI Guidelines & Non-Negotiables

Any AI agent (Codex, Antigravity, Claude, ChatGPT) working on this system must observe:
- **Honesty over flattery:** Every metric quoted to Reza must be computed from his real log or SRS. Never invent numbers.
- **His time is the scarce resource:** Keep direct summaries under 10 lines, followed by a direct question.
- **Never leave the site broken:** Repairs always ship immediately.
- **Favourite Qari & Audio Standard:** Qur'an audio strictly uses **Mishary Rashid Alafasy** (never robotic TTS). Everyday phrases use pre-generated natural neural voice (`ar-SA-HamedNeural`, `en-GB-RyanNeural`).
- **Book-Like Layout & Practice Modes:** Clean reading spreads with left-margin docked symbol badges, responsive horizontal rows, Practice Mode (`All`, `Arabic Prompt`, `English Prompt`), and `📉 Weakest First` sort.
- **Untimed Mastery Tests:** Sunday Preply tests test comprehension and vocabulary comprehensively without an artificial countdown clock ($\ge 80\%$ confirms mastery).
- **Mobile Lock Screen & Audio Playlists:** Mobile web browsers aggressively throttle `setTimeout` timers when the device screen is locked in a pocket. All inter-sentence and Arabic-English recall pauses use `playAudioGap(sec)` silent audio playback (`audio/ui/gap1.wav`, `gap2.wav`, etc.) so the audio engine remains active. Lock screen controls (`nexttrack`, `previoustrack`, `seekforward`, `seekbackward`, `play`, `pause`) are wired through `setAppMediaSession` with tokenized cancellation (`_audioToken++`) to prevent race conditions or overlapping audio.

