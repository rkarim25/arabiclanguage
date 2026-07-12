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

## Deploy

`node scripts/bump-version.js` → commit → push `main` (Pages ~1 min) → verify `curl -s -o /dev/null -w '%{http_code}' <url>` = 200 and spot-check the data file. (A markdown-only change needs no bump.)

## Known gap → next build

Lesson content isn't *prioritised* in the daily flow yet (vocab is only front-loaded in `EVERYDAY_LIST` + reachable via the Lessons tab). Planned: push the **most recent lesson first** in daily review, and a **per-lesson retention view** — which is also the data source for a **teacher-facing progress sheet** (an honest what's-retained-vs-stuck summary Reza can share with his teacher before lessons).
