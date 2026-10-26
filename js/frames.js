/* ============================================================================
   FRAMES — which grammar does a sentence demonstrate, and which does it exercise?
   (js/frames.js — shared by scripts/gen-sentences.js, scripts/gen-frames.js,
   js/freetry.js and the pages)

   Reza, 2026-10-12: "build out the grammar profile in terms of content fully"
   — every sentence on the site (chapter, class, bank, story, Qur'an) should
   carry its grammar so his passes and misses on ANY of them count as evidence,
   and the coach can aim sentences at the frame he is weak in.

   Two layers, on purpose:
     · pattern — the ONE frame a sentence is labelled with and may be explained
       by (the grammar note he sees). Claimed only on an unmistakable marker,
       because a wrong grammar note is worse than none (the old rule, kept).
     · frames  — every frame the sentence EXERCISES, including the looser
       reads (an iḍāfa pairing, an attached pronoun, a connector, a verbless
       nominal sentence). Used for evidence and selection only, never shown as
       a note. A pass credits all of them; the primary at full weight.

   Qur'anic text arrives in Uthmani orthography (ٱ, ۡ, ۚ …); everything is
   normalised first. Pure, no DOM. Tests: node scripts/test-frames.js
   ============================================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Frames = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  /* keep the short vowels (ـتُ and tanwīn are grammar), drop Uthmani marks, unify alif/ya */
  const clean = s => String(s || "")
    .replace(/ۡ/g, "ْ")                                  // Uthmani sukūn → ordinary sukūn (قُلۡ → قُلْ)
    .replace(/[ࣰ]/g, "ً").replace(/[ࣱ]/g, "ٌ").replace(/[ࣲ]/g, "ٍ")   // open tanwīn forms
    .replace(/[ۖ-ٰۭـ۟۠]/g, "")      // pause marks, small alifs, tatweel
    .replace(/[ٱ]/g, "ا").replace(/ی/g, "ي")   // ٱ → ا, Persian ya → ya
    .replace(/[«»"“”(),.!؟?:;،؛]/g, " ").replace(/\s+/g, " ").trim();
  const unv = s => String(s).replace(/[ً-ْ]/g, "").replace(/[أإآ]/g, "ا");
  const bare = s => unv(clean(s));
  const toks = s => clean(s).split(" ").filter(Boolean);

  const SETS = {
    question: new Set(["هل", "ما", "ماذا", "من", "اين", "متى", "كيف", "كم", "لماذا", "اي", "اية", "بكم", "لمن"]),
    neg: new Set(["لا", "ما", "لم", "لن", "ليس", "ليست", "لست", "لسنا", "ليسوا", "غير"]),
    demo: new Set(["هذا", "هذه", "ذلك", "تلك", "هؤلاء", "هذان", "هاتان"]),
    kana: new Set(["كان", "كانت", "كانوا", "كنت", "كنا", "يكون", "تكون", "اكون", "نكون", "يكن", "تكن"]),
    alladhina: new Set(["الذين", "الذي", "التي", "اللاتي", "اللواتي", "اللذان", "اللتان"]),
    wujud: new Set(["يوجد", "توجد", "يوجدان"]),
    imperative: new Set(["قل", "اقرا", "اذهب", "اذهبي", "استووا", "تقدموا", "انظر", "انظري", "اسمع", "اسمعي", "تفضل", "تفضلي", "تفضلوا",
      "خذ", "خذي", "خذني", "خذنا", "توقف", "توقفي", "انتظر", "انتظري", "تعال", "تعالي", "اجلس", "اجلسي", "قم", "قومي", "اعطني", "اعطيني",
      "ساعدني", "ساعديني", "اتبع", "ادخل", "اخرج", "كل", "كلي", "اشرب", "اشربي", "اكتب", "اكتبي", "افتح", "افتحي", "اغلق", "انتبه", "اتقوا",
      "هيا", "نزل", "نزلي", "اتصل", "ارجع", "ادع", "اذكر", "اعبد", "اعبدوا", "صل", "صلوا", "قولوا", "اسجد", "امش", "امشي", "اذهبوا", "اسكت", "اسكتي", "انتظروا"]),
    ordinal: new Set(["اول", "الاول", "اولى", "الاولى", "ثان", "ثاني", "الثاني", "ثانية", "الثانية", "ثالث", "الثالث", "ثالثة", "الثالثة",
      "رابع", "الرابع", "رابعة", "الرابعة", "خامس", "الخامس", "خامسة", "الخامسة", "سادس", "السادس", "سادسة", "السادسة",
      "سابع", "السابع", "سابعة", "السابعة", "ثامن", "الثامن", "ثامنة", "الثامنة", "تاسع", "التاسع", "تاسعة", "التاسعة", "عاشر", "العاشر", "عاشرة", "العاشرة",
      "عشرة"]),
    connector: new Set(["ثم", "لكن", "ولكن", "لان", "لانني", "لانه", "لانها", "عندما", "حين", "بعد", "بعدما", "قبل", "اذا", "اما", "او", "حتى", "لذلك"]),
    pastVerb: new Set(["ذهب", "ذهبت", "ذهبوا", "اكل", "اكلت", "اكلوا", "شرب", "شربت", "شربوا", "قال", "قالت", "قالوا", "راى", "رات", "اشترى", "اشترت",
      "جلس", "جلست", "جلسوا", "وصل", "وصلت", "وصلوا", "لعب", "لعبت", "عاد", "عادت", "تعلم", "تعلمت", "فرح", "فرحت", "شكر", "شكرت", "طلب", "طلبت",
      "استيقظ", "استيقظت", "اراد", "ارادت", "اعطى", "اعطت", "شعر", "شعرت", "درس", "درست", "كتب", "كتبت", "قرا", "قرات", "سمع", "سمعت", "عمل", "عملت",
      "بدا", "بدات", "انتهى", "انتهت", "غسل", "غسلت", "لبس", "لبست", "نام", "نامت", "ساعد", "ساعدت", "رتب", "رتبت", "فتح", "فتحت", "دخل", "دخلت",
      "خرج", "خرجت", "جاء", "جاءت", "اتى", "سافر", "سافرت", "زار", "زارت", "خلق", "علم", "كفروا", "امنوا", "عملوا", "كذب", "تولى", "فاز", "نصر",
      "بارك", "رحم", "جزاك", "جزاكم", "حمد", "سوى", "قدر", "هدى", "جعل", "اعطيناك", "انزلناه", "شاء", "كفر", "امن", "صدق", "صبر"]),
    pron: new Set(["انا", "انت", "انتم", "انتن", "هو", "هي", "هم", "هن", "نحن", "اياك"]),
    // nouns that begin like a present-tense verb (ي/ت/أ/ن + vowel) — never verbs
    nouns: new Set(["يوم", "يومي", "يومك", "يومه", "يومين", "ايام", "يد", "يدي", "يدك", "يمين", "يسار", "تمر", "تمرة", "تمرات", "تلفاز", "تين", "تفاح", "تاريخ",
      "تلميذ", "تذكرة", "نهار", "نور", "نار", "نفس", "نفسي", "ناس", "نهاية", "نوم", "نعم", "نخل", "نخيل", "نصر", "امتعة", "امتعتي", "امتعتك", "ام", "امي", "امك", "امه",
      "اب", "ابي", "ابوك", "ابوه", "اخ", "اخي", "اخوك", "اخت", "اختي", "اختك", "اخته", "اسم", "اسمي", "اسمك", "اسمه", "ارض", "اسبوع", "امس", "اسرة", "اسرتي", "اصدقاء",
      "اصدقائي", "اصدقائه", "اطباق", "اعناب", "ايمان", "انسان", "اذان", "اذن", "اكل", "ابواب", "اثاث", "ايضا", "الان", "احد", "الله", "اللهم",
      "اربع", "اربعة", "تسع", "تسعة", "ثمان", "ثماني", "ثمانية", "اثنان", "اثنين", "اثنتان", "اول", "اولى", "اخر", "اخرى", "ايام", "اسماء", "ابناء", "اخوة", "اخوات",
      "الاثنين", "الثلاثاء", "الاربعاء", "الخميس", "الجمعة", "السبت", "الاحد", "ارائك", "اريكة", "تعبان", "تعبانة", "تمام", "تقريبا"]),
    particles: new Set(["في", "من", "الى", "على", "عن", "مع", "هل", "لا", "ما", "ثم", "و", "ان", "اذا", "يا", "كم", "اين", "متى", "كيف", "لماذا",
      "ماذا", "بعد", "قبل", "عند", "تحت", "فوق", "امام", "خلف", "بين", "حول", "كل", "بعض", "غير", "الا", "لم", "لن", "ليس", "قد", "لقد", "سوف",
      "او", "لكن", "ولكن", "لان", "حتى", "منذ", "ايضا", "جدا", "فقط", "هنا", "هناك", "الان", "اليوم", "غدا", "امس", "صباحا", "مساء", "ليلا",
      "دائما", "احيانا", "كثيرا", "قليلا", "مبكرا", "متاخرا", "معا", "نعم", "طبعا", "شكرا", "عفوا", "بخير", "اهلا", "مرحبا", "لو", "اما", "بل"]),
  };
  const PREP_PRON = /^(ل|ب|في|على|علي|من|عن|الى|الي|مع|لد|لدي|حول|بين|عند)(ه|ها|هم|هن|ك|كم|كن|ي|نا|ني|كما|هما)$/;
  const PRESENT = /^(سَ|سَي|سَأ|سَن|سَت|يَ|تَ|أَ|نَ|يُ|تُ|أُ|نُ)/;
  const DUAL_END = /(َانِ|َيْنِ)$/;
  const PAST_TU = /ْتُ$/;
  const dropWF = t => (t.length > 3 && /^[وف]/.test(t)) ? t.slice(1) : t;   // وَكَانَتْ → كانت, فَقَالَ → قال
  /* a past-tense verb by its SHAPE (vowels tell): فَعَلَ / فَعِلَ, قَالَ, أَفْعَلَ, تَفَعَّلَ, اِسْتَفْعَلَ, اِفْتَعَلَ,
     with he / she / they endings — never a noun with tanwīn, never a word we know is a noun */
  const C = "[\\u0621-\\u064A]";
  const END = "(َ|َتْ|ُوا|ُواْ|َى|ْنَا|ْتَ|ْتِ|ْتُمْ)";   // he / she / they / we / you (m, f, pl)
  const PAST_SHAPES = [
    new RegExp(`^(وَ|فَ)?${C}َ${C}[َِ]${C}${END}$`),           // ذَهَبَ، شَرِبَ، خَلَقَ، عَلَمَ (shadda stripped)
    new RegExp(`^(وَ|فَ)?${C}َ[اآ]${C}${END}$`),                // قَالَ، زَارَ، جَاءَ (جَآءَ)، كَانَ
    new RegExp(`^(وَ|فَ)?أَ${C}ْ${C}َ${C}${END}$`),             // أَخْرَجَ، أَعْطَى، أَرَادَ (أَرَادَ: see below)
    new RegExp(`^(وَ|فَ)?أَ${C}َا${C}${END}$`),                 // أَرَادَ، أَقَامَ
    new RegExp(`^(وَ|فَ)?تَ${C}َ${C}َ${C}${END}$`),             // تَعَلَّمَ، تَكَلَّمَ (shadda stripped)
    new RegExp(`^(وَ|فَ)?اِسْتَ${C}ْ?${C}َ${C}${END}$`),        // اِسْتَيْقَظَ، اِسْتَوَى
    new RegExp(`^(وَ|فَ)?اِ${C}ْ?تَ${C}َ${C}${END}$`),          // اِشْتَرَى، اِنْتَهَى، اِجْتَمَعَ
    new RegExp(`^(وَ|فَ)?اِنْ${C}َ${C}َ${C}${END}$`),           // اِنْطَلَقَ
  ];
  const isPastShape = (t, u) => {
    if (!t || /[ًٌٍ]$/.test(t) || /^ال/.test(u) || SETS.nouns.has(u) || SETS.particles.has(u) || SETS.pron.has(u) || SETS.demo.has(u)) return false;
    const s = t.replace(/ّ/g, "");
    return PAST_SHAPES.some(re => re.test(s));
  };

  function detect(ar) {
    const raw = toks(ar);
    const b = raw.map(unv);
    // a leading و / ف is a prefix only when what remains is a word we recognise (فِيهَا, فَطُور keep their ف)
    const bs = b.map((u, i) => {
      if (!(/^[وف]/.test(u) && u.length > 3)) return u;
      const r = u.slice(1);
      const known = SETS.pastVerb.has(r) || SETS.kana.has(r) || SETS.particles.has(r) || SETS.question.has(r) || SETS.imperative.has(r) || SETS.neg.has(r)
        || SETS.pron.has(r) || SETS.demo.has(r) || SETS.connector.has(r) || SETS.wujud.has(r) || SETS.alladhina.has(r) || /^(عند|لد)/.test(r)
        || PRESENT.test(raw[i].slice(2)) || isPastShape(raw[i].slice(2), r);
      return known ? r : u;
    });
    const inSet = (set, i) => set.has(b[i]) || set.has(bs[i]);
    const any = set => b.some((t, i) => inSet(set, i));
    const frames = new Set();
    const first = b[0] || "";
    const hasQ = /؟|\?/.test(String(ar));

    /* a present-tense verb: prefix + vowel, long enough, and not a word we know is not one */
    const isPresent = (t, i) => {
      const u = unv(t), us = dropWF(u), uh = t.replace(/[ً-ْ]/g, "");   // uh keeps the hamza: أَلْبَسُ is not الـ
      if (!PRESENT.test(t) && !(/^(وَ|فَ)/.test(t) && PRESENT.test(t.slice(2)))) return false;   // the و/ف path only after a real و/ف (not لِأَنِّي)
      // prefix + a three-letter root at least — except a short jussive after لم/لن/لا/ما (لَمْ أَنَمْ) or a hollow verb ending in ـُ (أَصِلُ)
      if (us.length < 4 && !(us.length === 3 && !SETS.nouns.has(us) && (/ُ$/.test(t) || (i > 0 && ["لم", "لن", "لا", "ما", "ان", "سوف"].includes(bs[i - 1]))))) return false;
      if (SETS.pron.has(u) || SETS.particles.has(u) || SETS.question.has(u) || SETS.demo.has(u) || SETS.nouns.has(u) || SETS.nouns.has(us)) return false;
      if (/^ال/.test(uh) || /[ًٌٍ]$/.test(t) || /ة[ً-ْ]*$/.test(t)) return false;   // definite, tanwīn or ة = a noun
      if (/(َاتٍ|َاتٌ|َاتِ|َاتُ|تِي)$/.test(t)) return false;                                            // feminine plural, "my …"
      // اِشْرَبْ (drink!) vs أَشْرَبُ (I drink): the imperative starts with a plain alif or ends in sukūn
      if (SETS.imperative.has(u) && (/^ا/.test(t) || /ْ$/.test(t) || !/[ً-ْ]/.test(t))) return false;
      if (isPastShape(t, us)) return false;                                                            // أَخْرَجَ is past, not present
      return true;
    };

    // ---- unmistakable markers (these may be shown as the sentence's grammar note) ----
    // ـتُ = "I did it" — but not the ت of a noun like البَيْتُ، الوَقْتُ، بِنْتُ
    const nounTu = /(بيت|وقت|بنت|اخت|موت|صوت|زيت|ست|نعت|سمت)$/;
    if (raw.some((t, i) => PAST_TU.test(t) && t.length > 4 && !/^(و|ف)?ال/.test(b[i]) && !SETS.nouns.has(bs[i]) && !nounTu.test(bs[i]))) frames.add("past-tu");
    if (any(SETS.kana)) frames.add("kana");
    if (raw.some((t, i) => DUAL_END.test(t) && t.length > 5 && !SETS.particles.has(b[i]) && !SETS.nouns.has(b[i]) && !/^(الذ|اللذ|اللت)/.test(b[i]))) frames.add("dual");   // الاثْنَيْنِ is Monday
    if (any(SETS.alladhina)) frames.add("alladhina");
    if (raw.some(t => /^(وَ|فَ)?(إِنَّ|إِنِّي|إِنَّا|إِنَّهُ|إِنَّكَ|إِنَّكُمْ|إِنَّنِي|أَنَّ|أَنَّهُ|أَنَّهَا|أَنِّي|لَكِنَّ|لِأَنَّ|لِأَنِّي|لِأَنَّهُ|لِأَنَّنِي|لِأَنَّهَا|لَعَلَّ|كَأَنَّ)/.test(t))) frames.add("inna");
    if (any(SETS.wujud)) frames.add("wujud");
    {
      // an imperative ends in sukūn (قُلْ، تَفَضَّلْ), or ِي / ُوا for her / them, or carries a pronoun (خُذْنِي);
      // the same root's past tense ends in a fatha (أَخْرَجَ) — the vowels decide; unvowelled text is trusted
      const impShape = t => !/[ً-ْ]/.test(t) || /ْ$/.test(t) || /ِ$/.test(t) || /(ِي|ُوا|ُواْ|نِي|نَا)$/.test(t) || /^(هَيَّا|تَفَضَّل)/.test(t);   // اِمْشِ ends in a kasra
      const f0 = bs[0] || "";
      const impOk = (f0 === "كل" ? /ْ$/.test(raw[0]) || raw[0] === "كل" : true) && impShape(raw[0] || "");
      if ((SETS.imperative.has(f0) && impOk) || (b.length > 1 && (first === "يا" || first === "لو") && SETS.imperative.has(bs[1]) && impShape(raw[1]))) frames.add("imperative");
    }
    if (any(SETS.ordinal)) frames.add("ordinals");
    if (bs.some(t => /^(عند|لد)(ي|ك|كم|كن|ه|ها|هم|هن|نا)$/.test(t) || (/^ل(ي|ك|ه|ها|نا|كم|هم)$/.test(t) && b.length <= 6))) frames.add("have");
    {
      // ما at the front is a question only with a ؟ or before a pronoun / demonstrative; otherwise it negates a verb
      const negAt = (t, i) => {
        if (!SETS.neg.has(t)) return false;
        if (t !== "ما") return true;
        if (bs[i + 1] === "شاء") return false;                       // مَا شَاءَ اللهُ — "what Allah willed", not a negation
        if (i === 0) return !(hasQ || SETS.pron.has(b[1] || "") || SETS.demo.has(b[1] || "")) && (SETS.pastVerb.has(bs[1] || "") || /^(عند|لد|مع)/.test(bs[1] || "") || b.length >= 3);   // مَا عِنْدِي
        return !SETS.pron.has(b[i + 1] || "") && !SETS.demo.has(b[i + 1] || "");
      };
      if (bs.some((t, i) => negAt(t, i))) frames.add("negation");
      // a leading ما asks a question only with a ؟ or before a pronoun / demonstrative (مَا هَذَا؟); otherwise it is "what / not"
      const qFirst = SETS.question.has(first) && !(first === "ما" && !(hasQ || SETS.pron.has(b[1] || "") || SETS.demo.has(b[1] || "")));
      if (qFirst || hasQ || (first === "يا" && SETS.question.has(b[1] || ""))) frames.add("questions");
    }
    if (any(SETS.demo)) frames.add("demonstratives");
    if (bs.some(t => PREP_PRON.test(t) && !/^(عند|لد)/.test(t))) frames.add("prep-pron");
    // لِ + ال = لِلْ (لِلْعَائِلَةِ، لِلَّهِ، لِّلْمُتَّقِينَ): no Arabic root begins with two lams, so a
    // word opening لل- is always the preposition swallowing the article (26 Oct, his own md:23)
    if (bs.some(t => /^لل./.test(t))) frames.add("lam-li");
    const present = raw.some((t, i) => isPresent(t, i));
    const past = any(SETS.pastVerb) || frames.has("past-tu") || raw.some((t, i) => isPastShape(t, bs[i]));
    if (present || past) frames.add("tenses");

    // ---- looser reads: exercised, never explained from here ----
    if (any(SETS.connector) || raw.some((t, i) => i > 0 && /^(فَ|وَ)/.test(t) && (isPresent(t.slice(2), i) || SETS.pastVerb.has(bs[i])))) frames.add("connectors");
    // iḍāfa: a bare noun (no ال, no tanwīn, not a particle/verb) followed by a definite noun
    for (let i = 0; i + 1 < raw.length; i++) {
      const a = raw[i], an = bs[i], nx = bs[i + 1];
      if (SETS.particles.has(an) || SETS.pron.has(an) || SETS.question.has(an) || SETS.demo.has(an) || SETS.neg.has(an) || SETS.imperative.has(an)) continue;
      if (/^ال/.test(an) || an.length < 3 || /[ًٌٍ]$/.test(a) || isPresent(a, i) || SETS.pastVerb.has(an) || SETS.kana.has(an) || isPastShape(a, an) || PAST_TU.test(a)) continue;
      if (/^ال/.test(nx) && nx.length > 3 && !SETS.particles.has(nx) && /[َُِ]$/.test(a)) { frames.add("idafa"); break; }
    }
    // attached possessive on a noun: بيتي، كتابك، أمه، وجهي — not a verb, not a prep+pronoun
    if (raw.some((t, i) => [b[i], bs[i]].some(u => !/^ال/.test(u) && u.length >= 3 && /(ي|ك|ه|ها|نا|كم|هم)$/.test(u) && !PREP_PRON.test(u) && !/^(عند|لد)/.test(u)
      && !SETS.particles.has(u) && !SETS.pron.has(u) && !SETS.pastVerb.has(u) && !isPresent(t, i) && !SETS.demo.has(u) && !SETS.question.has(u) && !SETS.imperative.has(u) && !SETS.kana.has(u)))) frames.add("pronouns");
    // plurals: a sound plural ending or a counted plural (3–10 + plural)
    if (raw.some((t, i) => /(ُونَ|ِينَ|َاتٌ|َاتٍ|َاتِ|َاتُ)$/.test(t) && t.length > 5 && !SETS.alladhina.has(b[i]))) frames.add("plurals");
    if (bs.some(t => /^(ثلاث|اربع|خمس|ست|سبع|ثماني|تسع|عشر)(ة)?$/.test(t))) frames.add("plurals");
    // who-acts: a we/they verb form
    if (raw.some((t, i) => (/^(وَ|فَ)?نَ/.test(t) && isPresent(t, i)) || /ُوا$/.test(t) || (/ُونَ$/.test(t) && isPresent(t, i)))) frames.add("who-acts");
    // gender: an adjective agreeing in ة right after a feminine noun
    if (raw.some((t, i) => /ة[ً-ْ]*$/.test(t) && raw[i + 1] && /ة[ً-ْ]*$/.test(raw[i + 1]) && !SETS.particles.has(b[i + 1]))) frames.add("gender");
    // verbless sentence = nominal (two or more content words and no verb at all)
    if (!present && !past && !frames.has("kana") && !frames.has("imperative") && !frames.has("wujud") && b.length >= 2) frames.add("nominal");

    // ---- the one label: most specific unmistakable marker first ----
    const ORDER = ["past-tu", "kana", "dual", "alladhina", "inna", "wujud", "imperative", "ordinals", "negation", "have", "questions", "demonstratives", "lam-li", "prep-pron", "tenses", "nominal"];
    const pattern = ORDER.find(p => frames.has(p)) || null;
    return { pattern, frames: [...frames] };
  }
  return { detect, clean, bare, SETS };
});
