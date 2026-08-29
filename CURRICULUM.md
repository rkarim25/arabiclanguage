# The Curriculum — weeks, exams and the capability ladder

> **Read this before touching `data/curriculum.json`, `js/curriculum.js`, `week.html`, or the
> `week` object inside `coach:<email>`.** It is the design contract. `README.md` describes what
> the site *is*; `TEACHER-SYNC.md` describes how a live lesson becomes content; this file
> describes how learning is **scoped, tested and scored over time**.

Introduced 2026-08-29 at Reza's request, replacing a date-forecast headline.

---

## 1. The problem this solves

The site used to lead with a forecast: *"90% of your salah understood — beyond 18 months at your
current pace."* Every number in it was honest, and that was the problem. Reza's own words:

> "the idea of this being a very long term project puts me off … rather than saying that i achieve
> my goal by a certain date, what we could do is use the weekly goals to set up some milestones
> where tests are set … similar to standard arabic levels like A, B, C … it will be for you to
> cleverly set weekly goals and adjust it to get me to master arabic keeping in mind my goals."

Two failures in the old design:

1. **No unit ever finished.** A good week barely moved an 18-month headline, so effort produced no
   visible completion. Nothing could be *won*.
2. **Progress was a date, not a capability.** "Feb 2027" says nothing about what he can do. A
   learner cannot picture it, cannot tell his teacher about it, and cannot feel it arrive.

The fix is not to make the numbers rosier. It is to **change the unit of progress**:

| | Old | New |
|---|---|---|
| Headline | a date | a capability ("you can now…") |
| Unit | the whole goal | one week |
| Feedback | a curve that sags | a score out of 100 |
| Horizon shown | 18 months | the **next level only** |

The long-range engine (`js/progress-model.js`) is **not** deleted. It still runs, it still
computes honestly, and it still sets the pace. It simply stops being the headline, and the only
part of its horizon shown to the learner is the distance to the next level.

---

## 1b. The shape of the site — milestones are the spine

Added 2026-08-29, same conversation, immediately after §1. Reza's words:

> "the whole website needs to be much more simplified rather than story based. There are mini
> language milestones that you are trying to get me to achieve and stories, vocabulary learning,
> sentence drills, grammar drills all form part of it."

The site was built story-first: **Stories** was the foundation, and everything since bolted on
another top-level destination. The nav reached **eleven** — Home, Stories, Vocab, Lessons, Quran,
Grammar, Sentences, Audio, Speak, Converse, Review. That is eleven decisions before any learning
starts, for a learner whose recorded barrier is *tiredness, not motivation*, and whose profile says
in as many words: **minimise decisions and clicks, one-tap starts, he should only ever study,
never maintain.**

**The inversion:** a milestone is the only thing at the top. Stories, vocabulary, sentence drills,
grammar drills, audio rounds and conversation are **exercise types** the week draws on to reach it.
They are engines, not destinations.

### The final shape (his second message, same conversation)

> "is it possible to simplify it further, where either i just do a standard lesson or a commute
> version. the lessons are all small chunks and there is a weekly target. in addition to that there
> should be a free vocab learn and review and free sentence building and review."

So the whole site is **two ways to study the week, plus two free-practice decks**:

```
                 🎧 Qur'an A1  ·  🗣 Conversation A1        ← where he stands
        ┌──────────────────────────────────────────┐
        │  THIS WEEK   Week 1 · 6 of 15 · exam Sat │        ← the target
        └──────────────────────────────────────────┘

           ▶  Lesson                🚗  Commute              ← the only two ways in
           (small chunk, screen)    (hands-free audio)
                    └──────────┬──────────┘
                       serves the week's items
                               │
        story · vocab · sentences · grammar · audio · quran   ← engines, never a menu

           ── free practice, outside the week ──
           📖 Vocab: learn & review      ✍️ Sentences: build & review
```

### Rules

- **Two study doors, no more.** **Lesson** (screen, one small chunk) and **Commute** (hands-free
  audio). Both draw from the same week. Which engine a chunk uses — story, drill, audio round — is
  decided *for* him.
- **Free practice is deliberately outside the week.** Vocab learn/review and sentence build/review
  are always available and never gated by the syllabus: sometimes he just wants to turn the handle
  without being told what to do. These do **not** count toward the weekly target, and that is fine
  — the target measures the syllabus, not his affection for the site.
