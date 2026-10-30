# Handover — Arabic (rkarim25/arabiclanguage)

**Updated 2026-10-28.** Read this first in any new session. It defines the live site status, latest deployed lesson batch, multi-AI coordination protocols, test suite audit results, and current learner state.

---

## 1. What This Is & The Learners

A private Arabic-learning platform for **Reza Karim** (`rkarim88@gmail.com`) and his wife **Saba Khan** (`sabatarif.15@gmail.com`).
- **Live URL:** `https://rkarim25.github.io/arabiclanguage/`
- **Current Deployed Commit:** `5b073f6a` (live cache stamp `v=mvrhgjo7`). All 18 HTML pages verified 200 OK.
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
| `node scripts/test-typing.js` | Transliteration dock, typing acceptance | **PASS (exit 0)** | 52 assertions pass (99.0%, floor 96%) |

---

## 4. Cloudflare KV, Telemetry & Speak with AI Status

- **`coach:rkarim88@gmail.com` in KV & Data Snapshots:** Stamped `2026-10-29`. Sunday 25 Oct 07:00 UK Preply class passed; photo/notes dump pending; next class is Sunday 1 Nov 07:00 UK.
- **Telemetry Verified (29 Oct 2026):** 3,463 logged events; 1,185 cards in SRS: **517 solid/strong** in Box 3–5 (444 Box 5, 25 Box 4, 48 Box 3; plus 104 retired mastered), 429 active learning (377 Box 1, 52 Box 2), 135 Box 0 (need review). Passed Chapter 1 & 2 tests at 100% (5/5). Sunday 27 Sep exam `ms-class-0927-l1` sat at 78% (7/9, ear section 100%). Curriculum standings: 🎧 Qur'an by ear 67% (13 weekly exams sat, 73% last 2 exam avg; Al-Fatiha ear certification lapsed past 45 days, ready for refresh; salah coverage 15.7%), 🗣 Conversation 78% (87 min spoken out loud, 9/26 cards solid, 73% last 2 exam avg).
- **Commute Re-Entrancy & Sequencer Fix (26–28 Oct):**
  - Resolved Reza's 26 Oct ✏️ pen note (*"Tried the commute session and it was all over the place. Would say something and then jump to show another. Won't give time etc. check the whole thing"*): three overlapping sequencers ran from rapid taps while words fetched.
  - Deployed re-entrancy guard, button darkening on initial tap, single loop ownership, verified in browser and covered by 3 `test-shell` assertions.
- **Speak with AI Enhancements (29 Oct):**
  - Added **Prompt Y** to `SPEAK_WITH_AI.md` (Thursday & Friday Pre-Weekend Spoken Workout & Rehearsal for 29–30 Oct).
  - Added **Prompt 25** to `LEARNER_CONTEXT.md` with Thursday & Friday 29–30 Oct drill parameters and full diagnostic slip coverage (`هَلْ يُمْكِنُكَ مُسَاعَدَتِي؟` with Bengali *mumkin* + AID hook, `تَفَضَّلْ، هَذَا مَالُكَ` with *Bayt al-Māl* wealth hook, `أَنَا عَطْشَانُ، أُرِيدُ شَايًا`, `أَحْتَاجُ إِلَى هَذَا الكِتَابِ`, `خُذْنِي إِلَى الفُنْدُقِ مِنْ فَضْلِكَ.`, `المَسَاءُ لِلْعَائِلَةِ` with attached `لِـ / لِلْ`, days of week `يَوْمُ الخَمِيسِ`, `يَوْمُ الجُمُعَةِ`, and weather `الجَوُّ بَارِدٌ اليَوْمَ`).
  - Updated prompt generators in `index.html` (`buildChapterAiPrompt`), `class.html` (`buildClassAiPrompt`), and `js/app.js` (`generateLearnerDossierMarkdown`) for 29–30 Oct Thursday/Friday pre-weekend workout.
  - Verified 100% pass across all 14 test suites and clean syntax checks across all JS/JSON files.

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

When content is added or modified in `data/*.json` or `data/story-*.json`, run the build pipeline in this order (the ONE order — the nightly SKILL.md and the run-arabic-coach skill say the same; 12 Oct):

