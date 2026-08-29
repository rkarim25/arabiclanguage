# The Curriculum — milestones, lessons, chunks and proof

> **Read this before touching `index.html`, `learn.html`, `map.html`, the nav,
> `data/curriculum.json`, `scripts/gen-curriculum.js` or `js/curriculum.js`.**
> It is the design contract. `README.md` says what the site *is*; `TEACHER-SYNC.md`
> says how a live lesson becomes content; this file says how learning is
> **structured, proved and paced**.

Designed with Reza in conversation on 2026-08-29, replacing a date-forecast
dashboard. Every rule below is his, quoted where it matters.

---

## 1. The problem this solves

The site used to lead with a forecast: *"90% of your salah understood — beyond
18 months at your current pace."* Every number was honest, and that was the
problem:

> "the idea of this being a very long term project puts me off"

Two failures. **Nothing ever finished** — a good week barely moved an 18-month
headline, so effort produced no visible completion. And **progress was a date,
not a capability** — "Feb 2027" says nothing about what he can do.

Then the deeper correction, once weeks had been introduced:

> "in language learning itself [weeks] don't have any intrinsic value but the
> milestones are everything. either i know a list of words or not, whether it is
> 3 weeks before or after my plan is a bit irrelevant. so downplay the timeline
> aspect of it and make the entire website milestone based."

So the unit of progress is a **capability**, and time is only an annotation.

---

## 2. The structure

```
  LEVEL          CEFR letter + a can-do line       🎧 Qur'an A2
    ↑ made of
  MILESTONE      a capability, as a can-do line    "you can order food and ask the price"
    ↑ made of
  LESSON         ONE ~7-minute sitting, own test   "Ordering" — 6 items
    ↑ made of
  WORDS + SENTENCES    the raw material
```

**Seven lessons a week, seven minutes each** (his rule): *"each lesson should
always aim to be roughly 7 minute long. there should be 7 lessons per week with 7
tests and one weekly test which tests all those 7 combined but each test shouldnt
take more than 7 minutes either."* So ~49 minutes a week, matching his 50-minute
yardstick. A lesson used to be four 5-minute chunks, which made it 20–40 minutes
and far too big; the passes now happen *inside* the single sitting.

Any authored lesson longer than `lessonItems` (6) is split automatically and
**evenly** — 13 items becomes 5+4+4, never 6+6+1, so no lesson is a stub.

> "Lessons, words and sentences are the bedrock of the learning plan."

**Words and sentences are counted and shown**, because he asked directly:

> "if i do have a vocabulary of a certain number of words and if i can also say a
> certain number of sentences or at least understand it then things should start
> to make sense."

