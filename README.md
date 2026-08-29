# Arabic Through Stories — العربية بالقصص

**Live site:** https://rkarim25.github.io/arabiclanguage/
**Owner:** Reza (rkarim25 / rkarim88@gmail.com) · **Maintainer:** Claude (any chat session)
**Learners (2026-07-15):** **Reza Karim** (rkarim88@gmail.com, standard) and **Saba Khan** (sabatarif.15@gmail.com, beginner) — separate cloud data, SRS, and personal coach notes; shared site content. `PROFILES` in `js/app.js` maps email → name/level. **Conflict rule:** one user's request must never degrade the other's experience — beginner material for Saba is ADDED (new clusters/levels), never swapped in over existing content.

This README is the canonical guide. A chat session should be able to operate the whole project from this file, the `/arabic-coach` skill, `TEACHER-SYNC.md` (the lesson-capture loop) and **`CURRICULUM.md`** (weeks, levels and exams).

> **⚠️ Read `CURRICULUM.md` before changing the home page, the nav, or anything about weeks/levels/tests.**
> Since **2026-08-29** the site is organised around a capability ladder, not a forecast: two tracks
> (Qur'an by ear, Conversation) each carrying a CEFR level plus a can-do line; a weekly target expressed
> as **objectives to master** (time is the variable, never a quota of minutes); and an always-open,
> unlimited-retake test that both measures and teaches. The nav is deliberately **four links** and the
> home page offers exactly **two ways in** — ▶ Lesson and 🚗 Commute — plus free vocab/sentence practice.
> Adding a new top-level destination requires removing one.

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
| `index.html` | Dashboard, "just home" (his 2026-08-09 order): 🚗 commute check (test-first) → coach's notes → **Today's plan** (with ⚡ boost notices/sections and the 🚗 hands-free parallel row) → skill charts + milestones → sync. Weak-spots card removed (the data feeds the plan instead); story grid moved to `stories.html` |
| `stories.html` | Story grid (Level 1) + how-to-use-each-story — moved off home 2026-08-09; nav tab **Stories** |
| `vocab.html` | **Vocab Lab**, tabbed: **📝 Learn** (endless auto fill-sheets: due → new frequency-core → family forms; modes Understand Ar→meaning / Write meaning→Ar / **🎧 Ears** sound→meaning), **🎓 Lessons** (all lesson-sourced clusters `source:"teacher"`, grouped by lesson label — one place to study/review your teacher's words), **🌿 Roots** (15 families), **📖 Core** (Quran-core table), **🗂 Browse** (by bucket). **Every checked answer auto-schedules the word by SRS interval — the ✓↻⏳🚫 buckets are OPTIONAL overrides, not required.** |
| `quran.html` | Word-by-word surah lessons: study (per-word audio + ⓘ grammar note + **root-family link** + tafsir) then fill-the-meanings test. **▶ Real recitation** (Alafasy, everyayah.com) verse by verse; `?listen=1` = **Listen queue** (logs `rlisten`); **Cold listen** per surah (recitation-only MCQ; 85% → step `listen`, logs `qlisten-test`; milestone "3 surahs certified by ear") |
| `grammar.html` | 8 practical patterns via known verses, typed 1-min tests; passing (60%+) seeds `gt:<id>:<i>` SRS cards. **Who's acting?** (`?g=verbears`): audio verb-form drill (logs `vdrill`) |
| `sentences.html` | **Sentence Practice**: produce a full sentence from a known verb, cycling I/we/they × past/present/future over frequency-ranked verbs (`data/sentences.json`); recall-then-show, drill-the-misses, tense chips. Logs `spract`/`spract-done` (conjugation weaknesses) |
| `speaking.html` | Speaking: word drill by bucket/source, "say it in Arabic" prompts (`data/prompts.json`), sentence shadowing across stories + surahs |
| `converse.html` | **Conversation Partner**: generates a portable, model-agnostic briefing file (paste into Gemini/Claude/ChatGPT) from Reza's known vocab + a scenario (`data/conversations.json`) + last 3 saved reports. He pastes the AI's end report back → `convo` log event → folds into the next briefing |
| `test.html?ms=<id>` | Milestone tests (mock + official, 85% certifies `ms-<id>` step `passed`): top20/top40/core60, opener/survival/umrah/masjid |
| `story.html?id=story-NN` | 6-step story lessons: Listen, Read (tap word = audio + gloss + **transliteration + same-root family link**), Memorize (vocab table), Quiz (**Comprehension — question words are tap-for-gloss too**), Speak (speech shadowing), Write (dictation + translation) |
| `audio.html` | **🎧 Audio Coach**: hands-free word beats (Arabic → recall gap → English → Arabic) + sentence rounds, weighted weakest/due-first, optional ✓/✗ self-grades (`alisten-grade`). **🚗 Commute session** (2026-08-09): fixed ~13-min self-ending run, zero taps, gaps are silent *audio* (`audio/ui/gap3.wav`/`gap5.wav` — survives a locked screen; timers don't), MediaSession lock-screen/headphone controls, clip prefetch for offline; logs `commute-start`/`commute-done{keys,taught,min}`. Next sitting ≥8h later, the dashboard opens with a **🚗 Commute check** (test-first): 3 trained + 3 box-matched control words by ear, blinded; each answer `gradeCard`s the real SRS + logs `commute-check{key,trained,ok,box}`; trained-vs-control recall over ~2 weeks = the honest verdict on whether commute audio works for him (needs ≥10 answers per arm; shown on the card) |
| `review.html` | Spaced-repetition queue, table mode (reveal + "✗ missed") with a **full-width mobile-safe control row per word: standard bucket bar (✓↻⏳🚫) + 💡 hooks**; an explicit bucket set during review is final (Finish skips regrading it); card mode opt-in shows 💡 on the back |
| `keyboard.html` | Phonetic Latin→Arabic keyboard tool (mapping in `js/app.js`) |

**Typing (all writing surfaces):** `mountTranslitDock(getTarget)` in app.js gives every answer box a live Latin→Arabic typing box — type transliteration, Arabic appears in real time (mobile-safe `input` event + `latinToArabic`). Auto-opens on Sentences/Grammar/Milestone tests; Story Write & Vocab Produce use it too. `LATIN_TO_AR` is forgiving: `aa`=ا, Arabizi numerals (2/5/6/7/9), long vowels (ee/ii/oo/uu). **Answer matching is lenient:** `arMatch` forgives tashkeel, ة/ه & hamza-seat slips, spacing, and one typo in words ≥5 letters; `fuzzyEn` accepts English typos and stems. Only Arabic fields (`fill-input`/`dir=rtl`) transliterate — English-meaning fields are untouched.

Shared code: `js/app.js` (manifests, SRS + `gradeCard`, TTS + recitation audio, `latinToArabic` + `mountTranslitDock`, `resolveCards`, `suggestNext`, `arMatch`/`fuzzyEn`/`editDist`, `renderNav`, `PROFILES`/`whoami`, mnemonics `mnemFor`/`mountMnem`, `mountBucketBar`, `noteWordTap` tap-to-review, `mountNotePen`, SW registration), `js/tracker.js` (event log, active-time, cloud sync, `weakSpots`, `activeMinutes`).

**Tap-to-review (`noteWordTap`)**: any word tapped for help ≥3 times quietly joins the Review deck — story Read + Quiz taps become `tw:<norm>` cards (content in `ats-tapwords`, synced in the payload), Quran word taps seed the exact `qw:` card. Logs `tapseed`.

**✏️ Note to coach (`mountNotePen`)**: a floating pen on every page opens an open-format note box. Saved as a `note` log event `{text, ctx:{url,title,view,sel}, user}` — ctx captures what the learner was looking at (page, headings, selected text). Synced with everything else; the nightly coach reads every new note, acts on it, and acknowledges it in that user's dashboard coach note. This is the learners' direct channel to the AI.

**📷 Photos on a note** (2026-08-05, his ask): paste, drag, or pick images in the note box — a lesson page, a worksheet, a book. `shrinkImage()` re-encodes to ≤1400px JPEG (~200KB) in a canvas, `uploadNoteImage()` PUTs each to the Worker's `POST /image`, and the note event carries only `imgs:[id,…]`. **The bytes never enter the log blob** — that blob is rewritten on every sync, so an image inside it would make every future sync tens of times heavier. They live at KV `img:<email>:<id>` (metadata `{type,bytes,at}`, 180-day TTL) and only the owning session can read one back (`GET /image?id=`, key namespaced by the session's email). Upload happens *before* the note is logged, so a failure never leaves a note pointing at nothing — the box keeps your text and says to press send again. Max 6 per note; Send waits on any photo still being shrunk. The nightly coach treats them as a TEACHER-SYNC lesson dump.

**🔁 Conjugation strip** (`mountConjRows`, 2026-08-05, his ask — "I still don't see words with conjugations"): every verb row in the Core table, the cluster/family tables and the story word-lists gets a line underneath showing **past · present · future**, with all 8 persons one tap away (logs `conj-open`). Matching is **vowel-exact** (`conjLookupStrict`) — the bare skeleton كتب is both كَتَبَ "he wrote" and كُتُب "books", and a strip that mislabels a noun as a verb teaches an error. On story pages the strips hide while self-test is on, since they carry English.

**Offline (PWA):** `sw.js` — network-first with cache fallback. **HTML navigations are fetched with `cache:"reload"` to bypass the browser's HTTP cache** (GitHub Pages sets a max-age on HTML; without this a deploy looked stale for a while and pulled stale `?v=` assets — the "I don't see my update" bug, fixed 2026-07-12). Versioned js/css/json cache normally; works offline from the last good copy. `scripts/bump-version.js` stamps the sw cache name every deploy so old caches retire. **After a deploy, an already-open device self-heals within ~2 visits (new SW installs, then a reload gets fresh HTML); a hard refresh forces it immediately.** `manifest.webmanifest` + `icons/` enable "Add to Home Screen".

## Data model

All localStorage, synced to the cloud (see Infrastructure). Payload: `{progress, srs, tapwords, log, savedAt}`:
- `ats-progress` — `{ "<unitId>": { steps: { <step>: true } } }`. Unit ids: `story-NN`, `fam-<id>` (step `fill`), `q-<surahId>` (steps `study`/`test`), `gr-<patternId>` (step `test`).
- `ats-tapwords` / `ats-tapcounts` — tap-to-review: content for `tw:` cards (synced) and local tap counters. `ats-email` — who is signed in (drives `whoami()` personalization).
- `ats-srs` — Leitner boxes: `{ "<cardKey>": { box: 0-5, due: epochMs, b?: bucket } }`. Intervals: 0/1/3/7/14/30 days; "again" → box 0, due +10 min. `b` is an explicit user bucket — `know` (30d) / `repeat` (10min) / `later` (7d) / `never` (due=year 2100, excluded from rotation); auto-grading deletes `b`. `bucketOf(key)` maps state→bucket; the Vocab Lab browse view filters by bucket (incl. Unmarked and Don't-repeat) and can feed any bucket into the practice sheet. **A checked answer calls `gradeCard()`, so the box/interval advance automatically — buckets are optional manual overrides, never required.**
- `ats-log` — append-only event log (schema in `ANALYSIS.md` in the `rkarim25/arabic-learning-data` repo).
- `ats-session` / `ats-token` / `ats-gclient` — Google session, GitHub PAT fallback, pasted Google client ID.

**SRS card keys** (resolved to content by `resolveCards()` in app.js):
- `story-NN:<i>` → `data/story-NN.json` `.vocab[i]`
- `fam-<id>:<i>` → `data/families.json` family member
- `ev-<id>:<i>` → `data/everyday.json` everyday-cluster member
- `qc:<i>` → `data/quran-core.json` `.words[i]` — **append-only: never reorder or delete entries**
- `qw:<surahId>:<v>:<w>` → `data/verses.json` verse word
- `gt:<patternId>:<i>` → `data/grammar.json` pattern test item (grammar chunk recognition; seeded on a passed grammar test)
- `tw:<normalized-ar>` → `ats-tapwords` (local, synced via payload `tapwords`) — seeded by `noteWordTap` when a word is tapped ≥3×

**Non-SRS data:** `data/sentences.json` (Sentence Practice verb bank) and `data/conversations.json` (Converse scenarios) drive practice + logging, not SRS cards. **Lesson tags:** lesson-sourced content carries `source:"teacher"` + a free `lesson:"<label>"` (see `TEACHER-SYNC.md`); the 🎓 Lessons tab groups everyday clusters by that label.

**Sync safety:** `_mergeRemoteState()` in tracker.js merges remote srs/progress into local BEFORE every push (higher box wins; an explicit local bucket mark is kept as latest intent; `never` always wins; progress steps union). This prevents a fresh device or an evicted localStorage from wiping the cloud copy. Never revert sync to last-writer-wins.

## Content pipelines (how Claude adds material)

- **Lesson capture (the main loop):** Reza dumps images of *any* lesson — any book, notes, worksheet; vocab or grammar or dialogue. Claude reads them, routes each part to the right structure below, tags it `source:"teacher"` + `lesson:"<label>"`, deploys. Full spec: **`TEACHER-SYNC.md`**. This is not tied to any one book.
- **Surah lessons**: `node scripts/gen-surah.js <numbers...>` — generates word-by-word lessons (Arabic, translit, gloss, grammar note, root per word) from Reza's Quran-Project dataset at `C:\Users\Reza Karim\OneDrive\Quran-Project\docs\data` (`ai_wbw/surah_N.json`, `ai_translations/`; all 114 surahs available; override path with env `QURAN_DATA`). Add a `META` entry (id/name/nameEn/why) in the script for each new surah, **and add it to `QURAN_SURAHS` in `js/app.js` — this step was once forgotten (commit 3a5afe4 added 3 surahs to verses.json only), which silently hides them from What-now, milestones, and the listen queue. Treat gen-surah + QURAN_SURAHS as one atomic change.** Done: 1, 97, 103, 105, 106, 108-114 + Ayat al-Kursi (verse ranges like `2:255` work via RANGE_META — id `kursi`). Recommended next: 93, 94, 99-104 (rest of the common short surahs). Memorized-first: Reza knows Fatiha + a few short ones by heart, so surahs already in his memory are the highest-value lessons. The "salah fully understood" long-view bar is PINNED to `SALAH_SURAH_IDS` (7 surahs) — new lessons must never move that goalpost.
- **Quran core words**: append to `data/quran-core.json` toward the top ~300 lemmas, keeping frequency order among *new* entries (existing indices frozen).
- **Root families**: add to `data/families.json` + `FAMILY_LIST` in `js/app.js`. Pick roots from Reza's weak words. Include 4-7 Quranic forms + 2 real verses each.
- **Everyday clusters** (speaking goal): add to `data/everyday.json` + `EVERYDAY_LIST` in `js/app.js`. Linked groups (theme or root) of high-frequency daily words; Vocab Learn interleaves them 5+5 with new Quran-core words. Members may carry a `hear` field (`"وين؟ — wēn"`) = the Hijazi street form rendered as a 🗣 line in study tables — use sparingly, Umrah-critical phrases only.
- **Stories**: `data/story-NN.json` (follow story-01 schema exactly — sentences carry per-word gloss arrays `words`; all vocab needs `ar`/`en`/`tr`) + entry in `STORY_LIST` in `js/app.js` + add the file to `CORE` in `sw.js`. Live: 6 L1 stories (01-03 narratives, 04 Friday/masjid, 05 restaurant DIALOGUE, 06 The Teacher Session — weaves lesson vocab). Curriculum decision (2026-07-04): from Level 2 on, roughly half the slots are scenario DIALOGUES (bargaining, pharmacy, directions) and khutbah-style monologues rather than narratives; keep recycling weak vocab and Quranic structures.
- **Grammar patterns**: `data/grammar.json` + `GRAMMAR_LIST` inside `suggestNext()` in `js/app.js`.
- **Conjugations**: never hand-write the 16 forms. Add a spec (`past3`, `pres3`, plus `pastC` for hollow/doubled verbs) to `scripts/new-verbs.js`, then `node scripts/gen-conj.js --write`. The rules are proved by `node scripts/gen-conj.js --check`, which regenerates every verb already in the file and must report **0 unexplained mismatches** — run it after any change. Genuinely irregular verbs (weak-lām, hamza-final hollow) carry an explicit table in the spec and are checked by `audit()` instead. 82 verbs live. Diacritic convention in this data: the short vowel is written *before* any shadda, and a hamza takes its seat from the vowel it carries (ؤ before damma, ئ before kasra).
- **Sentence Practice verbs**: append to `data/sentences.json` `verbs[]` (already frequency-ordered) — each needs `root`/`base`/`past`, an `obj{ar,en}`, and `forms` for ana/nahnu/hum × past/pres/fut. **Verify every conjugation** (reuse the hand-checked set in grammar.html's `VE_VERBS`).
- **Conversation scenarios**: append to `data/conversations.json` `scenarios[]` — `{id, titleEn, titleAr, clusters[] (existing everyday ids), goal, opener, openerTr, success}`. The briefing pulls the clusters' words as target vocab.
- **Mnemonics**: add to `data/mnemonics.json`, keyed by normalized/al-stripped Arabic (`mnemFor()` in vocab.html; a first-word fallback covers phrases). The vocab 💡 toggle reveals it. **HARD RULE: only add a mnemonic if it's RIDICULOUS but NOT tenuous** — a strong, obvious sound/meaning hook drawing on Reza's English AND Bengali (Bengali shares many Perso-Arabic loanwords: রসূল, কিতাব, নজর, আজান, রহিম…). **Most words should have NO mnemonic — never force a weak/tenuous one.** Grow the file as his vocabulary grows.

Deploy = **run `node scripts/bump-version.js` first** (stamps `?v=` on js/css includes AND the `sw.js` cache name — prevents fresh-HTML/stale-script cache skew and retires old offline caches), then commit + push to `main`; GitHub Pages publishes in ~1 minute. Verify with `curl -s -o /dev/null -w '%{http_code}' <url>`.

## Infrastructure

- **Site repo**: `rkarim25/arabiclanguage` (this repo) → GitHub Pages from `main`.
- **Sync Worker**: `arabic-sync` at https://arabic-sync.rkarim88.workers.dev (source: `worker/`; deploy: `cd worker && npx wrangler deploy`). Endpoints: `/config`, `/login-pw` (email + per-user sync code), `/login` (Google ID token → 180-day session), `/data`, `/sync`, `/coach`. **Multi-user:** allowed emails in `worker/wrangler.toml` `ALLOWED_EMAILS` (currently Reza + Saba); each user's code hash at `auth:pwhash:<email>` = sha256("arabic-sync-v1" + code) (legacy `auth:pwhash` still honored for Reza). To add a user: extend ALLOWED_EMAILS + `PROFILES` in js/app.js, hash a code, PUT it, deploy worker. CORS pinned to the Pages origin.
- **Storage**: Cloudflare KV namespace `9532d5717021486a92f75efb6d7b8a94` (binding `ARABIC_SYNC`). Per-user keys: `data:<email>` (the learning payload `{progress,srs,tapwords,log,savedAt}`), `coach:<email>` (dashboard coach notes `{updated,note,focus[]}` — personally addressed), `coach-state:<email>` (email throttle `{lastEmail,pendingQuestion}`), plus `auth:pwhash:<email>`, `config:clientId`, `session:*`.
- **Fallback / private data store**: private repo `rkarim25/arabic-learning-data` — `learning-data.json` (GitHub-PAT sync fallback), `coach.json`, `ANALYSIS.md` (event schema + analysis guide), **`learner-profile.md`** (who Reza is as a learner — 37, limited time, tiredness barrier, etc.; the coach reads and evolves it), and `snapshots/`.
- **Automated coaching + email**: a nightly scheduled task (`arabic-coach-nightly`, on his machine ~02:00) runs the coach loop unattended — reviews goals-vs-usage, optimises his time, refreshes the dashboard note, may add safe content, and **emails him at most weekly, only when it helps** (via Gmail; from/to rkarim88@gmail.com; subject "[Arabic Coach]"). Big/structural changes it proposes by email rather than deploying.
- **Auth available to Claude sessions**: `gh` CLI (account rkarim25) and `wrangler` (OAuth, account 3554b8ca31b3e9df1709eca7448169aa) are both logged in on Reza's machine.
- **Reza's one-time setup (may still be pending)**: Google OAuth client ID creation + sign-in on the dashboard. Until done, his data stays in-browser and there is nothing to analyze.

## Analysis honesty notes

- **Minutes**: use interaction-timestamp chaining (what `activeMinutes()` does — gaps ≤3 min chain, isolated events ≈30 s), NOT sums of `time` events. `time` events logged before 2026-07-04 predate idle detection and are inflated (a left-open tab once logged 10+ hours on vocab:list).
- **Listening**: `rlisten` (a surah fully played in real recitation) and `listen-click` events are the listening record; `sheet` events with `mode:"ears"` are audio-recognition tests — track their accuracy separately from text modes, the gap between text% and ears% is the real "understand as recited" measure.

## The progress model — the bedrock (2026-08-06; SKILL AXIS 2026-08-07)

Reza's own framing, which the site now measures directly: a goal is a basket of
items whose memory **decays between reviews** — a line that rises when he studies
and sags when he doesn't. Since 2026-08-07 the charts plot **the skills, not word
retention** (his ask): the Quran panel is **listening** — salah stage = % of
recitation words caught by ear (target 90%; he recites the text daily, so
catching the words ≈ understanding); later stages use the coverage→comprehension
curve (van Zeeland & Schmitt; target 70%) — and the conversation panel is
**speaking** — the share of the Umrah set deployable in speech (target 70%).
Retention is still the engine underneath.

- **`js/progress-model.js`** — the ONE copy of the maths. Per-card recall
  `p = 2^(−elapsed/halflife(box))`, calibrated from his own answers (constants +
  fit provenance in the file header). Skill chain on top, every discount
  conservative and evidence-driven: ear factor (Beta prior, capped), connected-
  speech factor (grows with by-ear minutes toward a stated ceiling), comprehension
  non-linearity, productive floor + output-hours gate (DeKeyser). Reality series
  replay the log with factors-as-of-that-day; `simulateSkill()` runs the forecasts
  (THREE only: current / one higher / one lower — the higher lever is 15 min/day
  with half the practice in the skill's own modality; 10 min/day measurably cannot
  hold the 311-item Umrah basket — the capacity cliff).
- **Placement tests are the feedback loop** (8× the weight of practice evidence):
  **`placement.html`** = 12 audio-only questions (6 recited passages, 6 words) →
  `ptest-listen {score,catch,iso,isolatedCov}`; **Converse → 🎤 Oral exam** =
  examiner briefing for any AI chat (8 tasks, strict 0–5 rubric, conservative-bias
  instruction) whose pasted report logs `ptest-speak {score,mode}`. Tests appear
  as ◆ on chart + email PNG, and `connectedFactorCalibrated()` /
  `productiveFloorCalibrated()` fold them into the next nightly regeneration —
  **if his tests diverge from the forecast, the forecast self-corrects.**
- **`scripts/gen-progress.js <kv-payload.json>`** → `data/progress-series.json`
  (nightly). **`scripts/gen-progress-chart.py`** → `progress.png` (weekly email).
- **`scripts/test-progress-model.js <payload.json>`** — known-answer cases,
  replay-vs-KV validation, fan monotonicity, **conservatism invariants (skills
  must understate; overshooting is a test failure)**, placement-calibration
  direction tests. **Must pass before any deploy that touches the model.**
- Dashboard: the "🎧🗣 Your two skills" card (index.html) is the consolidated
  home of progress: both skill panels with day-snapped crosshair, test CTAs, the
  conservative estimates block, and the full milestones/achievements ladder as a
  collapsed details section. Honesty rules: reality never smoothed, sags shown,
  targets stated per stage, numbers floored not flattered.

## The coaching loop

One command in any chat session: **`/arabic-coach`** (skill at `.claude/skills/arabic-coach/SKILL.md` in the working directory `C:\Users\Reza Karim\OneDrive\Arabic\Self learn`). It runs **per user** (Reza, then Saba): reads data (KV first, GitHub fallback), reads **✏️ pen `note` events first** (the learner's direct requests — act on every one, acknowledge in their coach note), analyzes (weak vocab → listening → speaking → **conjugation** (`spract`) → grammar → **conversation** (`convo`) → **consistency** (`today-done`) → pacing → `tapseed` words), writes a personally-addressed coach note back to `coach:<email>`, adds targeted content via the pipelines above (including any new lesson material Reza dumped), pushes, and verifies. **Never let one user's request degrade the other's experience — beginner content for Saba is additive.**

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
