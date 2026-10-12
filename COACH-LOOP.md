# The coach loop — what the site learns from Reza, and what it does with it

*Audit written 12 Oct 2026 at Reza's request: "go through the site and think through whether the site is missing anything in terms of the process in the background of the site learning from my use and carefully designing content for me."*

The honest frame for this audit: a coach has to **see** (collect evidence), **judge** (turn it into a model of the learner), **act** (change what he meets next), and **check** (notice whether that worked). Below is what the site does at each step today, what is missing, and what I'd build next, in order.

---

## 1. What the site already does

### See — evidence it collects (all in the synced event log, `ats-log`)
| Signal | Events | Used by |
|---|---|---|
| Every verdict on a word or sentence (✗ ≈ ✓ ★) | `vocab-rate`, `sentence-rate`, `bucket` (+ `g`, `s`, `box`) | scheduler (js/srs.js), Free try, counts |
| Every typed answer, right or wrong, with what he typed | `sheet`, `fill`, `drill`, `sent-drill {typed, tier}` | grading only |
| Every spoken answer with the transcript the mic heard | `prompt {heard, score}`, `sent-drill {heard, score}` | speaking line (proven items), Free try level |
| Test items with the distractor he picked | `test-item`, `chap-test`, `preply-test`, `gtest-done` | nightly gap hunt, grammar profile (gtest) |
| Listening checks and the ear-certified words | `alisten-grade`, `qlisten-test`, `ptest-listen` | progress model (listening line) |
| What he taps for meaning, and taps repeatedly | `wtap`, `tapseed`, `tap-learn` | review deck seeding |
| Time on each page, the plan blocks he finishes or abandons | `time`, `plan-done`, `plan-block-done`, `plan-bank` | plan adherence, friction |
| His own words — pen notes with page context and photos | `note {text, ctx, imgs}` | the nightly coach and me |
| Free try sessions: level, mix, grammar focus, candidates | `tryit-free` | tuning the engine |

### Judge — models it maintains
- **Word knowledge**: stability + difficulty per card, recall-right-now, a two-day proof before "solid" (js/srs.js).
- **Ability** θ and **structural difficulty** per sentence; **grammar profile** per frame from his passes, misses and grammar tests (js/freetry.js, js/frames.js).
- **Progress forecast**: listening and speaking lines with conservative extrapolation, recalibrated by placement tests (js/progress-model.js).
- **Curriculum state**: milestone readiness, CEFR-ish proof rules, the next most valuable lesson (js/curriculum.js).
- **Homework contract** readiness from the teacher's last lesson (js/plan.js).

### Act — what changes for him
- The scheduler sets every interval; batches balance due / new; Redo re-orders by weakness.
- Free try chooses sentences at ~75% expected success, one new word at most, aimed at the weakest grammar frame, reviews due words inside sentences, homework words first.
- The day plan builds three blocks by marginal value and schedules backwards from the lesson.
- The nightly coach reads pen notes, fixes breakage, adds targeted content (mnemonics for his slips, drills, lesson captures), writes the coach note, and emails at most weekly.
- Lesson capture turns her photos into clusters, prompts, a reading, grammar patterns, a test and a contract within a day.

### Check — feedback loops that exist
- Placement tests recalibrate the forecast (8× weight).
- The homework readiness % and "Fully ready" verdict before each Sunday.
- The nightly journal's `next:` line and the profile's dated observations.

---

## 2. What is missing (ranked by how much it would speed him up)

### A. The error ledger — his misses are recorded but never mined
The site stores every wrong typed answer (`typed` vs model) and every mis-heard transcript, and does nothing with them. That is the richest diagnostic signal he produces. A nightly pass should classify each miss:
- **spelling / orthography** — hamza seat (أ إ آ ء), tāʾ marbūṭa vs hāʾ, alif maqṣūra, doubled letters, dropped sukūn;
- **morphology** — wrong person ending, wrong tense prefix, missing ـتُ, wrong plural;
- **lexical** — a different word altogether (confusion pair: أَعُودُ / أَعُوذُ);
- **phonology (mic)** — consonants the recogniser keeps missing (ع→أ, ح→ه, ق→ك, emphatic ص/ض/ط/ظ).
Then: a **confusion-pair deck** (two words he mixes up, drilled side by side), minimal-pair ear rounds for the phonemes, and a spelling note on the word card. Nothing he does today addresses *why* a word keeps failing.

### B. Generated sentences, not only selected ones
Free try *selects* from ~1,300 verified sentences. He asked for an engine that *builds*. The safe way to build is **slot frames with vetted fillers**: a hand-verified frame (أُرِيدُ أَنْ ___، عِنْدِي ___ فِي ___، ذَهَبْتُ إِلَى ___) plus filler lists that carry gender and case so agreement cannot go wrong. data/sentences.json already does this for verbs (I/we/they × tenses); it needs noun slots too, and Free try should draw from the generated set when the bank runs thin at his level. Every generated sentence must still pass the tagger and the ≤7-word rule.