`inventory()` reports words held and sentences held (box ≥ 3), long-term counts
(box ≥ 5) separately, and the next band expressed as **what it buys him** ("at
about 250 words, everyday sentences start holding together") — never as a
percentage of a distant goal. Sentence keys are `ph-*`, `story-NN:*`, `gt:*`,
i.e. whole utterances; everything else counts as a word.

---

## 3. The shape of the site

Eleven top-level tabs became **four**, after:

> "the whole website needs to be much more simplified rather than story based …
> is it possible to simplify it further, where either i just do a standard lesson
> or a commute version … in addition to that there should be a free vocab learn
> and review and free sentence building and review."

| Page | What it is |
|---|---|
| `index.html` | **Home.** Two levels, what you hold, the milestone you're on with its lessons, one **Continue** button, what's coming, achieved. |
| `learn.html` | **The doing.** Runs a chunk, or runs a milestone test. Nothing else. |
| `map.html` | **The long view.** Both goals, each level with its criteria, every milestone under the level it feeds, pace, and the old forecast model behind a disclosure. |
| `more.html` | Everything else: free practice, the engines, sync and backup. |

Rules:

- **One decision on the home page:** Continue. The commute button is the same
  material hands-free, not a rival to it.
- **Exercise types are never a menu.** Stories, grammar, Qur'an, audio and
  speaking are *engines* a chunk runs on. He never picks between them.
- **Free practice sits outside the plan** (vocabulary, sentences) and is always
  available. It doesn't count toward a milestone, but anything it brings to solid
  is still examined — learning counts wherever it happened.
- **No new top-level destination without removing one.** The eleven-tab sprawl
  happened one reasonable-looking addition at a time.
- The site is called **Arabic** (العربية). Stories are one exercise type now, not
  the organising idea.

---

## 4. Proof — the rule that governs everything

> "from here on, everything needs to be proved by test, unless i achieve a 80, i
> cannot claim i know words."

- **A lesson is mastered only by scoring ≥ 80 on its test section.** Solid SRS
  cards master nothing.
- What solid cards *do* earn is **skipping the learning, never the proof**. A
  lesson whose words are ≥ 80% solid is flagged `readyToProve`, and Continue sends
  him straight to its test rather than four chunks he doesn't need.
- **A milestone is achieved when every one of its lessons is proved.**
- **A level is earned when every criterion is met** (§6) and is **never revoked**.
  A lesson may reopen; a level may not. Decay shows up as the next level moving
  further away, not as something taken back.

### Tests must not be repetitive

> "for the tests, design it in a way which doesnt keep repeating what i already
> know. you can keep repeating things in learn mode to keep in my memory or to
> teach me but dont make the tests repetitive unless it tests long term memories"

So `milestoneExam()`:

- **skips a proved lesson entirely** while its pass is still fresh;
- brings it back **only when re-verification is due**, and then as a **spot check**
  (~30% of its items), never a re-sit;
- lengthens the interval with each consecutive pass: **45 → 120 → 300 days**. A
  failed re-check resets the count **and reopens the lesson**.

Learning mode may repeat freely — repetition is how memory is built. The **test**
is where repetition wastes his time.

### Test-out, and the three scopes

The test is **always open, unlimited retakes**, reshuffled per attempt so the paper
can't be memorised. Every answer grades a real SRS card, so testing is also
studying.

There is **one test engine at three scopes** — only the *selection* differs, and
scoring is per lesson at 80 in every case, so clearing a lesson clears it
everywhere:

| Scope | Size | Time |
|---|---|---|
| **One lesson** | its ~6 items, each asked a **second time in a different form** when there is room | **~3 min** |
| **A week** | 21 questions **sampled evenly** across its 7 lessons | **~7 min** |
| **A milestone** | its unproved lessons, sampled the same way | ~7 min |

Two consequences worth keeping:

- **No test runs long.** A week holds ~42 items; asking them all would be fifteen
  minutes. It samples instead — evenly, so every lesson is still represented and
  still scored.
- **A thin score cannot clear a lesson.** Below `CLEAR_MIN` (3) questions a score
  is *reported but not allowed to master* the lesson, and the result screen says
  so. The lesson's own 3-minute test is never sampled and stays the reliable way
  to prove one.

---

## 5. A lesson

One sitting, about seven minutes, and it runs the same way every time:

1. **Meet them** — a table: Arabic, meaning veiled, transliteration. Recall before
   revealing. (His standing preference: tables over flashcards, minimal clicking.)
2. **Work them** — each item once, in rotating forms: recognise the meaning, write
   it from English, catch it by ear. Recognition and production are different
   skills and the lesson exercises both.

**Due reviews ride at the front of every lesson** (`reviewsFor`, 4 by default) and
are never that lesson's own words. This is why review never appears as a chore or
a "73 due" wall.

### Two ways to do any lesson

> "each lesson should have hands free or normal method of doing"

- **Normal** — on screen, as above.
- **🚗 Hands-free** — audio only, no taps: it plays the Arabic, leaves a gap to
  recall, says the English, and goes twice through. It is offered on **every
  lesson row**, not as one global button.

A hands-free pass is honest about what it is: exposure, not proof. It says so on
the finish screen, and the lesson still needs its test.

## 6. Levels

Two tracks, each with its own CEFR level and can-do line — his goals are ranked
and genuinely at different places, so one blended level would hide that.

| Track | id | Goal |
|---|---|---|
| 🎧 Qur'an by ear | `quran` | Understand the Qur'an as it is recited (**ranked first**) |
| 🗣 Conversation | `conv` | Hold a conversation in MSA, including Umrah |

CEFR labels were chosen because his Preply teacher already thinks in them. Each
level lists **criteria** evaluated by `evalCriterion()`; an unknown type **fails
closed**. Types: `earCoverage`, `srsSolid`, `examAvg`, `examCount`, `placement`,
`surahTests`, `outputMinutes`. Adding one means adding a case *and* a row here.

By-ear evidence comes from `ProgressModel.earEvidence`, deliberately reused so
**"certified by ear" has exactly one definition** in the codebase.

---

## 6b. How a week is built

> "the week needs to be split between quranic and everyday language. when i put in
> the class lessons it needs to be baked in as well"

`weekPlan()` keeps a queue per track and **deals a week from both** — 4 Qur'an, 3
everyday. Dealing straight down the ladder had produced whole weeks of one track.
The Qur'an weighting reflects his ranked-first goal without crowding the other out.

**Class material leads.** When he pastes a lesson from his teacher it is added as a
milestone flagged `source: "teacher"`, and `weekPlan()` puts those lessons at the
**front of the very next week**. That is what "baked in" means, and it is what makes
the Sunday→Monday turnaround real.

A week is a **shelf, not a deadline**: he can do its seven lessons in any order,
and nothing is ever late.

---

## 7. Pacing — real, but deliberately quiet

Planning constants: **50 minutes a week** (`planning.minPerWeek`) and ~2.5 active
minutes to bring one item to solid. These size the ladder and give a ruler for
"ahead or behind". **Never shown as a target he must hit** — mastery is the
target, time is the variable.

`pace()` reports weeks ahead/behind **and why**, because the causes deserve
opposite responses:

- **Ahead** → either he already knew the material (lessons proved while the cards
  were never solid → *ask him about re-levelling*) or he is simply fast.
- **Behind** → either the time isn't there (weekly minutes well under plan → *it's
  time, not difficulty*) or he is putting the minutes in and still struggling
  (*the material is too hard; slow the steps down*).

