# Arabic Through Stories — العربية بالقصص

**Live site:** https://rkarim25.github.io/arabiclanguage/
**Owner:** Reza (rkarim25 / rkarim88@gmail.com) · **Maintainer:** Claude (any chat session)

This README is the canonical guide. A chat session should be able to operate the whole project from this file plus the `/arabic-coach` skill.

## Mission & hard rules

Reza's dual goal, in the shortest possible time:
1. **Understand the Quran as it is recited** (primary)
2. **Converse in Arabic** (MSA)

Non-negotiable design rules (learned from Reza's feedback — do not violate):
- **Frequency-first**: never teach words he'll rarely meet. Every new vocab item must be high-frequency (Quranic corpus or daily speech).
- **Linked words together**: teach a root's conjugations/derivations in one go (word families), not isolated forms.
- **Minimal clicking**: tables and fill-a-column checking, not flashcards. Reveal-all + mark-only-misses patterns. Flashcards exist only as opt-in modes.
- **Practical grammar only**: patterns taught through known verses with a 1-minute test — no paradigm tables to memorize.
- **Zero maintenance for Reza**: he studies; Claude generates content, analyzes, deploys. Data flows automatically.
- **Mobile-friendly**: he studies on his phone; keep pages responsive (media queries in `css/style.css`).

## Site map

| Page | What it does |
|---|---|
| `index.html` | Dashboard: Quran-coverage stat, "What now?" suggestions, coach's notes, weak spots, story grid, cloud-sync setup |
| `vocab.html` | **Vocab Learn** (endless auto-picked fill-sheets: due → new frequency-core → family forms), the 60-word Quran core table, 15 root-family lessons (study table + fill-the-sheet test) |
| `quran.html` | Word-by-word surah lessons: study (per-word audio + ⓘ grammar notes + tafsir link) then fill-the-meanings test |
| `grammar.html` | 8 practical patterns taught through known verses, typed 1-minute tests |
| `speaking.html` | Speaking section: word drill by bucket/source chips (say the Arabic, mic-checked, bucket bars) + sentence shadowing across all stories and surahs |
| `story.html?id=story-NN` | 6-step story lessons: Listen, Read (tap word = audio+gloss), Memorize (vocab table), Quiz, Speak (speech-recognition shadowing), Write (dictation + translation) |
| `review.html` | Spaced-repetition queue, table mode (reveal + mark misses) with card mode opt-in |
| `keyboard.html` | Reza's original phonetic Latin→Arabic keyboard tool (mapping also lives in `js/app.js`) |

Shared code: `js/app.js` (manifests, SRS, TTS, phonetic input, `resolveCards`, `suggestNext`, `fuzzyEn`), `js/tracker.js` (event log, time tracking, cloud sync, Google login helpers, `weakSpots`).

## Data model

All localStorage, synced to the cloud (see Infrastructure):
- `ats-progress` — `{ "<unitId>": { steps: { <step>: true } } }`. Unit ids: `story-NN`, `fam-<id>` (step `fill`), `q-<surahId>` (steps `study`/`test`), `gr-<patternId>` (step `test`).
- `ats-srs` — Leitner boxes: `{ "<cardKey>": { box: 0-5, due: epochMs, b?: bucket } }`. Intervals: 0/1/3/7/14/30 days; "again" → box 0, due +10 min. `b` is an explicit user bucket — `know` (30d) / `repeat` (10min) / `later` (7d) / `never` (due=year 2100, excluded from rotation); auto-grading deletes `b`. `bucketOf(key)` maps state→bucket; the Vocab Lab browse view filters by bucket (incl. Unmarked and Don't-repeat) and can feed any bucket into the practice sheet.
- `ats-log` — append-only event log (schema in `ANALYSIS.md` in the `rkarim25/arabic-learning-data` repo).
- `ats-session` / `ats-token` / `ats-gclient` — Google session, GitHub PAT fallback, pasted Google client ID.

**SRS card keys** (resolved to content by `resolveCards()` in app.js):
- `story-NN:<i>` → `data/story-NN.json` `.vocab[i]`
- `fam-<id>:<i>` → `data/families.json` family member
- `ev-<id>:<i>` → `data/everyday.json` everyday-cluster member
- `qc:<i>` → `data/quran-core.json` `.words[i]` — **append-only: never reorder or delete entries**
- `qw:<surahId>:<v>:<w>` → `data/verses.json` verse word

## Content pipelines (how Claude adds material)

- **Surah lessons**: `node scripts/gen-surah.js <numbers...>` — generates word-by-word lessons (Arabic, translit, gloss, grammar note, root per word) from Reza's Quran-Project dataset at `C:\Users\Reza Karim\OneDrive\Quran-Project\docs\data` (`ai_wbw/surah_N.json`, `ai_translations/`; all 114 surahs available; override path with env `QURAN_DATA`). Add a `META` entry (id/name/nameEn/why) in the script for each new surah, and add it to `QURAN_SURAHS` in `js/app.js`. Recommended next: 110, 111, 109, 106, 105; Ayat al-Kursi needs a verse-range feature.
- **Quran core words**: append to `data/quran-core.json` toward the top ~300 lemmas, keeping frequency order among *new* entries (existing indices frozen).
- **Root families**: add to `data/families.json` + `FAMILY_LIST` in `js/app.js`. Pick roots from Reza's weak words. Include 4-7 Quranic forms + 2 real verses each.
- **Everyday clusters** (speaking goal): add to `data/everyday.json` + `EVERYDAY_LIST` in `js/app.js`. Linked groups (theme or root) of high-frequency daily words; Vocab Learn interleaves them 5+5 with new Quran-core words.
- **Stories**: `data/story-NN.json` (follow story-01 schema exactly — sentences carry per-word gloss arrays `words`; all vocab needs `ar`/`en`/`tr`) + entry in `STORY_LIST` in `js/app.js`. Curriculum plan: 5 levels × 8 stories (L1 present tense → L5 functional MSA/media); recycle weak vocab and Quranic structures.
- **Grammar patterns**: `data/grammar.json` + `GRAMMAR_LIST` inside `suggestNext()` in `js/app.js`.

Deploy = commit + push to `main`; GitHub Pages publishes in ~1 minute. Verify with `curl -s -o /dev/null -w '%{http_code}' <url>`.

## Infrastructure

- **Site repo**: `rkarim25/arabiclanguage` (this repo) → GitHub Pages from `main`.
- **Sync Worker**: `arabic-sync` at https://arabic-sync.rkarim88.workers.dev (source: `worker/`; deploy: `cd worker && npx wrangler deploy`). Endpoints: `/config`, `/login` (Google ID token → 180-day session; only rkarim88@gmail.com), `/data`, `/sync`, `/coach`. CORS pinned to the Pages origin.
- **Storage**: Cloudflare KV namespace `9532d5717021486a92f75efb6d7b8a94` (binding `ARABIC_SYNC`). Keys: `data:rkarim88@gmail.com` (the learning payload `{progress,srs,log,savedAt}`), `coach:rkarim88@gmail.com` (dashboard coach notes `{updated,note,focus[]}`), `config:clientId`, `session:*`.
- **Fallback data store**: private repo `rkarim25/arabic-learning-data` (`learning-data.json`, `coach.json`, `ANALYSIS.md` = event schema + analysis guide). Used when Reza connects via GitHub PAT instead of Google.
- **Auth available to Claude sessions**: `gh` CLI (account rkarim25) and `wrangler` (OAuth, account 3554b8ca31b3e9df1709eca7448169aa) are both logged in on Reza's machine.
- **Reza's one-time setup (may still be pending)**: Google OAuth client ID creation + sign-in on the dashboard. Until done, his data stays in-browser and there is nothing to analyze.

## The coaching loop

One command in any chat session: **`/arabic-coach`** (skill at `.claude/skills/arabic-coach/SKILL.md` in the working directory `C:\Users\Reza Karim\OneDrive\Arabic\Self learn`). It reads data (KV first, GitHub fallback), analyzes (weak vocab → listening → speaking → grammar → pacing), writes coach notes back, adds targeted content via the pipelines above, pushes, and verifies.

Manual equivalents:
```
npx wrangler kv key get --namespace-id=9532d5717021486a92f75efb6d7b8a94 "data:rkarim88@gmail.com" --remote
npx wrangler kv key put --namespace-id=9532d5717021486a92f75efb6d7b8a94 "coach:rkarim88@gmail.com" --path coach.json --remote
```

## Local development

```
npx http-server <repo dir> -p 8734 -c-1
```
No build step, no dependencies. Syntax check: `node --check js/*.js` and `new Function()` over inline `<script>` blocks. TTS and Google sign-in require the real origin; everything else works locally.

## Related projects

- **Quran reader**: https://rkarim25.github.io/Quran/#/<surah> — surah lessons link here for tafsir. Its dataset (local, OneDrive) powers the surah generator.
- **Original keyboard**: `rkarim25/Arabic` repo → https://rkarim25.github.io/Arabic/ (predecessor of `keyboard.html`).