- **Exercise types are never a menu.** The week decides what comes next (`planMakeBlock` already
  does this well — it is kept and pointed at the week's items). He is never asked to pick between
  a story and a drill.
- **Everything remains reachable, nothing is deleted.** The existing pages stay, moved behind one
  **All activities** link. Deleting them would break his SRS keys, his history, and Saba's
  beginner path, for no gain — the goal is fewer *decisions*, not less *site*.
- **Stories lose their special status, not their content.** `story-NN.json` becomes one source of
  week items alongside the rest. The six stories keep working exactly as they do.
- **No new top-level destination may be added** without removing one. If a future feature needs a
  home, it belongs inside the week or behind *All activities*. This rule exists because the
  eleven-tab sprawl happened one reasonable-looking addition at a time.

---

## 2. The two tracks

Reza's goals are ranked, and they are at genuinely different levels. A single blended level would
hide that, so each track carries **its own CEFR-style level plus a can-do subtitle**.

| Track | id | Goal | Basket measured |
|---|---|---|---|
| 🎧 Qur'an by ear | `quran` | Understand the Qur'an as it is recited (**ranked first**) | the 141 salah words, then `quran-core.json` |
| 🗣 Conversation | `conv` | Hold conversational MSA, including Umrah | the 118 phrases in `phrases.json` + Umrah clusters |

These map 1:1 onto `tracks.quran` / `tracks.conv` already emitted by
`scripts/gen-progress.js` into `data/progress-series.json`. **Do not invent a third track**
without changing that generator too.

Displayed as: `🎧 Qur'an A2 — you follow the short surahs you pray, by ear`.

### Why CEFR labels

Chosen over invented stage names because his Preply teacher already thinks in them: he can say
"I'm working toward A2" and it carries meaning outside this site. The can-do subtitle supplies
the meaning the letter alone lacks.

---

## 3. The ladder

Levels are defined in `data/curriculum.json`. Each level has an `id`, a `label` (the CEFR letter),
a `can` (the can-do sentence, written in second person), and a list of **criteria**.

**A level is awarded only when EVERY criterion is met.** There is no partial award, no rounding up
and no time-served promotion. This is deliberate: his profile records that he *fears hollow
milestones*, and a level that cannot be failed is worth nothing. A level, once awarded, is
**never revoked** — decay shows up in exam scores and in the next level's progress, not by taking
something away from him.

### Criterion types

Every criterion is a small declarative object evaluated by `evalCriterion()` in
`js/curriculum.js`. Each returns `{met, have, need, pct, label}` so the UI can show partial
progress toward the next level.

| `type` | Fields | Meets when |
|---|---|---|
| `earCoverage` | `basket`, `min` | fraction of that basket **certified by ear** ≥ `min`. By-ear evidence only: `alisten-grade`, `qlisten-test`, `commute-check`, `ptest-listen`. Screen recall does **not** count. |
| `srsSolid` | `keys` (prefix list), `box`, `min` | fraction of those SRS cards at `box` or higher ≥ `min` |
| `examAvg` | `n`, `min`, `kind?` | mean score of the last `n` exams ≥ `min` |
| `examCount` | `n`, `kind?` | at least `n` exams completed |
| `placement` | `test` (`listen`\|`speak`), `min` | most recent `ptest-listen`/`ptest-speak` score ≥ `min` |
| `surahTests` | `min` | at least `min` surah tests passed (`stepsDone("q-<id>").test`) |
| `outputMinutes` | `min` | logged spoken-output minutes ≥ `min` (speaking is capped by real output time) |

Adding a new criterion type means adding a case to `evalCriterion()` **and** a row to this table.
An unknown type must fail closed (`met:false`) and say so — never silently pass.

### Current ladder (summary — `data/curriculum.json` is the source of truth)

**🎧 Qur'an**
- **A1** — you catch the words of Al-Fatiha as it is recited
- **A2** — you follow the short surahs you pray, by ear
- **B1** — you catch the sense of a short surah you have never studied
- **B2** — you follow connected recitation beyond what you have memorised
- **C1** — you follow recitation across a juz'

**🗣 Conversation**
- **A1** — you can greet someone, introduce yourself and say what you need
- **A2** — you can handle an Umrah trip end to end: directions, shopping, food and time
- **B1** — you can hold a short conversation about yourself, your family and your day
- **B2** — you can discuss things beyond immediate daily needs
- **C1** — you can converse comfortably in MSA

Levels below the learner's current one are shown as earned; the next one is shown with per-criterion
progress bars. Levels beyond the next are **not** shown — the whole point is a near horizon.

---

## 4. The week

### Rhythm

His live Preply lesson is **Sunday 07:00 UK**. His instruction (2026-08-29): *"start the week from
Monday, so the first lesson starts after my class."* So the class **bookends** the week — the one
that starts it supplies the material, the one that ends it is what the week was preparing for:

```
Sun 07:00  CLASS  →  he pastes/photos it same day
Mon                 the week OPENS on that material          ← from
Mon–Fri             study
Sat                 the TEST opens (retakeable from here on) ← examOn
Sun 07:00  NEXT CLASS — walked into prepared                  ← to / classOn
Mon                 the next week opens on what she just taught
```

- Week runs **Monday → Sunday**, with `classOn` = the closing Sunday.
- **Turnaround commitment:** material pasted on Sunday must be live as the week's objectives by
  **Monday morning**. That is the whole point of the Monday start — see §7.
- Dates are handled in **local time**, never UTC: under BST a Monday 00:30 is Sunday 23:30 UTC, and
  a UTC boundary would put him in the previous week for an hour every morning.
- The test becomes available on the **Saturday** (`examOn`) and never closes — unlimited retakes,
  and a missed Saturday is not a lost week.
- Weeks with no lesson (teacher away, he skipped) are set entirely by the coach from weak spots.
  **A week is never empty**; if no coach-set week exists, `weekSelfSeed()` builds one from due
  cards so he never opens the site to nothing.

### Sizing — variable, from his actual data

He chose *"variable — you set it from my actual data"* over any fixed minutes-per-day promise,
because a syllabus he completes beats one he abandons.

`weekSize()` computes, in this order:

1. `mins` = median active minutes/week over the **last 3 completed weeks** (from `activeMinutes()`
   chaining, never the inflated pre-2026-07-04 `time` events).
2. First ever week, or no history: assume **35 min** (his observed floor, not his aspiration).
3. Clamp to `[20, 120]` minutes so one heroic or one dead week cannot distort the next.
4. `items = round(mins / 2.5)` — calibrated from his logs at roughly 2.5 active minutes per item
   brought to box ≥ 3. Clamp to `[6, 40]`.
5. If the previous week's exam scored **< 60**, multiply items by **0.7** and carry its weakest
   third forward instead of adding new material.
6. If it scored **≥ 85** and the week was completed, multiply by **1.15**.

Rules 5 and 6 are *the adjustment loop* — the thing he asked for when he said it is my job to
"cleverly set weekly goals and adjust". They are deliberately asymmetric: **shrink fast, grow
slowly.**

### The week object

Coach-written, lives inside `coach:<email>` **beside** `note`/`focus`/`homework` — never replacing
them (see §7):

```jsonc
"week": {
  "n": 1,                          // integer, increments forever, never reused
  "from": "2026-08-30",            // Sunday, ISO
  "to": "2026-09-05",              // Saturday, ISO
  "examOn": "2026-09-05",
  "title": "Week 1 — your family and your house",
  "why": "One honest sentence: why THIS, this week.",
  "track": "quran",                // the track this week mainly advances
  "source": "teacher" | "coach",
  "lesson": "Bayna Yadayk Unit 2", // optional, when source is teacher
  "sizedFor": { "mins": 35, "items": 14, "basis": "median of 3 weeks" },
  "items": [                       // the syllabus — SRS keys, in teaching order
    { "key": "story-02:4", "why": "leaking" }
  ],
  "tasks": [                       // teacher homework, checkable; [] if none
    { "id": "hw1", "text": "Write 5 sentences about your house" }
  ]
}
```

**`items[].key` must be a real SRS key** (`story-NN:i`, `qc:i`, `qw:<surah>:<v>:<w>`, `ph-<gid>:<i>`,
`ev-<gid>:<i>`, `fam-<id>:<i>`, `tw:<normalized>`). The week page resolves them through
`data/lexicon.json`; an unresolvable key is dropped with a console warning rather than crashing
the page.

### Week progress

`weekProgress()` returns `{solid, total, pct, byItem}` where an item counts as **solid at box ≥ 3**.
This is the number in the dashboard hero and the thing the exam is set against.

---

## 5. The exams

### Learn → test, and the target is a floor not a ceiling

> "the weekly target is pre-set but if i carry on that is fine, but the test should reflect that.
> the model should be learn - test."

The week's `items` are the **target**, set on Sunday. He is free to carry on past it, and when he
does, **the exam must cover what he actually learnt** — otherwise extra effort is invisible, which
is the exact trap the old design fell into.

So `examBuild()` is scoped by the **union** of the week's target and what he actually learnt —
never one instead of the other:

> *scope* = every key in the week's objectives, **plus** any other card brought to box ≥ 3
> between `week.from` and now (`srs.u` stamps the write time).

Both halves matter. Scoping to the mastered part alone would score near 100% every time and hide
the movement the retakes exist to show; scoping to the list alone would ignore work he chose to
do. The union makes the score start low and climb as the week is mastered — which is what "how
far along have I gone" means.

Consequences, all deliberate:

- Extra work earns extra questions rather than going untested.
- Free-practice work (§1b) that reaches box ≥ 3 during the week **is** examined, even though it
  does not count toward the target. Learning counts wherever it happened.
- Material that was already solid before the week started is *not* re-counted as this week's.
- Early in the week, before anything is solid, the exam still covers the whole target — that low
  first score is the baseline the retakes are measured against.
- `weekProgress()` reports `solid` against the target **and** `extra` beyond it. Progress is never
  capped at 100%: "15 of 15 — plus 6 more" is a better week than "15 of 15", and it should read
  that way.

### Kind is derived from the week number

```
n % 52 === 0  →  annual
n % 26 === 0  →  semiannual
n % 13 === 0  →  quarterly
n %  4 === 0  →  monthly
otherwise     →  weekly
```

This is what "weekly, monthly, quarterly, semi-annual and annual are essentially the milestones"
means in code. One rule, no schedule to maintain.

### Scope by kind

| Kind | Scope | Items |
|---|---|---|
| `weekly` | **80%** this week's syllabus, **20%** carried from the previous 3 weeks | 20 |
| `monthly` | the last 4 weeks, evenly | 28 |
| `quarterly` | the last 13 weeks, recency-weighted, **plus a level-test section** for the next level on each track | 36 |
| `semiannual` | everything to date, recency-weighted, plus level test | 40 |
| `annual` | everything to date, recency-weighted, plus level test | 48 |

The 80/20 split is Reza's choice, so that "earlier weeks can't quietly rot" while the score still
means "did I learn *this* week".

### Composition

Because the Qur'an track is his ranked-first goal and **by-ear is the honest gap**, exam questions
are drawn so that **at least half of the Qur'an-track items are answered by ear** (audio prompt,
no text shown). Question forms, reusing existing site interactions:

