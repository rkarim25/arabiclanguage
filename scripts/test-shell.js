/* The shell — the service worker, the class repository, and the ⊘ that keeps a
   word out of the schedule.
   ============================================================================
   Why this file exists, 2026-08-30:

   sw.js had a MISSING COMMA — "data/story-06.json" "data/story-07.json" — which
   is a JavaScript SyntaxError, so the service worker never parsed, never
   installed, and never updated. His browser kept serving the previous worker's
   cached HTML: he was doing the OLD lesson UI and the OLD test flow days after
   both were replaced, and reporting bugs against pages that no longer existed in
   the repo. Two of the last three "bugs" he reported were that.

   It cost a day. Nothing in the health check caught it, because nothing ever ran
   the service worker through a parser or checked that the files it promises to
   cache exist — and cache.addAll() rejects the WHOLE install if even one URL
   404s, so a typo'd filename breaks offline just as completely as a syntax error.

   Run: node scripts/test-shell.js
   ============================================================================ */
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
let fails = 0;
const ok = m => console.log("  ✓ " + m);
const bad = m => { console.log("  ✗ " + m); fails++; };
const yes = (c, m) => (c ? ok(m) : bad(m));

/* ---------- 1. the service worker parses ---------- */
const swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
let swOk = true, swErr = "";
try { new Function(swSrc); } catch (e) { swOk = false; swErr = e.message; }
yes(swOk, swOk ? "sw.js parses" : `sw.js DOES NOT PARSE — ${swErr}`);

/* ---------- 2. everything it promises to cache exists ---------- */
const m = swSrc.match(/const CORE = \[([\s\S]*?)\];/);
yes(!!m, "sw.js declares a CORE list");
if (m) {
  const files = m[1].match(/"([^"]+)"/g).map(s => s.slice(1, -1));
  const missing = files.filter(f => !fs.existsSync(path.join(ROOT, f)));
  yes(!missing.length, missing.length
    ? `${missing.length} CORE file(s) do not exist — cache.addAll would reject the whole install: ${missing.join(", ")}`
    : `all ${files.length} CORE files exist`);
  // the pages he actually uses must be offline-capable
  ["index.html", "learn.html", "sentences.html", "class.html", "story.html"].forEach(p =>
    yes(files.includes(p), `${p} is cached for the commute`));
  ["data/curriculum.json", "data/sentence-bank.json", "data/frequency.json", "data/classes.json"].forEach(p =>
    yes(files.includes(p), `${p} is cached for the commute`));
}

/* ---------- 3. the cache name is stamped, so a deploy invalidates ---------- */
const stamp = (fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/\?v=([a-z0-9]+)/) || [])[1];
yes(!!stamp, `the build stamp is ${stamp}`);
yes(swSrc.includes(`"ats-${stamp}"`), "the service worker's cache name carries this build's stamp");
const appSrc = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
yes(new RegExp(`DATA_V = "${stamp}"`).test(appSrc), "data/*.json requests carry this build's stamp too");

/* ---------- 4. the class repository resolves ---------- */
const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
const classes = D("classes.json"), ev = D("everyday.json"), grammar = D("grammar.json"), cur = D("curriculum.json");
const evKeys = new Set(ev.groups.flatMap(g => g.members.map((_, i) => `ev-${g.id}:${i}`)));
const lessonIds = new Set((cur.milestones || []).flatMap(ms => (ms.lessons || []).map(l => l.id)));
const pats = new Set(grammar.patterns.map(p => p.id));

yes(classes.classes.length > 0, `${classes.classes.length} class(es) on record`);
classes.classes.forEach(c => {
  yes(c.vocabulary.length > 0, `${c.id}: ${c.vocabulary.length} vocabulary cards`);
  yes(c.vocabulary.every(v => evKeys.has(v.key)),
    `${c.id}: every vocabulary row points at a card that exists`);
  yes(c.sentences.length > 0, `${c.id}: ${c.sentences.length} sentences`);
  yes(c.grammar.every(g => pats.has(g.pattern)),
    `${c.id}: every grammar point resolves to a pattern the site teaches`);
  yes(!!c.reading && !c.reading.missing, `${c.id}: the reading passage exists`);
  yes(c.lessons.length > 0 && c.lessons.every(l => lessonIds.has(l.id)),
    `${c.id}: all ${c.lessons.length} of its lessons are on the ladder, so the class test can be built`);
  // the repository must never hold its own copy of the material
  yes(c.vocabulary.every(v => {
    const [gid, i] = v.key.replace(/^ev-/, "").split(":");
    const g = ev.groups.find(x => x.id === gid);
    return g && g.members[+i] && g.members[+i].ar === v.ar;
  }), `${c.id}: every row is the LIVE card, not a copy that can drift`);
});