The pace line is one sentence, under the capability, never the headline.

**The clock starts when the ladder does.** `pace()` measures from his first
`chunk-done`/`exam-done`, not from his first-ever logged event — measuring from the
latter reported *"6.1 weeks behind"* before he had done a single lesson, which he
rightly called pointless. Before he starts, `pace()` returns `notStarted` and the UI
shows nothing at all; for the first week it returns `tooEarly`. **Never show a pace
figure for a plan that has not begun.**

---

## 8. Authoring the ladder

`data/curriculum.json` is **generated** — edit `scripts/gen-curriculum.js` and
re-run it; never hand-edit the JSON. The spec there is hand-authored (can-do
sentences and ordering are editorial judgments); the **keys resolve from the real
content files**, so renaming or extending a phrase set cannot leave a milestone
pointing at keys that don't exist.

Currently **20 milestones, 128 lessons, 653 items** — about 19 weeks of runway,
the two tracks interleaved so both advance. The repair kit ("keeping a
conversation alive") comes early on purpose: without it, one unknown word ends the
conversation.

Every milestone must be justifiable in one sentence *to him* — the `why` field is
not decoration.

### Outstanding content job: sentences

The lesson's "work them" pass uses the item itself. That is right for the phrase deck and
story sentences (real, verified, already voiced). Lessons built from single words
(Qur'an vocabulary, everyday clusters) therefore say the **word** aloud rather
than a sentence containing it. He agreed to *"curated where they exist, written
where they don't"* — **the written half is not done**. Authoring one verified
sentence per word-lesson, built from that lesson's own words, is the next content
task.

---

## 9. Data contracts

### Log events (history lives here, and only here)

| Event | Payload | When |
|---|---|---|
| `chunk-done` | `{chunk, lesson, milestone, mode, right, total}` | a chunk completed |
| `exam-start` | `{milestone, total, attempt}` | a test begun |
| `exam-done` | `{milestone, attempt, score, correct, total, lessons:{id:score}, sections:{ear}}` | a test finished |

> **⚠ The cloud payload is `{progress, srs, tapwords, log, savedAt}` — arbitrary
> `store` keys are NOT synced** (see `_payload()` in `js/tracker.js`). Mastery is
> therefore derived by replaying `exam-done`. Do not "improve" this by moving it
> into a localStorage key: it would not sync, and would not survive the device
> loss the sync layer exists to protect against.

### Who writes what

| Thing | Written by | Where |
|---|---|---|
| the ladder | a developer/AI, via the generator | `data/curriculum.json` |
| coach notes | the coach | `coach:<email>` |
| all progress and scores | the learner's device | log events → synced |

---

## 10. Operating it

His class is **Sunday 07:00 UK**. The coach's job:

1. **Capture the lesson** (`TEACHER-SYNC.md`) and turn it into content. His
   question — *"if i paste my class lessons can it be incorporated to be ready
   before my next class?"* — was answered **yes**, so it is a commitment:
   material pasted on Sunday is live **by Monday**.
2. **Slot it into the ladder** — a new milestone, or lessons added to the current
   one. Re-run `gen-curriculum.js`.
3. **Read the pace** and say something true about it in the coach note.
4. **If he is ahead because he already knew the material, ask about re-levelling**
   rather than letting him grind through content he holds.
5. `node scripts/test-curriculum.js <payload.json>` must pass before any deploy.

### Invariants

- Never revoke a **level**. Lessons and milestones may reopen; levels may not.
- Never mark anything mastered without a test score ≥ 80.
- Never re-test a fresh pass; never let a stale one go unchecked.
- Never show a completion date. The horizon is the next milestone.
- **Additive for Saba** — her own account, her own scores. The ladder is shared;
  her progress is hers.