```bash
node scripts/gen-frames.js      # grammar frames on chapters/prompts/stories (+ regenerates index.html CHAPTERS from chapters.json)
node scripts/gen-slots.js       # built sentences from data/slot-frames.json (vetted frames × case-marked fillers)
node scripts/gen-sentences.js   # the sentence bank (folds the built sentences in)
node scripts/gen-aliases.js     # one word, one card — data/aliases.json
node scripts/gen-curriculum.js  # the milestone ladder (gen-classes reads curriculum.json — so this comes first)
node scripts/gen-classes.js     # the class repository
node scripts/gen-lexicon.js     # the dictionary
PYTHONUTF8=1 python scripts/gen-audio.py   # neural clips for new text (PYTHONUTF8=1: the cp1252 console crashes otherwise)

# then: every suite (14 suites: test-srs, test-freetry, test-frames, test-match, test-errors, test-audio-coverage, test-curriculum, test-drill-grade, test-progress-model, test-sentence-diag, test-sentences, test-shell, test-typing, test-chapter-drills) and every page's inline script must parse
for t in srs freetry frames match errors audio-coverage curriculum drill-grade progress-model sentence-diag sentences shell typing chapter-drills; do node scripts/test-$t.js; done

# then the cache stamp
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

## 5. Session Update — 26 Oct 2026 (Monday Run)

- **Live URL & Cache Stamp:** `https://rkarim25.github.io/arabiclanguage/` stamped `v=mvpkw2mb`.
- **Health & Test Integrity:** All 8 automated test suites pass 100% (curriculum, progress model, sentences, typing, drill grade, sentence diagnosis, shell integration, audio coverage with 11,090 manifest entries).
- **Progress & Telemetry:**
  - 1,176 cards in SRS (548 Box 5, 25 Box 4, 48 Box 3 = 621 strong/solid; 373 Box 1, 52 Box 2; 130 Box 0).
  - Qur'an understanding (Salah listening): **13.5%** (honest decay model).
  - Practical Conversation deployable: **0.7%**.
  - Slips & struggles identified: `md:23` (*المَسَاءُ لِلْعَائِلَةِ* — "The evening is for the family"), hotel room key slip (*أَحْتَاجُ إِلَى مِفْتَاحِ الغُرْفَةِ*), car key (*أَيْنَ مِفْتَاحُ السَّيَّارَةِ*).
- **Speak with AI & Documentation Refresh:**
  - Added **Prompt VIII** to `SPEAK_WITH_AI.md` (Monday Week-Kickoff Commute & Daily Conversation Drill) and **Prompt 23** to `LEARNER_CONTEXT.md`.
  - Added *المَسَاءُ لِلْعَائِلَةِ* (*al-masāʾu lil-ʿāʾilah*) to the dynamic dossier generator (`js/app.js`), Preply class prompt (`class.html`), mnemonic quick-reference matrix, and active slips ledger.
  - Sunday 25 Oct Preply lesson notes/photos check: pending Reza's snap whenever a minute appears.

## 5b. Session Update — 26 Oct 2026 (evening interactive, 19:00–19:40 UK)