- `ear` — hear the word/phrase, recall the meaning, self-grade (the `alisten` pattern)
- `mean` — Arabic shown, choose/type the English
- `prod` — English shown, type the Arabic (forgiving match via `writeMatchAr`)
- `cell` — conjugation cell (`spract` pattern), only when the week contained verb work

### Scoring

- Each item scores 0 or 1; `score = round(100 * correct / total)`.
- Reported **with a breakdown by section** (this week / carried / by ear) — a single number that
  hides a collapsed ear score would be exactly the flattery the profile forbids.
- Bands: **≥85 strong · 70–84 solid · 60–69 shaky · <60 not yet**. These drive the adjustment
  loop in §4 and the wording of the verdict.
- Self-graded `ear` items are marked as such in the breakdown. They are **not** silently mixed
  into the headline as if machine-verified.

Every completed exam logs one event (§6) and calls `gradeCard()` for each item, so the exam is
also real revision — never a read-only quiz.

### The result is described, not just scored

> "the learn-test creates a feedback loop and the result is qualitatively described along with a
> standard course lingo like A, B, C"

`examVerdict()` turns a result into language. A score screen must carry **all four** of these, in
this order — a bare number is a regression:

1. **The number and its band** — `78 · Solid`.
2. **What he held, in content terms** — *"You held Al-Fatiha and the family words."* Groups are
   derived by `groupOf(key)`; the engine deliberately does not know content names, so the caller
   passes `nameFor(group)`.
