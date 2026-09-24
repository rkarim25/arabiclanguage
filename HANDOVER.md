# Handover — Arabic (rkarim25/arabiclanguage)

**Updated 2026-09-24, post-redesign to Interactive Reader & 10-Word Drill.** Read this first in any new session. It tells you where the project stands, what changed, and how to continue.

---

## 1. What This Is & The Learner

A private Arabic-learning site for **Reza Karim** (`rkarim88@gmail.com`) and his wife **Saba Khan** (`sabatarif.15@gmail.com`).
Live URL: `https://rkarim25.github.io/arabiclanguage/`

- **Primary Goal (Rank 1):** Understand the Qur'an **by ear** as it is recited (he already has the Qur'an memorised; decoding at speed is the barrier).
- **Secondary Goal (Rank 2):** Hold a conversation in MSA, including Umrah.
- **Learner Constraint:** High-pressure investment management career + young family. Low energy at night. Needs zero-friction, decision-free sittings (5–10 mins).
- **Live Class:** Preply teacher **every Sunday 07:00 UK** (*Al-Arabiyyah Bayna Yadayk*).

---

## 2. The Core Architecture (Rebuilt September 2026)

The site was simplified from a click-heavy, multi-page app with 28-lesson shelves into a **calm, book-like Interactive Reader**:

```
  📖 HOME (`index.html`)        Daily Book Reader: 10 sentences + Qur'an + AI speak + 5-min test
  🧑‍🏫 LESSONS (`class.html`)   Preply Teacher Lessons (e.g. 30 Aug Samer) + Untimed Mastery Test
  ✍️ SENTENCES (`sentences.html`) Full inventory of high-frequency sentences & verb frame practice
  📇 WORDS (`words.html`)       10-Word Drill: 10 words at a time + Audio (pauses) + 5 rating pills
  📐 GRAMMAR (`grammar.html`)   Full reference of grammar patterns and structural rules
  ☁ SYNC (`more.html#syncCard`) Cloudflare KV sync for logs, SRS, and coach notes
```

### The 5 Active Destinations:

1. **`index.html` (The Daily Chapter Reader):**
   - **10 High-Frequency Sentences:** Situational and verb frames. Features: individual 🔊, "▶ Play All", and "⏸ Play with Pauses" (Arabic $\rightarrow$ 3.5s pause $\rightarrow$ English translation).
   - **Qur'an by Ear (3–5 Ayats):** Sourced from `data/verses.json`. Features word-by-word hover/tap chips and real recitation audio (`everyayah.com` Alafasy).
   - **Conditional Grammar:** Kept strictly *on a need basis* (hidden unless chapter introduces a new structural pattern).
   - **AI Voice Prompt:** 1-click formatted copy button for ChatGPT/Claude voice chat.
   - **5-Minute Chapter Test:** Quick 5-question comprehension check. $\ge 80\%$ stamps chapter as Mastered.

2. **`class.html` (Preply Live Lessons):**
   - Dedicated space for live Sunday Preply lessons.
   - Initial lesson: **30 Aug 2026** (Bayna Yadayk Unit 1 / Housing / Samer).
   - Embedded reading passage (*Samer looking for a flat*) with audio and word-by-word hover.
   - Full tables for class vocabulary and class sentences.
   - **Untimed Mastery Test:** Untimed quiz (no countdown clock); $\ge 80\%$ confirms mastery.
   - **Lesson Ingestion:** Text paste + slide photo upload box for future Sunday lessons.

3. **`words.html` (10-Word Spaced Repetition Drill):**
   - Strictly caps the display at **10 words** at a time from the master vocabulary (`classes.json` + `quran-core.json` + `everyday.json`).
   - Prioritizes words currently due or marked `weak`/`learning`.
   - Audio toolbar with Normal/Slow and "Play with Pauses" recall mode.
   - 5 explicit rating pills per word: `Strong` (30 days), `Medium` (7 days), `Weak` (2 days), `Learning` (10 mins), `Don't repeat` (retire/never).

4. **`archive/` (Archived Legacy Pages):**
   - Legacy multi-step story players (`story.html`, `stories.html`) and separate word labs (`vocab.html`) are cataloged in `archive/README.md`. All files remain intact in root for backward compatibility.

---

## 3. Data Schemas & Contracts

- **SRS Bucket Storage (`ats-srs` in `localStorage` & Cloudflare KV):**
  - `{ [wordKey]: { box: 0..5, due: timestamp, b: "strong"|"medium"|"weak"|"learning"|"never", u: timestamp } }`
  - `strong`: box 5, 30 days
  - `medium`: box 3, 7 days
  - `weak`: box 1, 2 days
  - `learning`: box 0, 10 minutes
  - `never`: box 5, year 2100 (`NEVER_DUE`)
- **Event Log (`ats-log`):**
  - `chap-test`: `{ e: "chap-test", chap: "chap-1", score: pct, pass: bool, t: Date.now() }`
  - `preply-test`: `{ e: "preply-test", classId: "c-2026-08-30", score: pct, pass: bool, t: Date.now() }`
  - `preply-paste`: `{ e: "preply-paste", text: str, imageCount: num, t: Date.now() }`

---

## 4. How to Ingest a New Preply Lesson on Sunday

1. When Reza pastes text or images in `class.html` or in chat:
2. Update `data/classes.json` with the new class entry (date, title, covered topics, vocabulary, sentences, and reading passage if applicable).
3. If a new reading dialogue is included, store in `data/story-XX.json` and reference in `class.html`.
4. The untimed mastery test in `class.html` automatically derives questions from that class's vocabulary and sentences.
5. Deploy to GitHub Pages: commit and push.

---

## 5. Non-Negotiables for Future Agents

- **Honesty over flattery:** Do not praise superficial completion.
- **Keep it short:** Reza's time is scarce. Under 10 lines of explanation, then the question.
- **Zero backlog dread:** Never show "73 cards due". Keep vocabulary drills to 10 words.
- **Untimed on mastery:** Preply lesson tests must remain untimed.
- **Favourite Qari & Natural Audio:**
  - Qur'an recitation strictly uses **Mishary Rashid Alafasy** (surahs, ayahs, and word-by-word clips).
  - Everyday sentences and vocabulary must use natural pre-generated neural audio (`ar-SA-HamedNeural` and `en-GB-RyanNeural` via `scripts/gen-audio.py`), never robotic browser fallback.
- **Variation-First AI Voice Practice:** AI voice prompts on `index.html` and `class.html` must always list the exact 10 target sentences and instruct ChatGPT/Claude to drill natural variations (swapping nouns, pronouns, numbers, question forms) in short 1-2 sentence conversational turns with full tashkeel.
- **Learner Context Dossier (`LEARNER_CONTEXT.md`):** Keep this markdown dossier up to date with his active vocabulary envelope and pedagogical constraints so external LLM tutors never drift into unknown vocabulary or colloquial dialects.
- **Interaction Telemetry & Telemetry-Driven Coaching:** All user ratings (`vocab-rate`), test questions (`test-item`), and audio plays must be tracked in `ats-log` and synced. When conducting coaching sessions or generating recommendations, ground praise in real milestones and target the exact words/questions failed in recent logs.