- **Reza was back on the site today** after 13 quiet days: mastery test `ms-class-0927-l1` 78% (7/9, ear section 100%), Say-your-day free try (`md:43` typed perfect), then a commute attempt at 17:12 and a bug note from the car.
- **Bug fixed and live (`2878fec7`, then stamped again below):** his note — "all over the place, would say something and then jump to show another" — was three overlapping sequencers. `start()` in `audio.html` awaited the word fetch for seconds while both start buttons stayed live, so each extra tap spawned another loop on the one shared `S` (log: commute-start, alisten-start, commute-start 30 ms apart; 13 Oct had two). Now: `_starting` re-entrancy guard, both buttons disabled on the first tap, each loop owns its session (`const me = S`). Three assertions pinned in `scripts/test-shell.js`. Verified in a browser: four rapid taps → one `commute-start`; stop → restart clean.
- **He chose "Just build" at the ask**, so the لِـ / لِلْ lesson landed on the site instead of in chat: new pattern `lam-li` in `data/grammar.json` (after `prep-pron`), the frame in `js/frames.js` (marker: a word opening لل-, in `ORDER` before `prep-pron` — fixes `هُدًى لِّلْمُتَّقِينَ`, which was labelled `tenses`), weight 0.6 + essentials slot in `js/freetry.js`, dossier line in `js/app.js` GRAMMAR_LIST and `LEARNER_CONTEXT.md` §4.6, five Say-your-day sentences `md:54`–`md:58` (الصَّبَاحُ لِلْعَمَلِ · السَّبْتُ لِلْأَوْلَادِ · الأَحَدُ لِدَرْسِ العَرَبِيَّةِ · هَذَا الكِتَابُ لِي · لِمَنْ هَذَا الكِتَابُ؟), nine neural clips generated.
- **Pipeline note:** `gen-audio.py` failed every clip with a 403 from the Bing speech endpoint on edge-tts 7.2.8; `pip install -U edge-tts` (→ 7.3.1) fixed it. If the nightly's audio step starts failing, upgrade first.
- **Lesson check:** Sunday 25 Oct class still uncaptured (asked 25 Oct, 26 Oct, and in tonight's note). No new pen-note images (newest 12 Oct).
- **Live stamp:** `v=mvpojam8`. 14 suites pass, every page parses.

## 6. Session Update — 30 Oct 2026 (Friday Evening Run, 18:20 UK)

- **Live URL & Cache Stamp:** `https://rkarim25.github.io/arabiclanguage/` stamped `v=mvvapzpc`.
- **Health & Test Integrity:** All 14 automated test suites pass 100% (srs, freetry, frames, match, errors, audio coverage with 11,098 manifest entries, curriculum, drill grade, progress model, sentence diagnosis, sentences, shell integration, transliteration typing with 99.0% acceptance, and chapter drills). Syntax check on all JS, JSON, and inline scripts passes cleanly.
- **Progress & Telemetry:**
  - 3,473 total logged events in KV (`data:rkarim88@gmail.com`).
  - 1,185 total cards in SRS: **517 solid/strong** in Box 3–5 (plus 104 retired), 429 active learning (377 Box 1, 52 Box 2), 135 Box 0.
  - Chapter 1 & 2 tests passed at 100% (5/5). Chapter 3 (*Hotels, Taxis & Travel*) is actively in flight (`currentChapId: "chap-3"`).
  - Wednesday 28 Oct session telemetry: `chap:3:1` drill typed perfect (*هَذَا مِفْتَاحُ الغُرْفَةِ*), `أَيْنَ مِفْتَاحُ الغُرْفَةِ؟` rated medium (Box 1), `خُذْنِي إِلَى الفُنْدُقِ مِنْ فَضْلِكَ` rated weak (Box 0).
  - Qur'an understanding (Salah listening by ear): **13.5%** (decay model; Al-Fatiha certification lapsed past 45 days, ready for refresh).
  - Practical Conversation deployable: **0.7%**.
- **Pen Notes & Image Status:**
  - 54 total pen notes reviewed. Newest note from 26 Oct (commute sequencer overlap) was fully resolved and verified in `audio.html`.
  - No new pen notes or uploaded images since (newest image remains `12-Oct`).
- **Sunday Preply Class Status:**
  - Sunday 25 Oct lesson passed without photo dump.
  - Next live Preply class is **Sunday 1 Nov 07:00 UK** (~36 hours away).
- **Speak with AI & Documentation Refresh:**
  - Added **Prompt Z** to `SPEAK_WITH_AI.md` (Saturday & Sunday Weekend Spoken Sprint & Preply Pre-Class Warmup for 31 Oct – 1 Nov 07:00 UK).
  - Added **Prompt 26** to `LEARNER_CONTEXT.md` with full weekend drill parameters, Chapter 3 travel directions (*خُذْنِي إِلَى الفُنْدُقِ مِنْ فَضْلِكَ*), room key requests (*أَيْنَ مِفْتَاحُ الغُرْفَةِ؟*), assistance slips (*هَلْ يُمْكِنُكَ مُسَاعَدَتِي؟*), paying (*تَفَضَّلْ، هَذَا مَالُكَ*), weekend days (*يَوْمُ السَّبْتِ* and *يَوْمُ الأَحَدِ*), village breakfast foods (*قَرْيَة*, *بَيْض*, *تَمْر*, *جَوْز*), and the 4-sentence connected speaking narrative.
  - Updated prompt generators in `index.html` (`buildChapterAiPrompt`), `class.html` (`buildClassAiPrompt`), and `js/app.js` (`generateLearnerDossierMarkdown`).
  - Stamped and deployed `v=mvvapzpc`. All 14 test suites passing 100%.

