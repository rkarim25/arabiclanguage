# Arabic Through Stories — العربية بالقصص

A story-based MSA (Modern Standard Arabic) learning site: **https://rkarim25.github.io/arabiclanguage/**

Each story is a 5-step lesson: **Listen → Read → Memorize → Quiz → Write**, with tap-to-gloss reading, a spaced-repetition flashcard deck, dictation via browser text-to-speech, and a phonetic Latin→Arabic keyboard for writing exercises.

## Curriculum

| Level | Focus | Status |
|---|---|---|
| 1. الأساس Foundation | Present tense, daily life, family | Stories 1–3 live (pilot) |
| 2. الحكايات Narratives | Past tense, trips, memories | planned |
| 3. التوسع Expansion | Future, plurals, work, health | planned |
| 4. المتوسط Intermediate | Connectors, opinions, simple news | planned |
| 5. الوظيفي Functional | News items, biographies, essays | planned |

## Adding a story

1. Create `data/story-NN.json` following the schema of `data/story-01.json` (sentences with per-word glosses, vocab, questions, dictation indices, translation prompts).
2. Add the story to `STORY_LIST` in `js/app.js`.

Progress and the flashcard schedule are stored in `localStorage` (export/import available on the home page). No build step — plain HTML/CSS/JS on GitHub Pages.