/* ---------- 5. ⊘ actually keeps a word out of everything ---------- */
const C = require(path.join(ROOT, "js", "curriculum.js"));
const bank = D("sentence-bank.json");
{
  const c = classes.classes[0];
  const key = c.vocabulary[0].key;
  const base = { bank, curriculum: cur, srs: {}, log: [], now: Date.now() };
  const before = C.sentencesFor([key], base, { limit: 3 });
  const retired = Object.assign({}, base, { srs: { [key]: { box: 5, b: "never", due: 4102444800000 } } });
  const after = C.sentencesFor([key], retired, { limit: 3 });
  yes(before.length > 0, "a live word is taught in sentences");
  yes(after.length === 0, "a ⊘ word is not taught at all");

  const lesson = (cur.milestones.find(ms => ms.id === c.milestone) || {}).lessons[0];
  const exBefore = C.examForLessons([lesson.id], base, { attempt: 1 });
  const rk = lesson.keys[0];
  const exAfter = C.examForLessons([lesson.id], Object.assign({}, base,
    { srs: { [rk]: { box: 5, b: "never", due: 4102444800000 } } }), { attempt: 1 });
  yes(exBefore.items.some(i => i.key === rk), "a live word is asked in the test");
  yes(!exAfter.items.some(i => i.key === rk), "a ⊘ word is never asked in the test");

  const weak = C.weakWords(Object.assign({}, base,
    { srs: { [rk]: { box: 5, b: "never", due: 0 } } }), 50);
  yes(!weak.some(w => w.key === rk), "a ⊘ word is not counted as weak");
}

/* ---------- 6. the interleaved bursts ---------- */
{
  const freq = D("frequency.json"), lexicon = D("lexicon.json");
  const ctx = { bank, curriculum: cur, freq, lexicon, srs: {}, log: [], now: Date.now() };
  const words = C.vocabBurst(ctx, {});
  yes(words.length === C.BURST_WORDS, `a vocabulary burst is ${words.length} words`);
  yes(words.every(w => w.per10k > 0), "every burst word has a measured probability of use");
  const sorted = words.every((w, i) => i === 0 || words[i - 1].per10k >= w.per10k);
  yes(sorted, "they are ordered by probability of use, commonest first");
  yes(words.every(w => w.example), "every burst word comes with a real sentence to meet it in");
  yes(words.every(w => w.key && w.keys.length), "every burst word is a real card, so the burst is graded");
  /* A burst must show the CURATED gloss. The bank's own words carry whatever
     gloss their source used, and for Qur'anic tokens that is contextual —
     فِي came through as "(will be) in" and أَنَا۠ with a superscript alif. */
  yes(words.every(w => w.curated), "every burst word has a curated dictionary gloss, not a contextual one");
  yes(words.every(w => w.en && w.en.length <= 60), "every gloss is short enough to read on a row");
  yes(C.vocabBurst({ bank, curriculum: cur, freq, srs: {}, log: [], now: Date.now() }, {}).length === 0,
    "with no dictionary loaded the burst offers nothing rather than contextual glosses");
  const ladder = new Set((cur.milestones || []).flatMap(ms => (ms.lessons || []).flatMap(l => l.keys || [])));
  yes(words.every(w => !w.keys.some(k => ladder.has(k))),
    "a burst never teaches a word the ladder already owns — it is additive or it is nothing");

  // held words are never re-taught
  const first = words[0];
  const heldCtx = { bank, curriculum: cur, freq, log: [], now: Date.now(),
    srs: { [first.key]: { box: 4, due: Date.now() + 1e9 } } };
  yes(!C.vocabBurst(heldCtx, {}).some(w => w.key === first.key), "a word he already holds is not in the burst");
  const offCtx = { bank, curriculum: cur, freq, log: [], now: Date.now(),
    srs: { [first.key]: { box: 5, b: "never", due: 4102444800000 } } };
  yes(!C.vocabBurst(offCtx, {}).some(w => w.key === first.key), "a ⊘ word is not in the burst either");

  const pat = C.grammarBurst(ctx, {});
  yes(!!pat && pats.has(pat), `the grammar burst picks a real pattern (${pat})`);
  const reach = bank.sentences.filter(s => s.pattern === pat).length;
  const widest = Math.max(...[...pats].map(p => bank.sentences.filter(s => s.pattern === p).length));
  yes(reach === widest, `it picks the widest-reaching unseen rule (${reach} sentences)`);
  const seenCtx = Object.assign({}, ctx, { log: [{ e: "pattern-seen", pattern: pat }] });
  yes(C.grammarBurst(seenCtx, {}) !== pat, "a rule already explained is never explained again");

  const state = C.milestoneState(ctx);
  const week = C.weekPlan(ctx, state)[0];
  const bursts = C.burstsFor(week, ctx);
  yes(bursts.length <= 2, `a week gets at most one of each (${bursts.length} here)`);
  yes(bursts.every(b => b.at > 0 && b.at <= week.lessons.length),
    "a burst sits BETWEEN lessons, never before the week starts");
  yes(bursts.every(b => b.mins <= 4), "no burst is longer than four minutes — the week is still sentences");
}

