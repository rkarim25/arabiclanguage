# Archived Pages & Legacy Engines

This folder documents pages, engines, and features that were simplified during the 2026-09 architectural rebuild.

The site was streamlined to eliminate clicking fatigue and decision overload, centering on:
1. **`index.html` (Daily Book Reader):** 10 high-frequency sentences + Qur'an by ear + conditional grammar + AI conversation voice prompt + 5-min chapter test.
2. **`class.html` (Preply Teacher Lessons):** Sunday classes (starting with 30 Aug *Samer* lesson) with audio, word-by-word hover, class vocab/sentences, and an untimed mastery test.
3. **`words.html` (10-Word Vocab Drill):** Strict 10-word table from master vocabulary with audio (continuous/pauses) and 5 rating pills (`Strong`, `Medium`, `Weak`, `Learning`, `Don't repeat`).
4. **`map.html` (Progress):** Milestone-based capability ladder.

---

## Catalog of Archived / Superseded Engines

| File | Original Purpose | Why It Was Superseded | How to Revive / Use |
|---|---|---|---|
| `stories.html` / `story.html` | Narrative story reader (Stories 1–7) with multi-step steps (listen, read word-by-word, quiz). | Stories contained low-frequency narrative filler ("he said", "then", "suddenly"). Real teacher passages (like Samer in `story-07`) are now embedded directly inside `class.html` with audio and word-by-word hover. | Can be opened directly at `story.html?id=story-01` or linked from `class.html`. |
| `grammar.html` | Standalone grid of 20+ grammar pattern cards and drills. | Learning grammar in isolation caused friction and fatigue. Grammar is now taught strictly *on a need basis* inside the Daily Reader (`index.html`) and Preply lessons (`class.html`) as concise 2-point insight notes. | Accessible directly via URL `grammar.html` or referenced in `class.html`. |
| `sentences.html` | Interactive verb frame conjugation engine (verb × person × tense). | Replaced by the 10 High-Frequency Sentences in `index.html` which include audio with pauses. | Accessible directly via URL `sentences.html`. |
| `vocab.html` | The old multi-tab Vocab Lab (flashcards, sheets, drills). | Flashcards and long lists triggered due-backlog dread. Replaced by `words.html` (strict 10 words at a time + 5 rating pills). | Accessible via `vocab.html`. |
| `placement.html` | Audio multiple-choice placement exam. | Diagnostic tool used during initial calibration. | Accessible via `placement.html`. |
| `keyboard.html` | Interactive phonetic and on-screen Arabic keyboard guide. | Typing was de-prioritized as Reza's primary goals are Qur'an by ear and spoken conversation. | Accessible via `keyboard.html`. |
| `converse.html` | AI scenario selector and oral exam briefing copy-paste tool. | Integrated directly into `index.html` as the 1-click "📋 Copy Prompt for AI Voice" card. | Accessible via `converse.html`. |

---

## Instructions for Future AI Agents
If the learner asks to restore any of the above tools:
1. All files remain in the root directory for backwards compatibility and static asset serving.
2. The data dependencies (`data/grammar.json`, `data/sentences.json`, `data/everyday.json`, `data/story-*.json`) are fully preserved in `data/`.
3. To add an archived page back to the navigation, update `renderNav(active)` in `js/app.js`.
