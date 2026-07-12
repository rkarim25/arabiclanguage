# Teacher-Sync — turning Preply lessons into site drills

Reza has a live Arabic teacher (Preply) working through two books:
- **Al-ʿArabiyyah Bayna Yadayk** (communicative MSA) → feeds the **conversation** goal.
- **Arabic Through the Qurʾān** (grammar taught through verses) → feeds the **Quran** goal.

The two books map exactly onto the site's two tracks, so her syllabus needs **no new machinery** — it becomes graded content in the structures that already exist. This file is the durable pipeline: any chat session can run it. Model: **she drives the syllabus, the site consolidates it between lessons and reports where he's weak.**

## The one input from Reza

After each lesson he sends **one** of: a photo of the vocab/dialogue/grammar page, or "Bayna Yadayk book N, unit M" / "Arabic Through the Qurʾān chapter K". That is the whole ask on his side — everything below is Claude's job.

## Mapping: book element → site content

| From the lesson | Becomes | File | Manifest in `js/app.js` | SRS key | Category (`catsOf`) |
|---|---|---|---|---|---|
| Bayna Yadayk **vocabulary list** | an everyday cluster (linked by theme/root) | `data/everyday.json` group | `EVERYDAY_LIST` | `ev-<id>:<i>` | msa |
| Bayna Yadayk **dialogue / حوار** | a dialogue story lesson | `data/story-NN.json` | `STORY_LIST` (+ add file to `CORE` in `sw.js`) | `story-NN:<i>` | msa |
| Bayna Yadayk **structure / تركيب** | a grammar pattern taught through its own example | `data/grammar.json` | `GRAMMAR_LIST` (inside `suggestNext`) | `gt:<id>:<i>` | (whichever verse source) |
| Arabic Through the Qurʾān **grammar point** | a grammar pattern taught through the **same verses the book uses** | `data/grammar.json` | `GRAMMAR_LIST` | `gt:<id>:<i>` | quran |
| A high-frequency **Quranic word** she introduces | append to Quran core | `data/quran-core.json` | (none — indexed) | `qc:<i>` (**append-only**) | quran |
| A **root** she highlights | a root family (4–7 forms + 2 verses) | `data/families.json` | `FAMILY_LIST` | `fam-<id>:<i>` | quran+msa |

## Generation rules (do not violate — these are Reza's hard rules)

1. **Check against existing content first.** Before adding a word, grep `data/*.json` for it. If it's already on the site, do **not** duplicate — note it so it resurfaces in Review instead. This keeps the frequency budget clean.
2. **Frequency-first still applies.** Both books are already high-frequency, so trust them — but skip genuinely rare items (proper nouns, one-off vocabulary) rather than teaching them.
3. **Every vocab item needs `ar` + `en` + `tr`** (transliteration). Full tashkeel on all Arabic. Story sentences render from the `words` gloss arrays, not `ar`.
4. **Link, don't isolate.** Group her vocab by theme or shared root into one cluster; teach a root's forms together in a family.
5. **Grammar = 1-minute test, not a paradigm table.** Follow the `data/grammar.json` shape: `what` (plain-language rule), 3 `examples`, 3 `test` items. For the Quran book, use the verses the book itself cites so lesson and site reinforce.
6. **Tag the source** (see below) so progress is traceable back to book+unit.

## Metadata convention (additive — current code ignores unknown fields)

Stamp teacher-sourced content so the progress sheet can report per-unit:
- everyday group / grammar pattern / story: add `"source": "teacher"`, `"book": "aby" | "atq"`, `"unit": "<book-ref>"` (e.g. `"aby1-u3"`).
- Existing content is left untouched; only new teacher content carries these.

## Rhythm

- **Post-lesson (default):** generate the lesson's content the same day → it enters the "new words" pool in Vocab Learn and drills all week via SRS; dialogues get Ears mode.
- **Pre-lesson (optional):** if he sends the *next* unit ahead, pre-load its vocab so he walks in warm and spends paid time speaking, not on first contact.

## Deploy

Content-only changes to `data/*.json` + manifests + `sw.js`:
1. `node scripts/bump-version.js` (stamps `?v=` on js/css and the `sw.js` cache name).
2. Commit + push to `main`; Pages publishes in ~1 min.
3. Verify: `curl -s -o /dev/null -w '%{http_code}' https://rkarim25.github.io/arabiclanguage/` → 200, and spot-check the new data-file URL.

(Adding only this markdown file needs no bump — it doesn't touch the running app.)

## Known gap → next enhancement

New teacher vocab currently joins the general "new words" pool; it isn't *prioritised* over other new words, so this week's lesson may not surface first. Next build: a **"From your lessons"** dashboard section (or a `current`-unit priority flag) that pushes the most recent unit to the front of Vocab Learn and shows retention per unit — this is also the data source for the **teacher-facing progress sheet**.