/* ---------- 7. a level's bill is measured against the WHOLE deck ---------- */
{
  /* It used to count only cards already in his SRS, so "80% of the greeting,
     introducing and asking decks" read as "0 / 1 cards solid" after he had seen
     one card — and the level could have been earned by holding a single word.
     He asked on 2026-08-30 whether the numbers on the progress page were real.
     This one was not. */
  const verses = D("verses.json");
  const one = { bank, curriculum: cur, verses, log: [], now: Date.now(),
                srs: { "ph-greet:0": { box: 5, due: 0 } } };
  const L = C.levels(one);
  const conv = L.conv && L.conv.next;
  yes(!!conv, "the conversation track has a next level to reach");
  if (conv) {
    const deck = conv.criteria.find(c => c.type === "srsSolid");
    yes(!!deck && deck.need > 10,
      "a deck criterion counts the whole deck, not just the part he has met (needs " + (deck ? deck.need : "?") + ")");
    yes(!!deck && deck.have === 1, "and counts only the cards he actually holds");
    yes(!!deck && !deck.met, "one solid card out of a whole deck does not earn the level");
  }
}

/* ---------- 8. every exam counts as its own exam ---------- */
{
  /* examResults grouped by e.n, the WEEK number, which the exam engine stopped
     stamping when tests became scope-based. Three real exams at 95, 100 and 100
     collapsed into one bucket keyed `undefined`, so "average of your last 2
     exams" reported "not enough exams yet" and both A1 levels were held hostage
     by a criterion that could never be met. Found by the gap hunt, 2026-08-30. */
  const log = [
    { e: "exam-done", score: 95, scope: "a", t: 1 },
    { e: "exam-done", score: 100, scope: "b", t: 2 },
    { e: "exam-done", score: 100, scope: "c", t: 3 },
  ];
  yes(C.examResults(log).length === 3, "three tests of different scopes count as three exams");
  const retaken = log.concat([{ e: "exam-done", score: 40, scope: "a", t: 4 }]);
  const r = C.examResults(retaken);
  yes(r.length === 3, "retaking one of them does not add a fourth");
  yes(r.some(x => x.scope === "a" && x.score === 40), "…and the retake replaces the earlier attempt");
  const legacy = [{ e: "exam-done", score: 70, n: 1, t: 1 }, { e: "exam-done", score: 80, n: 2, t: 2 }];
  yes(C.examResults(legacy).length === 2, "old week-stamped exams still count separately");
}