3. **What is still shaky** — same treatment, and the by-ear split stated plainly even when it is
   worse than the headline. Especially then.
4. **What the loop will do about it** — *"Next week is lighter and re-teaches this rather than
   moving on."* This is the half of feedback that usually goes missing, and it is what makes the
   loop visible rather than merely real.

Alongside it, `levelSummary()` reports the course lingo: the CEFR letter **with** its can-do line
(`🎧 Qur'an A1 — you catch the words of Al-Fatiha as it is recited`). Never the letter alone — a
letter with no meaning is the thing CEFR labels were chosen to avoid.

---

## 6. Data contracts

### `data/curriculum.json` (static, shared by both users)

```jsonc
{
  "version": 1,
  "tracks": [
    { "id": "quran", "icon": "🎧", "name": "Qur'an by ear", "goal": "…",
      "levels": [ { "id": "quran-a1", "label": "A1", "can": "…",
                    "criteria": [ { "type": "earCoverage", "basket": "fatiha", "min": 0.6 } ] } ] }
  ],
  "baskets": { "fatiha": ["qw:fatiha:…"], "salah": ["…"] }
}
```

### Log events (these ARE the history — see the warning below)

| Event | Payload | Logged when |
|---|---|---|
| `week-start` | `{n, title, from, to, track, items, sizedFor}` | client first renders a week number it has not seen |
| `week-item` | `{n, key, solid}` | an item crosses into box ≥ 3 |
| `exam-start` | `{n, kind, total}` | exam begun |
| `exam-done` | `{n, kind, score, correct, total, sections:{week,carry,ear}, level?}` | exam finished |
| `level-up` | `{track, from, to, at}` | a level's criteria all met for the first time |

