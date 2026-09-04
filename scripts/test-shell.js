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

/* ---------- 11. A LESSON IS NOT ONE GROUP ----------
   2026-09-01: the homework contract held 59 keys across FOUR groups, but the 📚
   block built its link from a single `hw.group`, so 33 of the 59 words had no
   route in — while readiness counted all 59, making the bar unreachable. Four
   evenings before her class, 48 of those words had never been shown once. The
   pin that would have caught it: every key the contract counts must belong to a
   part that has a URL. */
{
  console.log("\n-- the homework reaches the WHOLE lesson --");
  const planSrc = fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8");
  const from = planSrc.indexOf("function planHwGid(");
  const to = planSrc.indexOf("function planHwTaskDone(");
  yes(from > 0 && to > from, "plan.js exposes the homework-part derivation");
  const mk = new Function("store", "getSrs",
    planSrc.slice(from, to) + "; return { planHomework, planHwNextPart, planHwGid };");

  const KEYS = []
    .concat(Array.from({ length: 26 }, (_, i) => `ev-lesson-home:${i}`))
    .concat(Array.from({ length: 10 }, (_, i) => `ev-lesson-week:${i}`))
    .concat(Array.from({ length: 5 },  (_, i) => `ev-lesson-divine:${i}`))
    .concat(Array.from({ length: 18 }, (_, i) => `story-07:${i}`));
  const HW = {
    label: "Sunday class", lessonAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    group: "ev-lesson-home", keys: KEYS, tasks: [{ id: "t1", label: "read it" }],
  };
  // his real state on 2026-09-01: lesson-home barely started, everything else untouched
  const SRS = {};
  ["ev-lesson-home:0", "ev-lesson-home:1", "ev-lesson-home:2", "ev-lesson-home:3"].forEach(k => SRS[k] = { box: 5, due: 0 });
  const api = mk({ get: (k, d) => (k === "ats-homework" ? HW : k === "ats-hw-done" ? {} : d) }, () => SRS);
  const hw = api.planHomework();

  yes(hw.parts.length === 4, `${hw.parts.length} parts derived from the keys (expected 4)`);
  const covered = hw.parts.reduce((n, p) => n + p.total, 0);
  yes(covered === hw.keys.length,
    covered === hw.keys.length
      ? `EVERY one of the ${hw.keys.length} keys readiness counts belongs to a part with a route in`
      : `${hw.keys.length - covered} key(s) are counted against him with NO WAY TO REACH THEM`);
  yes(hw.parts.every(p => p.url && p.url.length > 8), "every part has a URL");

  // the block must walk to the part furthest behind — not always the first group
  const next = api.planHwNextPart(hw);
  yes(next.gid === "ev-lesson-home",
    `furthest behind is ${next.gid} (22 of 26 unmet) — the block goes there first`);
  KEYS.filter(k => k.startsWith("ev-lesson-home")).forEach(k => SRS[k] = { box: 3, due: 0 });
  const hw2 = api.planHomework();
  yes(api.planHwNextPart(hw2).gid === "story-07",
    "once that group is solid the block moves ON to the next part, instead of hammering the same one");

  // a story part is NOT an everyday group — the old code would have sent him to vocab.html?ev=story-07
  const story = hw.parts.find(p => p.gid === "story-07");
  yes(/^story\.html\?id=story-07&step=memorize$/.test(story.url), `the passage routes to the story page (${story.url})`);
  // the step name must be one story.html actually knows — an unknown one is not an
  // error, it silently falls back to wherever he left off, which was the LISTEN
  // step: six minutes of tapping words that grade nothing.
  {
    const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
    const stepKeys = (app.match(/const STEPS = \[([\s\S]*?)\];/) || ["", ""])[1].match(/key: "([a-z]+)"/g).map(s => s.slice(6, -1));
    const wanted = story.url.split("step=")[1];
    yes(stepKeys.includes(wanted), `"${wanted}" is a real story step (${stepKeys.join(", ")})`);
    const storySrc = fs.readFileSync(path.join(ROOT, "story.html"), "utf8");
    yes(/currentStep === "memorize"[\s\S]{0,4000}gradeCard/.test(storySrc) || /gradeCard\(`\$\{storyId\}:\$\{i\}`/.test(storySrc),
      "…and it is the step that actually grades the passage's cards");
  }
  yes(story.doneEvs.includes("story-step"), "…and completes on the events that page actually fires");
  const week = hw.parts.find(p => p.gid === "ev-lesson-week");
  yes(week.url.includes("vocab.html?ev=lesson-week"), `the seven days route to their own group (${week.url})`);

  // qw keys split by surah, not into one undifferentiated heap
  yes(api.planHwGid("qw:asr:2:4") === "qw:asr", "a Qur'an word part is the SURAH, not the whole corpus");
  yes(api.planHwGid("ev-lesson-home:12") === "ev-lesson-home", "an everyday key keeps its group");

  // and the block itself must use the part, not hw.group
  yes(/const part = planHwNextPart\(hw\)/.test(planSrc), "the 📚 block asks for the part");
  yes(/url: part \? part\.url/.test(planSrc), "…and links to it");
  yes(/cur\.doneEvs \|\| PLAN_BLOCKS\[cur\.type\]\.done/.test(planSrc),
    "…and completion listens to that part's own events");
  yes(/hw\.parts\.map\(p =>/.test(planSrc), "the lesson strip lists every part, so none is invisible");
}

/* ---------- 13. THE HONEST TRADE ----------
   2026-09-03, Thursday night: 7 of 59 solid, the seven days 0 of 10, three
   evenings to the class. A bar that cannot be reached moves nothing. Close to
   the class and far from ready, the plan must name the ten words that make it
   feel prepared — whole parts, the biggest that fit — send the block THERE, and
   leave the honest overall number exactly as it was. */
{
  console.log("\n-- close to the class, the target becomes the ten that make it feel prepared --");
  const planSrc = fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8");
  const from = planSrc.indexOf("function planHwGid(");
  const to = planSrc.indexOf("function planHwTaskDone(");
  const mk = new Function("store", "getSrs",
    planSrc.slice(from, to) + "; return { planHomework, planHwNextPart };");
  const KEYS = []
    .concat(Array.from({ length: 26 }, (_, i) => `ev-lesson-home:${i}`))
    .concat(Array.from({ length: 10 }, (_, i) => `ev-lesson-week:${i}`))
    .concat(Array.from({ length: 5 },  (_, i) => `ev-lesson-divine:${i}`))
    .concat(Array.from({ length: 18 }, (_, i) => `story-07:${i}`));
  const hwAt = days => ({ label: "Sunday class", lessonAt: new Date(Date.now() + days * 86400000).toISOString(),
    group: "ev-lesson-home", keys: KEYS, tasks: [{ id: "t1", label: "read it" }, { id: "t2", label: "retake" }] });
  // his real 2026-09-03 state: 7 of the flat solid, the other three parts untouched
  const srs = () => { const S = {}; for (let i = 0; i < 7; i++) S[`ev-lesson-home:${i}`] = { box: 3, due: 0 }; return S; };
  const run = (hw, S) => mk({ get: (k, d) => (k === "ats-homework" ? hw : k === "ats-hw-done" ? {} : d) }, () => S);

  let api = run(hwAt(2.5), srs());
  let hw = api.planHomework();
  yes(!!hw.prep, `2.5 days out at ${hw.readiness}% ready, prep mode is ON`);
  yes(hw.prep && hw.prep.gids.join() === "ev-lesson-week",
    `it picks the seven days — the biggest part that fits ten — not the smallest (${hw.prep && hw.prep.gids.join(", ")})`);
  yes(hw.prep && hw.prep.total === 10 && hw.prep.solidN === 0, "…and reads 0 of 10, a number that can move tonight");
  yes(api.planHwNextPart(hw).gid === "ev-lesson-week",
    "the 📚 block goes to the ten, not to the flat's 19-word hole");
  yes(hw.readiness === Math.round(100 * 0.7 * 7 / 59), `the overall readiness is untouched by prep (${hw.readiness}%) — the honest number the coach quotes`);
  yes(hw.parts.filter(p => p.prep).length === 1 && hw.parts.find(p => p.gid === "story-07").prep !== true,
    "only the prep part is flagged; the passage steps back");

  // not close: no prep, the block walks the biggest hole as before
  api = run(hwAt(5), srs());
  hw = api.planHomework();
  yes(!hw.prep, "five days out there is no trade to make — prep stays OFF");
  yes(api.planHwNextPart(hw).gid === "ev-lesson-home", "…and the block still goes to the part furthest behind");

  // close but nearly ready: no prep
  { const S = srs(); KEYS.slice(0, 40).forEach(k => S[k] = { box: 3, due: 0 });
    hw = run(hwAt(2.5), S).planHomework();
    yes(!hw.prep, `at ${hw.readiness}% ready the whole bar is reachable — prep stays OFF`); }

  // the ten are done: prep moves ON to the next part that fits
  { const S = srs(); KEYS.filter(k => k.startsWith("ev-lesson-week")).forEach(k => S[k] = { box: 2, due: 0 });
    hw = run(hwAt(2), S).planHomework();
    yes(hw.prep && hw.prep.gids.join() === "ev-lesson-divine",
      `once the seven days hold, the next ten is the divine attributes (${hw.prep && hw.prep.gids.join(", ")})`);
    yes(hw.parts.find(p => p.gid === "ev-lesson-week").shakyN === 0, "…and the seven days chip shows ✓"); }

  // nothing fits: there is still exactly one target — the smallest part
  { const S = srs(); KEYS.filter(k => /lesson-(week|divine)/.test(k)).forEach(k => S[k] = { box: 2, due: 0 });
    hw = run(hwAt(2), S).planHomework();
    yes(hw.prep && hw.prep.gids.join() === "story-07",
      `when no part fits ten, prep names the smallest one left (${hw.prep && hw.prep.gids.join(", ")}) rather than nothing`); }

  // the surfaces say it
  yes(/Class prep — \$\{part\.label\}/.test(planSrc), "the 📚 block is titled as class prep in prep mode");
  yes(/carry into next week/.test(planSrc), "…and says the rest carries into next week");
  const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  yes(/hw\.prep/.test(home) && /carry into next week/.test(home), "the Sunday's class card — the surface he opens — shows the prep line");
  yes(/p\.prep \? "⭐ "/.test(home), "…and stars the prep chips");
}

/* ---------- 14. THE OFFLINE PACK ----------
   2026-09-03: "the audio didn't work on mobile" + "is it possible that the
   website works offline at least in batches?". Every clip was fetched on demand;
   patchy signal → no clip → the phone's voice, which has no Arabic. The pack
   warms the SAME cache sw.js serves cache-first. The pin that matters: the two
   cache names must be one name — a pack into a cache the worker never reads
   would look like it worked and play nothing. */
{
  console.log("\n-- a quick open packs the clips the week needs --");
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const packName = (app.match(/const PACK_CACHE = "([^"]+)"/) || [])[1];
  const swName = (sw.match(/const AUDIO_CACHE = "([^"]+)"/) || [])[1];
  yes(!!packName && packName === swName, `the pack fills the cache the worker serves (${packName} = ${swName})`);
  yes(/\/audio\//.test(sw) && /caches\.match\(e\.request\)/.test(sw), "…and the worker answers /audio/ from cache first");
  yes(/async function offlinePack\(/.test(app) && /async function packTextsForKeys\(/.test(app), "app.js defines the pack and the key→text resolver");
  yes(/f && !f\.real \? f\.src : null/.test(app), "a real recitation (remote, cross-origin) is never packed");
  yes(/navigator\.onLine/.test(app), "the pack does nothing without a signal instead of erroring");
  const home = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  yes(/await packTextsForKeys\(/.test(home) && /await offlinePack\(texts/.test(home), "the home page packs on open");
  yes(/hwc\.keys/.test(home), "…including every word of the homework contract");
  yes(/Curriculum\.sentencesFor\(\(l\.lesson && l\.lesson\.keys\)/.test(home), "…and the sentences each of this week's lessons will play");
  yes(/id = "packLine"/.test(home), "…and says how many clips are on the phone");
  yes(/offlinePack\(\(obj\.members/.test(fs.readFileSync(path.join(ROOT, "vocab.html"), "utf8")), "a cluster page packs its own set");
  yes(/offlinePack\(\[\]\.concat\(\(story\.vocab/.test(fs.readFileSync(path.join(ROOT, "story.html"), "utf8")), "a story page packs its own lines and words");
  // the resolver must know the everyday / phrase / story key shapes the contract uses
  yes(/\^ev-\(\.\+\):\(\\d\+\)\$/.test(app) && /\^\(story-\\d\+\):/.test(app), "keys the bank never met still resolve through the data files");
}

/* ---------- 15. WHISPER HEARS THE TAKE ----------
   2026-09-04: "can you improve arabic audio recognition?". The browser's ar-SA
   recogniser heard silence more often than words. A take is now recorded and
   transcribed by Whisper on the worker; the browser recogniser is the fallback.
   The pins that matter: the route sits BEHIND the session check, the worker has
   the AI binding it calls, and every existing 🎤 still gets the same callback. */
{
  console.log("\n-- a 🎤 take goes to Whisper, and falls back to the browser --");
  const w = fs.readFileSync(path.join(ROOT, "worker", "src", "index.js"), "utf8");
  const toml = fs.readFileSync(path.join(ROOT, "worker", "wrangler.toml"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  yes(/\[ai\]\s*\r?\nbinding = "AI"/.test(toml), "wrangler.toml binds Workers AI as env.AI");
  yes(/url\.pathname === "\/transcribe" && req\.method === "POST"/.test(w), "the worker has POST /transcribe");
  yes(w.indexOf('url.pathname === "/transcribe"') > w.indexOf("const email = await requireSession(req, env);"), "…behind the session check — nobody else spends the neurons");
  yes(/@cf\/openai\/whisper-large-v3-turbo/.test(w) && /@cf\/openai\/whisper"/.test(w), "…tries turbo, then the base model");
  yes(/AUDIO_MAX/.test(w) && /too-large/.test(w), "…and caps the upload");
  yes(/function dictateWhisper\(/.test(app) && /function whisperReady\(/.test(app), "app.js has the Whisper take");
  yes(/if \(whisperReady\(\)\) return dictateWhisper\(btn, idleLabel, cb(, opts)?\);/.test(app), "dictate() prefers it when it can");
  yes(/typeof getSession === "function" && !!getSession\(\)/.test(app) && /navigator\.onLine/.test(app), "…only with a session and a signal");
  yes(/_whisperDownUntil = Date\.now\(\) \+ 60000/.test(app), "…and backs off to the browser recogniser for a minute when the worker fails");
  yes(/if \(L\.whisper\) \{ L\.finish\("superseded"\); return; \}/.test(app), "stopDictation releases a Whisper take instead of touching a recogniser it never had");
  yes(/cb\(text, url, null, \[text\]\)/.test(app), "the callback contract is unchanged: (heard, url, err, alts)");
  yes(/wReq\("\/transcribe\?lang=ar"/.test(app), "the take is posted through the same session helper the sync uses");
  yes(/L\.mediaRec\.start\(250\)/.test(app) && /getByteTimeDomainData/.test(app), "the take ends itself on quiet, so a short word is not cut off and a long one is not waited on");
  // every caller still passes a 4-slot callback or fewer
  ["learn.html", "speaking.html"].forEach(f => {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8");
    yes(/dictate\(\w+, "[^"]*", \((heard|h)[^)]*\) =>/.test(s), `${f} still calls dictate(btn, label, cb)`);
  });
}

/* ---------- 16. HIS FOUR NOTES OF 2026-09-04 ----------
   19:59 "it sounds like thallaj … is the sound cutting out?" — the first word of
   a test could play before the clip manifest arrived, so the browser voice
   answered and clipped the last syllable; and the primer could pause a clip
   that started right after it. 20:07 "no sound for this one" — a meaning
   question had no 🔊. 20:07 "when i retake test, only test me on low scores".
   20:22 "i want to say it and for you assess as well if i could say it". */
{
  console.log("\n-- the four notes of 4 Sep --");
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  const learn = fs.readFileSync(path.join(ROOT, "learn.html"), "utf8");
  yes(/_audioManLoading\.then\(go, go\)/.test(app) && /function _speakNow\(/.test(app), "speak() waits for the clip manifest before falling to the browser voice");
  yes(/_speakWait\+\+;/.test(app), "…and stopSpeak cancels a waiting speak()");
  yes(/if \(\/\^data:\/\.test\(a\.src\)\) a\.pause\(\);/.test(app), "the primer only ever pauses its own silence, never a clip that started after it");
  yes(/q\.form === "mean"[\s\S]{0,900}id="play">🔊 hear it/.test(learn), "a meaning question has a 🔊");
  yes(/const low = use\.filter\(id => latest\[id\] === undefined \|\| latest\[id\] < Curriculum\.PASS\)/.test(learn), "a retake keeps only the lessons under the pass mark");
  yes(/e\.reported \|\| e\.lessons/.test(learn), "…judged on REPORTED scores, so a sampled class test counts");
  yes(/if \(seen && low\.length && low\.length < use\.length\)/.test(learn), "…and a scope nobody has sat, or where everything passed, still runs in full");
  yes(/retakeNote \? ` <span class="pill">/.test(learn), "…and says so on the test's first screen");
  yes(/function heardVerdictHtml\(/.test(learn) && (learn.match(/heardVerdictHtml\(heard/g) || []).length >= 2, "both spoken routes show what was heard, word by word");
  yes(/wordsHtml\(m, false\)/.test(learn) && /words landed/.test(learn), "…as a coloured verdict with a count");
  yes(/lastTakeModel\(\) === "whisper"/.test(learn) && /function lastTakeModel\(/.test(app), "…only when Whisper heard it; the browser recogniser keeps the honest caveat");
  yes(/\{ pause: String\(target \|\| ""\)\.trim\(\)\.split\(\/\\s\+\/\)\.length >= 3 \? 2200 : 1300 \}/.test(learn), "a sentence gets a longer quiet before the take ends than a word");
  yes(/const PAUSE = Math\.max\(800, Math\.min\(4000/.test(app) && /now - lastVoice > PAUSE/.test(app), "…and the take honours it");
}

/* ---------- 12. ＋Learn lands on the proper card, not a tw: twin ----------
   2026-09-01 evening: he tap-learned seven of Samer's passage words — exactly
   the homework — and every one became a tw: shadow card, so the contract still
   read story-07 "seen 0/18". A page that owns proper cards must register them,
   ＋Learn must use them, and twins made before the mapping existed must be
   adopted onto the real key. */
{
  const seg = appSrc.match(/let _pageWordKeys[\s\S]*?function pageWordKey\(disp\) \{[\s\S]*?\n\}/);
  yes(!!seg, "app.js has the page word-key registry (registerWordKeys / pageWordKey)");
  if (seg) {
    const nrm = new Function(
      appSrc.match(/function stripTashkeel\(s\) \{[\s\S]*?\n\}/)[0] + "\n" +
      appSrc.match(/function normalizeAr\(s\) \{[\s\S]*?\n\}/)[0] + "\nreturn normalizeAr;")();
    const srs = {
      "tw:صاحب": { box: 2, due: 1 },              // exact lemma match — box must carry over
      "tw:واسعة": { box: 0, due: 1 },             // feminine form of the lemma card واسع
      "tw:قلنا": { box: 5, due: 1, b: "know" },   // belongs to another page — untouched
    };
    const logged = [];
    const api = new Function("getSrs", "store", "logEvent", "normalizeAr",
      seg[0] + "\nreturn { registerWordKeys, pageWordKey };")(
      () => srs, { set: () => {} }, e => logged.push(e), nrm);
    const story = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "story-07.json"), "utf8"));
    api.registerWordKeys(Object.fromEntries(story.vocab.map((v, i) => [nrm(v.ar).replace(/^ال/, ""), `story-07:${i}`])));
    yes(!srs["tw:صاحب"] && srs["story-07:13"] && srs["story-07:13"].box === 2,
      "an exact twin is adopted onto its story card, box intact");
    yes(!srs["tw:واسعة"] && !!srs["story-07:10"],
      "a feminine form (واسعة) folds onto its lemma's card (واسع)");
    yes(!!srs["tw:قلنا"], "a twin from some other page is left alone");
    yes(api.pageWordKey("المُرِيحَة") === "story-07:11",
      "＋Learn on an ال-prefixed, vowelled feminine form resolves to the proper key");
    yes(logged.some(e => e.e === "tw-adopt"), "the adoption is logged, so the coach can see it happened");
  }
  const storySrc12 = fs.readFileSync(path.join(ROOT, "story.html"), "utf8");
  yes(/registerWordKeys\(/.test(storySrc12), "story.html registers its vocab keys on load");
  yes(/_wordKeyFor\(norm\)/.test(appSrc), "the 3-tap seed (noteWordTap) consults the registry too");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
