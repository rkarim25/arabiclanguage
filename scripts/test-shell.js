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
  const cls = fs.readFileSync(path.join(ROOT, "class.html"), "utf8");
  yes(/hw\.prep/.test(cls) && /carry into next week/.test(cls), "the Sunday's class card — the surface he opens — shows the prep line");
  yes(/p\.prep \? "⭐ "/.test(cls), "…and stars the prep chips");
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
  yes(/wReq\("\/transcribe\?lang=" \+ LANG/.test(app), "the take is posted through the same session helper the sync uses");
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

/* ---------- 17. SYNC IS FIRST, AND BESIDE HOME ----------
   2026-09-04: "there is lots of circular pages in more. make the sync button
   prominent at the start and next to Home tab." */
{
  console.log("\n-- sync is first on More, and beside Home in the nav --");
  const more = fs.readFileSync(path.join(ROOT, "more.html"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  yes(more.indexOf('id="syncCard"') > 0 && more.indexOf('id="syncCard"') < more.indexOf("<h2>The two ways in</h2>"), "the sync card is the FIRST card on More");
  yes((more.match(/id="syncCard"/g) || []).length === 1, "…and there is exactly one of it");
  yes(/href="index\.html">(?:📖\s*)?Home<\/a>\s*<a class="link" id="navSync" href="more\.html#syncCard"/.test(app), "the ☁ pill sits right after Home in the nav");
  yes(/wireNavSync\(el\.querySelector\("#navSync"\)\)/.test(app) && /function wireNavSync\(/.test(app), "…and is wired on every page that renders the nav");
  yes(/a\.textContent = "☁ Sign in"/.test(app) && /a\.textContent = "☁ Sync"/.test(app), "…reading Sign in when signed out and Sync when signed in");
  yes(/autoSync\(true\)/.test(app.slice(app.indexOf("function wireNavSync"), app.indexOf("function wireNavSync") + 1500)) && !/ev\.preventDefault\(\)/.test(app.slice(app.indexOf("function wireNavSync"), app.indexOf("function wireNavSync") + 1500)), "…and a tap syncs on the way AND still opens the hub (12 Oct: more/map/learn were unreachable while signed in)");
}

/* ---------- 18. THE PLAN BAR STAYS OFF THE READING PAGES ----------
   2026-09-04: "i see the daily review at the progress page. that is a bit
   confusing." The bar was the day plan, not the page; it now says so and stays
   off Progress, More, Lessons and the placement test. */
{
  console.log("\n-- the plan bar names itself and keeps off the reading pages --");
  const plan = fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8");
  const css = fs.readFileSync(path.join(ROOT, "css", "style.css"), "utf8");
  const quiet = (plan.match(/const PLAN_BAR_QUIET = \[([^\]]+)\]/) || ["", ""])[1];
  yes(/"map\.html"/.test(quiet) && /"more\.html"/.test(quiet), `Progress and More get no plan bar (${quiet.trim()})`);
  yes(/if \(PLAN_BAR_QUIET\.includes\(page\)\) return;/.test(plan), "…enforced in planMountBar");
  yes(/class="pb-today"/.test(plan) && /\.pb-today \{/.test(css), "…and where it does appear, it is labelled Today");
  ["learn.html", "vocab.html", "sentences.html"].forEach(f => yes(!quiet.includes(f), `${f} keeps the bar — it is a doing page`));
}

/* ---------- 19. SAY THE MEANING ----------
   2026-09-04: "i want to be able to say the english words in what does it mean
   as well to make it quicker to go through." */
{
  console.log("\n-- a meaning question can be answered out loud, in English --");
  const app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");
  const learn = fs.readFileSync(path.join(ROOT, "learn.html"), "utf8");
  yes(/const LANG = \(opts && opts\.lang\) === "en" \? "en" : "ar";/.test(app) && /"\/transcribe\?lang=" \+ LANG/.test(app), "a take can be transcribed as English");
  yes(/rec\.lang = \(opts && opts\.lang\) === "en" \? "en-GB" : "ar-SA";/.test(app), "…and the browser-recogniser fallback follows the same language");
  yes(/id="\$\{id\}Mic" title="say the meaning in English">🎤 say it/.test(learn), "the meaning panel has a 🎤");
  yes(/\{ lang: "en", pause: 1000 \}/.test(learn), "…which dictates in English");
  yes(/inp\.value = String\(heard\)\.trim\(\)\.replace\(\/\[\.!\?،,\]\+\$\/g, ""\)\.trim\(\);\s*\n\s*micMsg\.textContent[^\n]*\n\s*chk\.click\(\);/.test(learn), "…drops the words into the box and runs the SAME check as a typed answer");
  const w = fs.readFileSync(path.join(ROOT, "worker", "src", "index.js"), "utf8");
  yes(/\^\[a-z\]\{2\}\$/.test(w), "the worker accepts a two-letter language hint");
}

/* ---------- 20. REPEAT FROM THE VERDICT ----------
   2026-09-05, from the Whisper verdict in a lesson: "give me the option to
   repeat it here". A second take must be one tap away, and must not grade. */
{
  console.log("\n-- the spoken verdict offers another take --");
  const learn = fs.readFileSync(path.join(ROOT, "learn.html"), "utf8");
  yes(/id="pmicRetry">🎤 say it again/.test(learn), "the lesson verdict has 🎤 say it again");
  yes(/getElementById\("pmicRetry"\)\.onclick = \(\) => produce\(s\);/.test(learn), "…which re-runs the production step, so nothing is graded until he chooses");
  yes(/id="pmicHear">🔊 hear it/.test(learn), "…and 🔊 hear it beside it");
  yes(/id="micRetry">🎤 try again/.test(learn), "the test verdict still has its own try-again");
}

/* ---------- 21. A SENTENCE HE REPEATS IS SHORT AND CONSTRUCTED ----------
   2026-09-05: a lesson asked him to repeat a 13-word passage line. Practice
   sentences are now built (≤7 words, one frame, core words) and the picker never
   hands a lesson a long one. */
{
  console.log("\n-- practice sentences are short, constructed, and cover the class --");
  const C = require(path.join(ROOT, "js", "curriculum.js"));
  const D = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));
  const bank = D("sentence-bank.json"), prompts = D("prompts.json");
  const core = prompts.prompts.filter(p => p.source === "core");
  yes(core.length >= 30, `${core.length} constructed core sentences exist`);
  yes(core.every(p => p.ar.split(/\s+/).length <= 7), "…every one is 7 words or fewer");
  yes(core.every(p => p.pattern && p.keys && p.keys.length), "…every one names its frame and the cards it teaches");
  const frames = new Set(core.map(p => p.pattern));
  yes(frames.size >= 8, `…across ${frames.size} grammar frames`);
  const gids = new Set(D("grammar.json").patterns.map(p => p.id));
  yes([...frames].every(f => gids.has(f)), "…each a real pattern in grammar.json");
  // the bank carries them with their frame
  const inBank = bank.sentences.filter(s => s.src === "prompts" && core.some(p => p.ar.replace(/[.؟?!،,]/g, "").trim() === s.ar.replace(/[.؟?!،,]/g, "").trim()));
  yes(inBank.length >= core.length - 2, `the bank carries them (${inBank.length} of ${core.length})`);
  yes(inBank.every(s => s.pattern), "…with the declared frame, not a guess");
  // the picker never hands a lesson a long sentence, and every class word has a short one
  const ev = D("everyday.json").groups, s7 = D("story-07.json");
  const keys = [];
  for (const gid of ["lesson-home", "lesson-week", "lesson-divine"]) ev.find(g => g.id === gid).members.forEach((m, i) => keys.push("ev-" + gid + ":" + i));
  s7.vocab.forEach((v, i) => keys.push("story-07:" + i));
  const ctx = { curriculum: D("curriculum.json"), verses: D("verses.json"), bank, log: [], srs: {}, progress: {}, now: Date.now() };
  const picked = C.sentencesFor(keys, ctx, { limit: 40, maxWords: 999 });
  yes(picked.length > 0 && picked.every(s => (s.words || []).length <= C.PRACTICE_MAX), `sentencesFor hands out only sentences of ≤${C.PRACTICE_MAX} words (${picked.length} picked, longest ${Math.max(...picked.map(s => (s.words || []).length))})`);
  const short = new Set(bank.sentences.filter(s => (s.words || []).length <= 7).flatMap(s => s.teaches || []));
  const missing = keys.filter(k => !short.has(k));
  yes(missing.length === 0, missing.length ? `${missing.length} class word(s) have NO short sentence: ${missing.join(", ")}` : "every one of the 59 class words has a short sentence to practise in");
}

/* ---------- 22. A BUCKETED ROW IS AN ANSWERED ROW ON THE FILL SHEET ----------
   2026-09-05, his note from vocab.html?ev=lesson-home&mode=fill after an 0/18:
   "when i mark words got it, it means i got it, i dont need to write it on this
   page. the scoring isnt right as i marked them." ✓ Check must never grade an
   empty box "again" when he has marked the word by hand. */
{
  console.log("\n-- fill sheet: a bucket mark is the answer --");
  const vocab = fs.readFileSync(path.join(ROOT, "vocab.html"), "utf8");
  yes(/const marked = new Map\(\); \/\/ row index → bucket id chosen on THIS visit/.test(vocab),
    "the fill sheet tracks which rows he buckets during the visit");
  yes(/mountBucketBar\(tr\.querySelector\("\.bucket-slot"\), `\$\{prefix\}\$\{obj\.id\}:\$\{i\}`, b => marked\.set\(i, b\)\)/.test(vocab),
    "…wired through the bucket bar's onSet");
  yes(/const claimed = marked\.has\(i\) \|\| \(!typed && \(bucketOf\(key\) === "know" \|\| bucketOf\(key\) === "never"\)\)/.test(vocab),
    "a row marked tonight, or already held as ✓/⊘ with an empty box, is claimed — not graded");
  const claimedBlock = vocab.match(/if \(claimed\) \{[\s\S]*?\n      \}/);
  yes(!!claimedBlock && !/gradeCard/.test(claimedBlock[0]) && !/logEvent\(\{ e: "fill"/.test(claimedBlock[0]),
    "…and a claimed row is never gradeCard'd or logged as a wrong fill");
  yes(/Marked by hand — your ✓ and ↻ buckets carry these words\./.test(vocab),
    "an all-marked sheet says so instead of Score: 0");
  yes(/marked: selfMarked/.test(vocab), "fill-done reports how many rows were self-marked");
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

/* -- the one door (12 Oct): one button that navigates, a visible hand-over, the bigger picture --
   The day plan's card had been orphaned (no #planCard anywhere) and the bar never mounted. */
{
  console.log("\n-- the one door --");
  const planSrc = fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8");
  const indexSrc = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  yes(/id="planDoor"/.test(indexSrc), "index.html has the door");
  yes(/<div class="plan-door" id="planDoor">[\s\S]*id="resumeBanner"/.test(indexSrc), "…and it comes BEFORE the resume banner — the first thing he sees");
  yes(/function planMountDoor\(/.test(planSrc) && /function planDoorHTML\(/.test(planSrc), "plan.js builds the door");
  yes(/if \(door\) planMountDoor\(door\); else planMountBar\(\);/.test(planSrc), "plan.js mounts the door on the home page and the bar everywhere else (the bar had no caller before)");
  yes(/p\.handover = \{ t: Date\.now\(\), from: block\.title \}/.test(planSrc) && /pb-hand/.test(planSrc), "a block that runs out its time hands over to the next in the bar");
  yes(/class="pd-start/.test(planSrc) && /href="\$\{cur\.url\}"/.test(planSrc), "the Start button NAVIGATES to the current block's page");
  yes(/function planTodayWins\(/.test(planSrc) && /Done for today/.test(planSrc), "when the day is done the door says so and stops");
  yes(/function planWeekDays\(/.test(planSrc) && /pd-extras/.test(planSrc) && !/Salah by ear/.test(planSrc), "the bigger picture is one quiet row: the week, the lesson, the extras — no numbers on the door (12 Oct)");

  /* the week that builds towards Sunday (his interview, 12 Oct) */
  console.log("\n-- the week that builds towards Sunday --");
  yes(/myday:\s*\{/.test(planSrc) && /rehearse:\s*\{/.test(planSrc) && /withher:\s*\{/.test(planSrc), "three new blocks: say your day · rehearse · tell her");
  yes(/prof\.isReza && dow === 0 \? "withher" : prof\.isReza && dow === 6 \? "rehearse" : "myday"/.test(planSrc), "Mon–Fri say your day, Saturday rehearse, Sunday tell her — the core block comes first (for him; Saba gets Say your day every day)");
  yes(/if \(!b\.core\) b\.optional = true;/.test(planSrc) && /find\(b => !b\.done && !b\.optional\)/.test(planSrc), "everything else is optional: the day is done when the core is done");
  yes(/hb\.optional = true; hb\.evening = true;/.test(planSrc) && /never owed/.test(planSrc), "her homework is the evening option, never a required block (his budget, 12 Oct)");
  yes(/four is a full week/.test(planSrc), "four mornings is a full week");
  yes(/Tell her your budget<\/summary>/.test(planSrc) && /عِنْدِي عَشْرُ دَقَائِقَ/.test(planSrc), "he gets the sentence that tells her the budget — folded, one tap away");

  /* the commute (12 Oct): hands-free, his own sentences, back/skip, offline, never scheduled */
  console.log("\n-- the commute --");
  const audioSrc = fs.readFileSync(path.join(ROOT, "audio.html"), "utf8");
  yes(/FreeTry\.plan\(mine\.concat\(everyday\), ctx\)/.test(audioSrc), "commute sentences are his own day, chosen by the engine at his level");
  yes(/function back\(\)/.test(audioSrc) && /id="acBack"/.test(audioSrc) && /"previoustrack", \(\) => back\(\)/.test(audioSrc), "⏮ back on screen and on the lock screen");
  yes(/async function sentenceRound\(/.test(audioSrc) && /S\.commute \? 2 : WORDS_PER_SENT/.test(audioSrc), "a whole sentence every two words on the commute");
  yes(/e: "commute-done"/.test(audioSrc) && /ev\.e === "commute-done" && \(ev\.min \|\| 0\) >= 10/.test(planSrc), "ten minutes or more hands-free counts as the whole day (nothing is planned around it)");
  yes(/audio\.html\?commute=1/.test(planSrc) && /pd-x-car/.test(planSrc), "the 🚗 is on the door as an option, never a block");
  yes(/"data\/myday\.json"/.test(fs.readFileSync(path.join(ROOT, "sw.js"), "utf8")) && /async function prefetchClips/.test(audioSrc), "offline: the sentences and their clips are cached ahead");
  yes(/async function runCommute\(/.test(audioSrc) && /function buildCommuteQueue\(/.test(audioSrc) && /kind: "script"/.test(audioSrc) && /kind: "say"/.test(audioSrc), "the programme: your script → say your day → due words, one queue, no clicks");
  yes(/async function sayRound\(/.test(audioSrc) && /speakP\(sent\.en, 1\)[\s\S]{0,200}gapP\(5\)/.test(audioSrc), "say your day by ear: English first, a gap to produce, then the model");
  yes(/body\.commute \.ac-ar \{ font-size: 44px/.test(audioSrc) && /document\.body\.classList\.toggle\("commute"/.test(audioSrc), "one layout — big type if he looks, nothing if he doesn't");
  yes(/sentEns: \(S\.heardSents/.test(audioSrc) && /commute-check-done/.test(fs.readFileSync(path.join(ROOT, "sentences.html"), "utf8")), "the next morning's Say your day starts with what he heard");
  yes(/function planScript\(/.test(planSrc) && /you can say/.test(planSrc), "the script: what he said or wrote and got right this week, on the door");
  yes(/evenings are yours/i.test(planSrc), "after 20:00 the door protects his evening instead of nudging");
  yes(/type === "myday" \? \(planEasyDay\(\) \? 6 : 10\)/.test(planSrc), "say your day has a ten-minute budget — his real slot (six on a lighter day)");
  const md = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "myday.json"), "utf8")).sentences;
  yes(md.length >= 50, `myday.json carries ${md.length} sentences about his day`);
  yes(md.every(s => s.ar.replace(/[.،؟!]/g, "").split(/\s+/).filter(Boolean).length <= 7), "…every one is seven words or fewer");
  yes(md.every(s => s.en && s.tr && s.moment && s.who), "…each with meaning, transliteration, moment of the day and who says it");
  yes(md.filter(s => s.who === "her").length >= 5, "…and the questions she is likely to ask");
  const sentSrc = fs.readFileSync(path.join(ROOT, "sentences.html"), "utf8");
  yes(/q\.get\("myday"\)/.test(sentSrc) && /async function startMyDay/.test(sentSrc), "sentences.html opens Say your day / Rehearse from the plan's link");
  const tryitSrc = fs.readFileSync(path.join(ROOT, "js", "tryit.js"), "utf8");
  yes(/e: "tryit-free-done"/.test(tryitSrc), "finishing the session logs the event the plan counts as done");

  /* motivation, wired in (12 Oct) */
  console.log("\n-- motivation, measured and nurtured --");
  yes(/function planMood\(/.test(planSrc) && /e: "mood"/.test(planSrc), "a mood tap after the session logs a mood event");
  yes(/function planEasyDay\(/.test(planSrc) && /every\(x => x\.mood === "heavy"\)/.test(planSrc), "two heavy days in a row make the next day lighter");
  yes(/planEasyDay\(\) \? 6 : 10/.test(planSrc), "…six minutes instead of ten");
  yes(/function planNurtureLine\(/.test(planSrc) && /Yesterday went to life/.test(planSrc), "a missed day gets no guilt on the door");
  yes(/sweetShift/.test(fs.readFileSync(path.join(ROOT, "js", "freetry.js"), "utf8")), "…and the engine asks for easier sentences on a heavy day");
}

/* ---------- the calm site (12 Oct) ---------- */
{
  const css = fs.readFileSync(path.join(ROOT, "css/style.css"), "utf8");
  yes(/h1 \+ \.sub \{ display: none; \}/.test(css), "calm: page taglines are gone everywhere");
  yes(/\.stat-strip \{ display: none !important; \}/.test(css), "calm: no numbers on a screen at the top of practice pages");
  yes(/details\.more > summary/.test(css) && /\.sym-group\.open \.sym-hid/.test(css), "calm: one ⋯ pattern for toolbars and for rows");
  const ix = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  yes(/class="sym-badge sym-more"/.test(ix) && /<span class="sym-hid">/.test(ix), "calm: Daily Reader rows show 🔊 🎯 verdicts ⋯ — the rest behind ⋯");
  yes(/closest\("\.s-ar-side"\)[^\n]*toggleDayEn/.test(ix), "calm: tapping the Arabic shows the English");
  yes(/<details class="card ai-box calm-sec">/.test(ix), "calm: Speak with AI folds to its heading");
  yes(!/Jump to Line/.test(ix) && !/Play All \(Ar \+ En\)/.test(ix), "calm: shorter button labels");
  for (const p of ["sentences.html", "words.html"]) {
    const h = fs.readFileSync(p, "utf8");
    yes(/<div class="calm-row">\s*<button[^>]*TryIt\.all\(\)/.test(h) && /<details class="more"><summary>⋯<\/summary>/.test(h), p + ": Try them all first, everything else behind ⋯");
    for (const id of ["btnPlayAll", "btnPlayPauses", "spNorm", "spSlow", "filterChips", "dirEnFirst", "btnPause", "btnStop"]) yes(h.includes('id="' + id + '"'), p + ": " + id + " still exists for the engine");
  }
  const cl = fs.readFileSync(path.join(ROOT, "class.html"), "utf8");
  yes(/details\.sec"\)\.forEach\(\(d, i\) => \{ if \(i > 0\) d\.open = false; \}\)/.test(cl), "calm: Lessons opens one section, the rest are headings");
  yes(!/Select Lesson:/.test(cl), "calm: no 'Select Lesson:' label");
}

/* ---------- the 12 Oct audit, fixed and pinned ---------- */
{
  console.log("\n-- the journey, end to end --");
  const planSrc = fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8").replace(/\r\n/g, "\n");   // the slicer below works on LF
  const tryitSrc = fs.readFileSync(path.join(ROOT, "js", "tryit.js"), "utf8");
  const trackerSrc = fs.readFileSync(path.join(ROOT, "js", "tracker.js"), "utf8");
  const indexSrc = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const sentSrc = fs.readFileSync(path.join(ROOT, "sentences.html"), "utf8");
  const audioSrc = fs.readFileSync(path.join(ROOT, "audio.html"), "utf8");
  // planObserve, run for real on a stub store
  const grab = name => { const a = planSrc.indexOf("function " + name + "("); const b = planSrc.indexOf("\n}\n", a); return planSrc.slice(a, b + 2); };
  const blocksA = planSrc.indexOf("const PLAN_BLOCKS = {"), blocksB = planSrc.indexOf("\n};\n", blocksA);
  const body = planSrc.slice(blocksA, blocksB + 4) + ["planSave", "planCurrent", "planOptional", "planObserve", "planFinishBlock"].map(grab).join("\n")
    + "; return { observe: planObserve, get: () => store.get(PLAN_KEY), events };";
  const mkPlan = today => {
    const mem = { "ats-plan": { date: today, blocks: [
      { type: "myday", core: true, title: "Say your day", mins: 10 }, { type: "withher", core: true, title: "Tell her" },
      { type: "speakdrill", optional: true, title: "Speak" }, { type: "review", optional: true, title: "Review" } ], completedAt: null } };
    const events = [];
    const api = new Function("store", "PLAN_KEY", "planToday", "logEvent", "autoSync", "planPaintBar", "planGet", "events", body)(
      { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v; } }, "ats-plan", () => today, e => events.push(e), () => {}, () => {}, () => { throw new Error("no rebuild in test"); }, events);
    return api;
  };
  const today = "2026-10-12";
  let api = mkPlan(today);
  api.observe({ e: "tryit-free-done", kind: "free" });
  yes(!api.get().blocks[0].done, "a plain ✨ Free try does NOT tick Say your day");
  api.observe({ e: "tryit-free-done", kind: "myday" });
  yes(api.get().blocks[0].done, "a Say-your-day round does");
  api.observe({ e: "prompt", score: 0.3 });
  yes(!api.get().blocks[2].done, "a missed spoken prompt does not tick the speak round");
  api.observe({ e: "prompt", score: 0.8 });
  yes(api.get().blocks[2].done, "a passed one does — optional blocks complete from events too");
  api.observe({ e: "review-done" });
  yes(api.get().blocks[3].done, "the Review pill ticks on review-done");
  yes(!api.get().completedAt, "the day is not complete while a core block (Sunday) is open");
  api.observe({ e: "withher-done" });
  yes(api.get().blocks[1].done && !!api.get().completedAt, "withher-done completes Sunday — the day is done");
  yes(/function planToldHer\(/.test(planSrc) && /e: "withher-done"/.test(planSrc), "…and the Lessons page has the ✓ that logs it");
  // every completing event is logged somewhere on the site
  const doneNames = new Set();
  (planSrc.slice(blocksA, blocksB).match(/done: \[([^\]]*)\]/g) || []).forEach(m => (m.match(/"([^"]+)"/g) || []).forEach(s => doneNames.add(s.slice(1, -1))));
  const corpus = fs.readdirSync(ROOT).filter(x => x.endsWith(".html")).map(x => fs.readFileSync(path.join(ROOT, x), "utf8")).join("\n")
    + fs.readdirSync(path.join(ROOT, "js")).map(x => fs.readFileSync(path.join(ROOT, "js", x), "utf8")).join("\n");
  const orphan = [...doneNames].filter(n => !new RegExp('e: "' + n + '"').test(corpus));
  yes(!orphan.length, orphan.length ? "completing events nothing ever logs: " + orphan.join(", ") : `all ${doneNames.size} completing events are logged somewhere`);
  yes(!/"spract-done"/.test(planSrc) && !/commute-check"/.test(planSrc), "the dead events (spract-done, commute-check) are gone from the plan");
  // Try it: a miss moves on; self-grades are not 'got right'; the mic uses the one grader
  yes(/Next anyway →/.test(tryitSrc) && /st\.result && st\.result\.ok && variants/.test(tryitSrc), "Try it: an honest miss has a Next (it comes back tomorrow) and never climbs a rung");
  yes(/s\.result\.how !== "self"/.test(tryitSrc), "the round's 'got right' count excludes self-grades");
  yes(/Match\.spoken/.test(tryitSrc) && /Match\.spoken/.test(indexSrc), "both Try it engines grade speech with js/match.js");
  yes(/via: "tryit"/.test(tryitSrc) && /via: "tryit"/.test(indexSrc), "…and mark their prompt events so the level counts each try once");
  yes(/Next anyway →/.test(indexSrc) && /key: \`chap:\$\{curChap\.num\}:\$\{idx\}\`/.test(indexSrc), "the Daily Reader engine: Next after a miss, and a shared rung ladder by key");
  yes(/}, 4000\);/.test(tryitSrc) && /}, 4000\);/.test(indexSrc), "four seconds of silence before the mic closes (he said he would be slow)");
  // the morning after a commute
  yes(/window\._pendingCommuteCheck = \{ forT: cd\.t/.test(sentSrc) && /e: "commute-check-done", forT: c\.forT/.test(sentSrc), "the commute check is logged when the round ENDS, not when it starts");
  yes(/const bst = typeof ctx\.boost/.test(fs.readFileSync(path.join(ROOT, "js", "freetry.js"), "utf8")), "the engine reads the caller's boost");
  yes(/pagehide", \(\) => \{ if \(S\) \{ S\.partial = true; stop\(\); \} \}/.test(audioSrc), "a commute closed from the pocket still logs commute-done");
  yes(/async function prefetchQueue/.test(audioSrc) && /await prefetchQueue\(S\.queue\)/.test(audioSrc), "the commute caches ITS OWN clips before it starts");
  yes(/freq: fq/.test(audioSrc), "…and knows word frequency");
  // sync
  yes(/cloud-read-/.test(trackerSrc), "a failed cloud read never lets this device overwrite the cloud");
  yes(/plan: store\.get\("ats-plan"/.test(trackerSrc) && /hwDone: store\.get\("ats-hw-done"/.test(trackerSrc) && /remote\.plan && remote\.plan\.date/.test(trackerSrc), "the day plan and the homework ticks sync and merge");
  yes(/if \(r\.u \|\| l\.u\) \{ if \(\(r\.u \|\| 0\) > \(l\.u \|\| 0\)\) srs\[k\] = r; return; \}/.test(trackerSrc), "a stamped verdict beats an unstamped seed on merge");
  yes(/autoSync\(true\)/.test(trackerSrc) && /addEventListener\("online"/.test(trackerSrc), "hiding the page and coming back online force a sync");
  yes(/function claimLocal\(/.test(trackerSrc), "a second account in the same browser does not inherit the first one's cards");
  yes(/due: Date\.now\(\) \+ DAY, u: Date\.now\(\)/.test(fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8")), "seed cards are stamped");
  // offline: every data file a core page fetches is precached
  const core = (swSrc.match(/const CORE = \[([\s\S]*?)\];/) || [])[1] || "";
  const fetched = new Set();
  ["index.html", "sentences.html", "words.html", "class.html", "audio.html", "review.html", "grammar.html"].forEach(p => {
    (fs.readFileSync(path.join(ROOT, p), "utf8").match(/fetch\("(data\/[^"?]+)"/g) || []).forEach(m => fetched.add(m.slice(7, -1)));
  });
  ["app.js", "tryit.js", "plan.js", "freetry.js", "curriculum.js", "progress-model.js"].forEach(j => {
    (fs.readFileSync(path.join(ROOT, "js", j), "utf8").match(/fetch\("(data\/[^"?]+)"/g) || []).forEach(m => fetched.add(m.slice(7, -1)));
  });
  const notCached = [...fetched].filter(x => !core.includes('"' + x + '"'));
  yes(!notCached.length, notCached.length ? "fetched by a core page but NOT precached: " + notCached.join(", ") : `every data file a core page fetches is precached (${fetched.size})`);
  yes(/"js\/match\.js"/.test(core), "js/match.js is precached");
  yes(/headers\.has\("range"\)/.test(swSrc), "a ranged audio request is fetched whole so the clip can be cached");
  // pages and scripts
  const wordsSrc = fs.readFileSync(path.join(ROOT, "words.html"), "utf8");
  yes(wordsSrc.indexOf("js/tracker.js") < wordsSrc.indexOf("js/plan.js"), "words.html loads the plan after the tracker");
  ["sentences.html", "class.html", "audio.html", "words.html"].forEach(p => yes(/js\/account\.js/.test(fs.readFileSync(path.join(ROOT, p), "utf8")), p + " refreshes the homework contract (account.js)"));
  yes(/if \(!card\) return;\r?\n\r?\n  \/\/ 1\. If remote coach note exists/.test(fs.readFileSync(path.join(ROOT, "js", "account.js"), "utf8")), "the contract is stored BEFORE the note card is looked for");
  yes(/function planProfile\(/.test(planSrc) && /sabatarif\.15@gmail\.com/.test(planSrc), "the plan knows who it is talking to (Saba gets her own wording)");
  yes(/"preply-paste", text, imageCount: files\.length, imgs/.test(fs.readFileSync(path.join(ROOT, "class.html"), "utf8")), "a pasted lesson uploads its photos and reaches the coach as a note");
}

/* ---------- the coach loop, built (12 Oct, "fix it all") ---------- */
{
  console.log("\n-- the coach loop: ledger, ear, brief, aliases, cap --");
  const tryitSrc = fs.readFileSync(path.join(ROOT, "js", "tryit.js"), "utf8");
  const indexSrc = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const classSrc = fs.readFileSync(path.join(ROOT, "class.html"), "utf8");
  const srsSrc = fs.readFileSync(path.join(ROOT, "js", "srs.js"), "utf8");
  yes(/Errors\.classify\(model, typed, "typed"\)/.test(tryitSrc) && /Errors\.classify\(tg\.ar, st\.heard, "mic"\)/.test(tryitSrc) && /Errors\.classify\(item\.ar, st\.heard, "mic"\)/.test(indexSrc), "every miss is classified where it happens (both engines) and the event carries err");
  yes(/function earGrade\(/.test(tryitSrc) && /e: "alisten-grade", key: it\.key, ok: !!ok, src: "tryit-ear"/.test(tryitSrc) && /🎧 Hear it first/.test(tryitSrc), "hear-first Try it: the Arabic plays, the verdict is listening evidence");
  yes(/hear: true, kind: 'ear'/.test(fs.readFileSync(path.join(ROOT, "sentences.html"), "utf8")), "…and a whole round by ear is one tap on the Sentences page");
  yes(/frames, t: Date\.now\(\)/.test(tryitSrc) && /x\.frames \|\| framesOf\(s\)/.test(fs.readFileSync(path.join(ROOT, "js", "freetry.js"), "utf8")), "a rung variant's own frames are the grammar evidence (rung labels)");
  yes(/async function renderTeacherBrief/.test(classSrc) && /e: "teacher-brief"/.test(classSrc) && /Ask me about my day/.test(classSrc), "the brief for her: five lines, copyable, logged");
  const al = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "aliases.json"), "utf8"));
  const groups = Object.values(al.groups);
  const all = groups.flat();
  yes(groups.length > 100 && groups.every(g => g.length >= 2) && new Set(all).size === all.length, `aliases.json: ${groups.length} groups, every key in exactly one`);
  yes(/function setAliases\(/.test(srsSrc) && /\(ALIAS\[key\] \|\| \[\]\)\.forEach\(k => \{ if \(k !== key\) srs\[k\] = nc; \}\)/.test(srsSrc) && /counted\.has\(g\)/.test(srsSrc), "one word, one card: a verdict reaches every key, the count sees one");
  yes(/data\/aliases\.json/.test(fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8")) && /"data\/aliases\.json"/.test(swSrc), "…loaded on every page and precached");
  yes(!/cur\.b === "never" && g !== "no" && g !== "retire"\) return cur/.test(srsSrc), "✓ on a retired card is a verdict, not a silent no-op");
  yes(/const AUDIO_MAX = 3000/.test(swSrc) && /trimAudio\(c\)/.test(swSrc), "the audio cache keeps the newest 3000 clips");
  yes(!/✗ missed/.test(fs.readFileSync(path.join(ROOT, "review.html"), "utf8")), "the review page has one verdict control, not two");
  yes(/planHwTaskDone\("say3"\)/.test(fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8")), "telling her ticks the contract's task too");
  yes(/function planBestHour\(/.test(fs.readFileSync(path.join(ROOT, "js", "plan.js"), "utf8")), "the door knows his best hour");
  for (const s of ["refit-progress.js", "intervention-check.js", "gen-aliases.js"]) yes(fs.existsSync(path.join(ROOT, "scripts", s)), "scripts/" + s + " exists");
  const iv = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "interventions.json"), "utf8"));
  yes(Array.isArray(iv.items) && iv.items.every(i => i.date && i.kind && Array.isArray(i.keys) && i.what), "the intervention ledger has a shape the check script reads");
}

console.log(fails ? `\n${fails} FAILED` : "\nALL TESTS PASS");
process.exit(fails ? 1 : 0);
