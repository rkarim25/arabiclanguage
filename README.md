# Arabic Through Stories — العربية بالقصص

A story-based MSA (Modern Standard Arabic) learning site: **https://rkarim25.github.io/arabiclanguage/**

Each story is a 6-step lesson: **Listen → Read → Memorize → Quiz → Speak → Write**, with tap-to-gloss reading, a spaced-repetition flashcard deck, speech-recognition shadowing, dictation via browser text-to-speech, and a phonetic Latin→Arabic keyboard for writing exercises.

## Learning analytics

`js/tracker.js` logs every learning event (flashcard grades with response times, quiz answers, dictation/translation attempts including typed text, word taps, sentence replays, speech-recognition scores, time on task) to `localStorage` and syncs it to the private repo `rkarim25/arabic-learning-data` using a fine-grained PAT the user pastes into the dashboard (Contents read/write on that one repo only). The coach (Claude) analyzes that data on request and writes `coach.json` back, which the dashboard displays. See `ANALYSIS.md` in the data repo for the event schema and analysis protocol.

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