/* ---------- the coach's week must survive the self-seeder announcing first ----------
   weekOf() can self-seed and announce week N before loadCoach() has fetched
   coach:<email>. The coach week then wins the hero but NOT the history, so
   carry-over and the exam scope would run off a week he was never shown.
   weekAnnounce() lets a coach-set week supersede a self-seeded record of the
   same number exactly once. Tested against the real weekHistory() replay. */
{
  const CC = require(path.join(ROOT, "js", "curriculum.js"));
  const appSrc = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  const mm = appSrc.match(/function weekAnnounce\(week\) \{[\s\S]*?\n\}/);
  yes(!!mm, "app.js still defines weekAnnounce");

  let LOG = [], tick = 0;
  const fakeStore = { get: (k, d) => (k === "ats-log" ? LOG : d) };
  const fakeLog = e => LOG.push(Object.assign({ t: ++tick }, e));
  const announce = new Function("store", "logEvent", "Curriculum",
    mm[0] + "\nreturn weekAnnounce;")(fakeStore, fakeLog, CC);

  const objs = ks => [{ id: "o", title: "o", keys: ks }];
  const selfWeek = { n: 2, title: "Week 2", from: "2026-08-31", to: "2026-09-06", objectives: objs(["a"]) };
  const coachWeek = { n: 2, title: "Her flat, her week", from: "2026-08-31", to: "2026-09-06", source: "coach", objectives: objs(["b"]) };

  announce(selfWeek);
  yes(LOG.length === 1, "the self-seeder announces week 2");
  announce(selfWeek);
  yes(LOG.length === 1, "...and does not announce it twice");

  announce(coachWeek);
  yes(LOG.length === 2, "a coach-set week SUPERSEDES the self-seeded record of the same number");
  const h2 = CC.weekHistory(LOG).filter(w => w.n === 2);
  yes(h2.length === 1, "...history still has exactly one week 2, not two");
  yes(h2[0].title === "Her flat, her week", "...and it is the coach's week that survives the replay");

  announce(coachWeek);
  yes(LOG.length === 2, "...and the coach week does not re-announce on every page load");

  LOG = [];
  announce(coachWeek);
  announce({ n: 2, source: "coach", selfSeeded: true, from: "2026-08-31", to: "2026-09-06", objectives: objs(["c"]) });
  yes(LOG.length === 1, "a REBUILT self-seeded week labelled source:coach cannot supersede the real one");
}


