# Lesson capture — turn any lesson into a study programme

Reza has a live Arabic teacher (Preply) plus other study material. The books he happens to use now are **Al-ʿArabiyyah Bayna Yadayk** (communicative MSA) and **Alan Jones' *Arabic Through the Qurʾān*** (grammar through verses) — but this pipeline is **not tied to those books**. It works for anything: a photo of a vocabulary list, a grammar page, a dialogue, handwritten notes, a worksheet, a screenshot.

**The deal:** Reza dumps images of whatever his lesson covered. Claude reads them, turns them into graded practice on the site, tags them so they live under "his lessons", and they then drill themselves via spaced repetition. Reza just studies — he never files or organises anything.

## The one input from Reza

Photos (or a description) of the lesson. That's it. He does not tell Claude how to structure it — Claude decides from the content what type it is and routes it.

## Routing — content type → where it lives

| What the images show | Becomes | File | Manifest in `js/app.js` | SRS key | Surfaces in |
|---|---|---|---|---|---|
| a **vocabulary list** | an everyday cluster (linked by theme/root) | `data/everyday.json` group | `EVERYDAY_LIST` | `ev-<id>:<i>` | Vocab → **🎓 Lessons** tab, Vocab Learn, Review |
| a **dialogue / conversation** | a dialogue story lesson | `data/story-NN.json` | `STORY_LIST` (+ file to `CORE` in `sw.js`) | `story-NN:<i>` | Stories, Review |
| a **grammar point / rule** | a grammar pattern (taught through an example, 1-min test) | `data/grammar.json` | `GRAMMAR_LIST` in `suggestNext()` | `gt:<id>:<i>` | Grammar page, Review |
| **verbs to conjugate** | entries in the Sentence Practice bank | `data/sentences.json` | (none) | (logs `spract`) | Sentence Practice |
| a **conversation scenario** | a scenario in the Conversation Partner | `data/conversations.json` | (none) | (logs `convo`) | Converse |
| a high-frequency **Quranic word / root** | Quran core or a root family | `data/quran-core.json` / `data/families.json` | (indexed) / `FAMILY_LIST` | `qc:<i>` / `fam-<id>:<i>` | Vocab Roots/Core |

Most lessons are vocab + a grammar point; split them and route each part.

## Metadata convention (so it groups under "his lessons")

Stamp every lesson-sourced item so the **🎓 Lessons** tab and (future) per-lesson retention can find it:
- **Required:** `"source": "teacher"`.
- **Preferred label:** `"lesson": "<free text>"` — e.g. `"Bayna Yadayk — Book 1, Unit 1"`, `"Grammar: the iḍāfa (12 Jul)"`, `"Class notes — greetings"`. The Lessons tab groups by this heading verbatim.
- **Legacy/optional:** `"book": "aby"|"atq"` + `"unit": "aby1-u1"` still compose a heading if `lesson` is absent (back-compat with the first ingest). New content should just use `lesson`.

Current code ignores unknown fields, so these are safe to add to everyday groups, grammar patterns, and stories.

## Generation rules (Reza's hard rules — do not violate)

1. **Check against existing content first.** grep `data/*.json` for a word before adding it; if it's already on the site (e.g. numbers, or a word in a root family), do NOT duplicate — it'll resurface in Review anyway.
2. **Frequency-first.** Lesson material is usually already high-frequency; skip genuinely rare items (proper nouns, one-offs).
3. **Every vocab item needs `ar` + `en` + `tr`** (transliteration). Full tashkeel. Story sentences render from the `words` gloss arrays, not `ar`.
4. **Link, don't isolate.** Group vocab by theme/root; teach a root's forms together.
5. **Grammar = one plain rule + 3 examples + a 3-item 1-minute test** (the `data/grammar.json` shape). Use the lesson's own example sentence.
6. **Verify every Arabic form you author.** Conjugations especially (see the hand-checked set in `data/sentences.json` and grammar.html's `VE_VERBS`).

## How Reza studies it afterward

- **Vocab** → open **Vocab → 🎓 Lessons**; each set opens to study (Understand / Write / 🎧 Ears). After studying, words auto-return in **Review** and **"Start my 5 minutes"** — no marking.
- **Grammar** → the **Grammar** page (the new pattern); passing its test seeds `gt:` review cards.
- **Dialogues** → the new **story**.
- **Verbs** → **Sentence Practice**; **scenarios** → **Converse**.

## The HOMEWORK CONTRACT — lesson-ready by design (2026-08-07)

Every lesson dump ALSO produces a **homework contract**, written into the
learner's `coach:<email>` KV payload (the site copies it to `ats-homework`
locally; `js/plan.js` schedules backwards from it). Format:

```json
"homework": {
  "label": "ABY Book 1, Unit 2 — العائلة",
  "lessonAt": "2026-08-12T19:00",
  "group": "ev-family2",
  "keys": ["ev-family2:0", "ev-family2:1", "..."],
  "tasks": [
    {"id": "write5", "label": "Write 5 sentences with the new words"},
    {"id": "dlg", "label": "Read the Unit 2 dialogue aloud twice"}
  ]
}
```

Rules for the coach writing it:
- `lessonAt` comes from Reza's message ("next lesson Tuesday 7pm") — **if he
  didn't say when, ASK in the coach note / reply** (the contract is worthless
  without the deadline). Convert relative dates carefully; his TZ is UK.
- `keys` = the SRS keys of the content just created from the dump (the cluster
  members, grammar `gt:` cards, story vocab — whatever the lesson made).
- `tasks` = the non-word homework the teacher assigned, as short checkable
  lines. Manual ✓ on the dashboard (`hw-task` events).
- **What the plan does with it**: readiness = words at box ≥ 2 ("solid" =
  survived a spaced gap — cramming can't fake it) + tasks ticked. Homework
  blocks enter Today's plan with urgency (work-left ÷ days-left); the day
  before the lesson the block becomes a **pre-lesson check** (fill-test on the
  lesson group); at 100% the dashboard says **"Fully ready — walk in and tell
  her so."** After `lessonAt` passes, the strip asks for the next dump.
- **Nightly coach**: monitor readiness each run. Lesson < 36 h away and
  readiness < 80% → make homework the plan's top block and say so in the coach
  note. After each lesson passes with no new dump in 3+ days, one gentle
  coach-note nudge (never email for this alone).

## Deploy

`node scripts/bump-version.js` → commit → push `main` (Pages ~1 min) → verify `curl -s -o /dev/null -w '%{http_code}' <url>` = 200 and spot-check the data file. (A markdown-only change needs no bump.)

## Next build

A **per-lesson retention view** feeding a **teacher-facing progress sheet** (an honest what's-retained-vs-stuck summary Reza can paste to his teacher before lessons — the readiness strip is the seed of it).