> **⚠️ History lives in the log, and only in the log.**
> The cloud payload is `{progress, srs, tapwords, log, savedAt}` — arbitrary `store` keys are
> **not** synced (see `_payload()` in `js/tracker.js`). Week history and exam scores are therefore
> derived by replaying `week-start` / `exam-done` events via `weekHistory()`. Do not "improve"
> this by moving history into a new localStorage key: it would not sync, and it would not survive
> the device loss the whole sync layer exists to protect against.

### Who writes what

| Thing | Written by | Where |
|---|---|---|
| the ladder | a developer/AI, deliberately | `data/curriculum.json` (repo) |
| the week's syllabus | the coach, every Sunday | `coach:<email>.week` (KV) |
| progress, scores, history | the learner's device | log events → synced |

---

## 7. Operating it — what an AI does each Sunday

This is the recurring job. It belongs to the nightly (`arabic-coach-nightly`) and to any
interactive `run-arabic-coach` session that happens on or after a Sunday.

0. **The Sunday→Monday turnaround is the commitment.** He asked directly: *"if i paste my class
   lessons can it be incorporated to be ready before my next class?"* Yes — and the deadline is
   **Monday morning**, not "soon". Whatever he pastes on Sunday (photos, typed notes, a screenshot,
   a book page) becomes the week's objectives before he next opens the site. He has a full six days
   on it and the test on Saturday, so he walks into the next Sunday class having already mastered
   what the last one taught. If a paste arrives mid-week, add it to the CURRENT week as a new
   objective rather than making him wait — the target grows, and the test grows with it (§5).
1. **Capture the lesson** if one happened (per `TEACHER-SYNC.md`) — that material is the spine of
   the week. Without photos, the week is coach-set from weak spots instead; never stall waiting.
2. **Score the week that just ended.** Read `exam-done` for week `n-1`. No exam sat? Treat as
   *not scored* — **not** as a zero. A zero would be a lie about his knowledge and would wrongly
   shrink the next week.
3. **Size week `n`** per §4. Apply the adjustment loop honestly, including shrinking.
4. **Choose the items**, in this priority order:
   1. teacher material from today's lesson (if any)
   2. items the previous exam got wrong
   3. leaking cards (box ≤ 2, due) on the track with the nearest reachable level
   4. the next unstarted criterion of the next level
   5. new frequency-ordered material
5. **Write the week** into `coach:<email>`, preserving `note`, `focus` and `homework` in the same
   payload. Losing the homework contract while writing the week is a real regression: read the key,
   mutate, write back — never construct the payload from scratch.
6. **Re-check levels.** If every criterion of the next level is met, say so plainly in the coach
   note; the client logs `level-up` when it renders it.
7. **Journal it** — `week:<n> set (items, track, why)` on the journal line, so the next run knows.

### Invariants

- **Never revoke a level**, and never reuse or renumber a week `n`.
- **Never fabricate a week** with no real items just to have one; `weekSelfSeed()` exists for that.
- **Never let the exam score be the only feedback** — the breakdown by ear vs screen is the honest
  part, and honesty is the standing instruction in `learner-profile.md`.
- **Additive for Saba.** She is a beginner on a separate account with her own `coach:` payload and
  her own week. The ladder is shared; her levels, weeks and scores are hers. Never reshape shared
  content in a way that degrades the other learner (the conflict rule in `arabic-coach/SKILL.md`).
- `node scripts/test-curriculum.js` must pass before any deploy that touches this system.

---

## 8. What this deliberately does NOT do

- **No date promises.** Nothing renders "you will reach X by <date>". The nearest horizon shown is
  the next level, expressed as criteria met vs outstanding.
- **No streak guilt.** A missed exam is "not scored", a missed week shrinks the next one. Neither
  produces a scolding — the profile is explicit that tiredness, not motivation, is the barrier.
- **No level inflation.** Criteria are measured from by-ear and produced evidence, discounted the
  same conservative way `progress-model.js` already discounts. If a level looks far away, the
  answer is a better-chosen week, not a lower bar.