/* ---------- 9. THE STUMBLE: three levels, and the middle one holds ----------
   His pen note, 2026-08-31: "when i say i said it, i should be able to say how
   accurate i got it. making it binary might not be the best thing."

   Two things are pinned here, because both were free to regress silently:
   (a) gradeCard("hard") must HOLD the box and pull the card back to tomorrow.
       A stumble that advanced the box would be the old lie with a nicer label,
       and a stumble that reset to box 0 would throw away real knowledge.
   (b) the spoken self-grade must LOG. Before today nothing on the lesson page
       recorded that he had spoken at all, which is why every gap hunt read his
       speaking as zero — and story.html's speak-self had been logged for weeks
       and counted by nothing at all. */
{
  console.log("\n-- the spoken self-grade --");
  const learn = fs.readFileSync(path.join(ROOT, "learn.html"), "utf8");

  // (a) gradeCard, run for real out of app.js
  const gcSrc = (appSrc.match(/function gradeCard\(key, grade\) \{[\s\S]*?\n\}/) || [])[0];
  yes(!!gcSrc, "gradeCard is extractable from app.js");
  if (gcSrc) {
    const DAY = 86400000, BOX_DAYS = [0, 1, 3, 7, 14, 30];
    let SRS = {};
    const store = { get: () => SRS, set: (k, v) => { SRS = v; } };
    const gradeCard = new Function("getSrs", "store", "BOX_DAYS", "DAY",
      gcSrc + "; return gradeCard;")(() => SRS, store, BOX_DAYS, DAY);

    const at = (box, dueDays) => { SRS = { k: { box, due: Date.now() + dueDays * DAY } }; };
    const box = () => SRS.k.box, dueInDays = () => (SRS.k.due - Date.now()) / DAY;

    at(3, 7); gradeCard("k", "good");
    yes(box() === 4, "a clean answer advances the box (3 → 4)");

    at(3, 7); gradeCard("k", "again");
    yes(box() === 0 && dueInDays() < 0.02, "a miss resets to box 0 and comes back in minutes");

    at(3, 7); gradeCard("k", "hard");
    yes(box() === 3, "A STUMBLE HOLDS THE BOX — it is not a pass");
    yes(Math.abs(dueInDays() - 1) < 0.02, "...and brings the card back tomorrow, not in a week");

    at(5, 30); gradeCard("k", "hard");
    yes(box() === 5 && Math.abs(dueInDays() - 1) < 0.02,
      "...a stumble on a box-5 word pulls it back without demoting what he knows");

    // a retired word stays retired unless he actually MISSES it
    SRS = { k: { box: 5, due: 0, b: "never" } };
    gradeCard("k", "hard");
    yes(SRS.k.b === "never", "a stumble does not un-retire a ⊘ word (only a real miss does)");
  }

  // (b) three levels, wired, logged — and the binary gone
  yes(/SELF_GRADES\s*=\s*\[/.test(learn), "learn.html declares the three self-grade levels");
  ["clean", "stumble", "no"].forEach(id =>
    yes(new RegExp(`id: "${id}"`).test(learn), `...the "${id}" level exists`));
  yes(/id: "stumble"[\s\S]{0,60}grade: "hard"/.test(learn),
    "...and the stumble is the one that grades \"hard\"");
  yes(!/id="micYes"/.test(learn) && !/id="bYes"/.test(learn),
    "no binary ✓/✗ pair survives on any spoken-answer route in learn.html");
  yes(/logEvent\(\{ e: "speak-self"/.test(learn),
    "a self-marked spoken answer is LOGGED — the lesson page recorded nothing before");

  // (c) and the thing that logs it is actually counted
  const pm = fs.readFileSync(path.join(ROOT, "js", "progress-model.js"), "utf8");
  const plan = fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8");
  yes(/"speak-self"/.test(pm), "progress-model counts speak-self toward spoken output");
  yes(/"speak-self"/.test(plan), "the day plan counts speak-self in the practice mix");
  yes(/"speak-self"/.test(appSrc), "the milestone ladder counts speak-self as a spoken attempt");
  ["speaking.html", "story.html"].forEach(f => {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    yes(/level: "stumble"|said\("stumble"/.test(src), `${f} offers the stumble too`);
  });
}

/* ---------- 10. TWO SPEEDS ----------
   "maybe i can do do 2 speeds of listening to all audios." One switch that every
   call to speak() obeys. Normal must be a multiplier of exactly 1, or today's
   audio changes for a man who never asked for it to. */
{
  console.log("\n-- two listening speeds --");
  yes(/const SPEAK_SLOW = 0\.75;/.test(appSrc), "app.js defines the slow speed");
  yes(/function _speedMul\(\)/.test(appSrc), "…and one multiplier every player asks");
  const mul = new Function("store",
    (appSrc.match(/const SPEAK_SLOW[\s\S]*?\nfunction _speedMul\(\) \{[^}]*\}/) || [""])[0] +
    "; return _speedMul;");
  const normal = mul({ get: (k, d) => d });
  yes(normal() === 1, "NORMAL IS EXACTLY 1 — nothing changes until he asks for slow");
  const slow = mul({ get: () => "slow" });
  yes(slow() === 0.75, "slow is 0.75");
  // every place a rate is finally consumed must go through it
  // every place a rate is finally set: through the switch, or through `pr`,
  // which is the one variable that already carries it
  const consumers = appSrc.match(/playbackRate = [^;]+;|u\.rate = [^;]+;/g) || [];
  yes(consumers.length >= 5, `${consumers.length} places set a playback rate`);
  const deaf = consumers.filter(c => !c.includes("_speedMul()") && !/= pr;/.test(c));
  yes(deaf.length === 0,
    deaf.length ? `a player ignores the switch and would stay fast: ${deaf.join(" ")}`
                : "EVERY player applies the switch — including the qari and the word-by-word clips");
  yes(/speedToggleHtml\(\)/.test(fs.readFileSync(path.join(ROOT, "learn.html"), "utf8")),
    "the switch is on the lesson page, where he wrote the note");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