### C. The teacher never hears what the site knows
The loop is one-way: her lesson → the site. The site now knows his weakest frame, his confusion pairs, the words that are due, and what he passed in free tries. A one-click **"Tell your teacher" brief** on the Lessons page (five lines she can read in 30 seconds: ask me about X, I keep missing Y, drill Z aloud) would close the loop and make the Sunday hour aim at the same target as the week.

### D. Listening is the first goal but Free try is text and speech only
"Understand the Qur'an by ear" is goal #1, yet Try it prompts in English and grades Arabic. A **hear-first mode** — play the Arabic (Alafasy for an ayah, the neural voice otherwise), he gives the meaning or repeats it — turns every sentence into an ear test and feeds the listening line with proven items, not self-reports.

### E. Evidence lives in four key spaces for one word
A word can be `ev-…`, `qc:…`, `story-NN:…`, a raw-Arabic chapter key, or `tw:…`. Free try takes the best twin, but the scheduler schedules each twin separately and the counts double. A nightly **knowledge merge** (keep the strongest card per word, alias the others) would make every number honest and every review land once.

### F. Time-of-day and fatigue are visible but unused
His evenings are "just build" sessions; his real bursts are mornings and weekends. The log has the timestamps. The plan should learn his good hours and offer lighter blocks (listen, review) after 20:00 and the heavy ones (Free try, speaking) when he actually does them.

### G. Chapter sentences carry grammar now, but the chapter *drills* don't
The 🎯 variations in data/chapter-drills.json are hand-written per sentence; they are not labelled with the frame each rung exercises (swap-a-word = lexical, change-who = who-acts / questions, build-on-it = connectors / idafa). Labelling the rungs makes a drill pass count as grammar evidence too.

### H. The forecast is refit by hand
progress-model constants are refit "quarterly" by a human. The nightly could run the refit script, compare the fit error, and only propose a change when the current constants are off by a margin.

### I. Nothing measures whether a change helped
Every content move is logged in the journal, but no run asks "did the mnemonic for أَتَنَاوَلُ reduce its lapses?" A tiny **intervention ledger** (what was added, for which key, when) joined to that key's later verdicts would let the nightly keep what works and stop doing what doesn't.

---

## 3. What I would build next, in order
1. **Error ledger + confusion pairs** (A) — highest signal already collected, zero cost to him.
2. **Hear-first Try it** (D) — directly serves goal #1 and feeds the listening line with proof.
3. **Tell-your-teacher brief** (C) — one page, closes the loop with the person he pays for.
4. **Slot-frame generation** (B) — the "builds sentences" he asked for, kept verifiable.
5. **Knowledge merge across key spaces** (E) — makes every count honest.
6. Fatigue-aware plan (F), rung frame labels (G), automatic refit (H), intervention ledger (I).

Each is additive, testable, and leaves Saba's experience untouched.

---

## Status — 12 Oct 2026, evening ("fix it all")

| Gap | State | Where |
|---|---|---|
| A. error ledger | **built** — every Try it miss classified at the moment it happens (spelling / morphology / lexical / phonology / missing / order), shown as one phrase, carried on the event; `Errors.ledger` mines confusion pairs and slipping sounds | js/errors.js, js/tryit.js, index.html, scripts/test-errors.js |
| B. built sentences | **built** — 14 vetted slot frames × case-marked fillers → 146 sentences in the bank (src gen); the lexical gate decides when he is ready for each | data/slot-frames.json, scripts/gen-slots.js, gen-sentences.js |
| C. teacher brief | **built** — five lines on the Lessons page (ask me about, I keep mixing up, drill aloud, my weak grammar, the budget), copyable, logged as teacher-brief | class.html renderTeacherBrief |
| D. hear-first | **built** — 🎧 Hear it first on every Try it card, 🎧 By ear round on the Sentences page; verdicts are listening evidence (alisten-grade) | js/tryit.js ear / earGrade |
| E. knowledge merge | **built** — data/aliases.json (475 groups, 1,929 keys, 31 duplicated sentences); a verdict reaches every key, counts see one, existing twins adopted on load | scripts/gen-aliases.js, js/srs.js, js/app.js |
| F. time of day | **built (first step)** — the door names his best hour from 30 days of passes; the 20:00 rule and the heavy-day easing stay | js/plan.js planBestHour |
| G. rung labels | **built** — a rung try logs the frames its own target exercises; the grammar profile uses them | js/tryit.js, index.html, js/freetry.js |
| H. auto refit | **built (propose-only)** — scripts/refit-progress.js scores CAL against a grid on his re-encounters; the nightly runs it monthly and proposes, never writes | scripts/refit-progress.js |
| I. intervention ledger | **built** — data/interventions.json + scripts/intervention-check.js (miss rate before/after per key); the nightly appends and checks weekly | data/interventions.json |

Chapter drills now exist for chapters 1–10 (300 rung lines). The audio cache keeps its newest 3,000 clips. Still open: the slot frames are 14 — add one only with fillers you are sure of.
