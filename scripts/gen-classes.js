#!/usr/bin/env node
/* THE CLASS REPOSITORY — every lesson she gives, sorted into its categories.
   ============================================================================
   Reza, 2026-08-30:

     "i want you to maintain a repository of lesson material putting into
      category of vocabulary, sentences and anything else (that can be
      grammar/etc) you will have to figure it out from the images i send you and
      you can ask me questions to better understand what was covered in the
      class"

   and, the same day, the rule that makes it useful rather than an archive:

     "when i give a lesson, you can put it into category of vocabulary and
      sentences as well to unify the learning approach. if she gives a whole
      lesson, you can put it in reading section with word by word and audio."

   So a class is never stored as a class. It is DECOMPOSED on arrival into the
   four streams the site already teaches — vocabulary cards, sentences, grammar
   patterns, and a word-by-word reading passage — and this file only assembles a
   VIEW of what went where. The content stays in the files that teach it:

     vocabulary  data/everyday.json    groups tagged `lesson: "<class tag>"`
     sentences   data/prompts.json     prompts tagged `lesson: "<class tag>"`
     reading     data/story-NN.json    `source: "teacher"`, named in the record
     grammar     data/grammar.json     pattern ids named in the record

   Nothing is copied. If a word is edited in everyday.json the repository shows
   the edit; if a word is deleted the repository loses it too. A repository that
   holds its own copy of the material is a repository that quietly goes wrong.

   THE TAG IS THE CONTRACT. A class record names its tags; anything carrying one
   belongs to that class. Members inside a shared group (family is half class,
   half completion) are picked by their own `from` tag, so a class never claims
   words it did not bring.

   Run: node scripts/gen-classes.js   (after any TEACHER-SYNC content drop)
   ============================================================================ */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const meta = D("classes-meta.json");
const ev = D("everyday.json"), prompts = D("prompts.json"), grammar = D("grammar.json");
const curriculum = D("curriculum.json");
let bank = { sentences: [] };
try { bank = D("sentence-bank.json"); } catch (e) {}

const norm = s => String(s).replace(/[\u064B-\u0652\u0670\u0640]/g, "")
  .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627").replace(/\u0649/g, "\u064A")
  .replace(/[^\u0600-\u06FF\s]/g, "").replace(/\s+/g, " ").trim();

/* a sentence's SRS key, so the page can show held/not-held against the same
   record the lessons write to */
const bankByForm = new Map();
bank.sentences.forEach(s => { const f = norm(s.ar); if (!bankByForm.has(f)) bankByForm.set(f, s.key); });

const out = meta.classes.map(c => {
  const tags = new Set(c.tags || []);

  /* ---- VOCABULARY: everyday groups this class brought ----
     A group tagged with the class contributes the members that carry their own
     `from` tag; a group where nobody is tagged contributes everything. That is
     what keeps `family` — six words from her, ten added to complete it — from
     claiming all sixteen as class material while still showing both, labelled. */
  const vocab = [];
  ev.groups.forEach(g => {
    if (!tags.has(g.lesson)) return;
    const tagged = g.members.filter(m => m.from);
    const take = tagged.length ? tagged : g.members;
    take.forEach(m => {
      const i = g.members.indexOf(m);
      vocab.push({
        key: `ev-${g.id}:${i}`, ar: m.ar, en: m.en, tr: m.tr || "", note: m.note || "",
        group: g.id, groupName: g.theme || g.id,
        // "teacher" = out of her mouth. "complete" = added here so the set is
        // usable — his instruction: "add words if necessary to what the teacher
        // gave to make it comprehensive."
        from: m.from || "teacher",
      });
    });
  });

  /* ---- SENTENCES: prompts this class brought, plus the ones written to carry
     its new words. Same two-source distinction, same labelling. ---- */
  const sentences = (prompts.prompts || []).filter(p => tags.has(p.lesson)).map(p => ({
    ar: p.ar, en: p.en, tr: p.tr || "", from: p.source === "class-built" ? "built" : "teacher",
    key: bankByForm.get(norm(p.ar)) || null, keys: p.keys || [],
  }));

  /* ---- READING: the passage, word-by-word and with audio (story.html) ---- */
  let reading = null;
  if (c.reading) {
    try {
      const st = D(c.reading + ".json");
      reading = {
        id: c.reading, titleAr: st.titleAr, titleEn: st.titleEn,
        sentences: (st.sentences || []).length,
        words: (st.sentences || []).reduce((a, s) => a + (s.words || []).length, 0),
        vocab: (st.vocab || []).length,
        questions: (st.questions || []).length,
        keys: (st.vocab || []).map((_, i) => `${c.reading}:${i}`),
      };
    } catch (e) { reading = { id: c.reading, missing: true }; }
  }

  /* ---- GRAMMAR: the patterns, resolved against the ones the site teaches ---- */
  const gram = (c.grammar || []).map(x => {
    const p = (grammar.patterns || []).find(y => y.id === x.pattern);
    return { pattern: x.pattern, why: x.why, name: p ? p.name : null, ar: p ? p.ar : null, missing: !p };
  });

  /* ---- the ladder: which lessons and which test cover this class ---- */
  const ms = (curriculum.milestones || []).find(m => m.id === c.milestone) || null;

  return {
    id: c.id, date: c.date, title: c.title, teacher: c.teacher, covered: c.covered || "",
    milestone: c.milestone || null,
    lessons: ms ? ms.lessons.map(l => ({ id: l.id, title: l.title, keys: (l.keys || []).length })) : [],
    keys: ms ? ms.lessons.flatMap(l => l.keys || []) : [],
    vocabulary: vocab, sentences, grammar: gram, reading,
    notes: c.notes || [],
    questions: c.questions || [],
    counts: {
      vocabulary: vocab.length, fromTeacher: vocab.filter(v => v.from === "teacher").length,
      sentences: sentences.length, grammar: gram.length,
      readingSentences: reading && reading.sentences || 0,
    },
  };
}).sort((a, b) => (a.date < b.date ? 1 : -1));

const missing = out.flatMap(c => c.grammar.filter(g => g.missing).map(g => `${c.id}: no grammar pattern "${g.pattern}"`))
  .concat(out.filter(c => c.reading && c.reading.missing).map(c => `${c.id}: reading ${c.reading.id} not found`));
if (missing.length) { console.error("BROKEN REFERENCES:\n  " + missing.join("\n  ")); process.exit(1); }

fs.writeFileSync(path.join(ROOT, "data", "classes.json"), JSON.stringify({
  version: 1,
  note: "GENERATED by scripts/gen-classes.js from data/classes-meta.json plus the files that actually teach the material. Do not hand-edit — edit the content, or the registry, and re-run.",
  generated: new Date().toISOString().slice(0, 10),
  classes: out,
}, null, 1));

out.forEach(c => console.log(`${c.date} ${c.title}: ${c.counts.vocabulary} words (${c.counts.fromTeacher} hers), ${c.counts.sentences} sentences, ${c.counts.grammar} grammar points, reading ${c.reading ? c.reading.sentences + " sentences" : "none"}, ${c.lessons.length} lessons on the ladder, ${c.questions.length} open questions`));
