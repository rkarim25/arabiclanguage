/* Verbs to add to data/conjugations.json — see gen-conj.js for how the full
   tables are derived and proved. Frequency-first: the Quranic verbs he keeps
   meeting in the surahs he is studying, plus the everyday verbs already sitting
   in his story and phrase clusters with no table behind them (سكن — "he lives"
   in story-02 — was the one he complained about).

   Only past3 / pres3 are authored. `pastC` is the past stem before consonant
   endings, needed for hollow and doubled verbs. Anything genuinely irregular
   carries an explicit table and is checked by audit() rather than by rule. */

module.exports = [
  // ---------- everyday / story verbs ----------
  { id: "sakana", root: "س ك ن", en: "to live, reside", base: "live", pastEn: "lived", past3: "سَكَنَ", pres3: "يَسْكُنُ" },
  { id: "darasa", root: "د ر س", en: "to study", base: "study", pastEn: "studied", past3: "دَرَسَ", pres3: "يَدْرُسُ" },
  { id: "laiba", root: "ل ع ب", en: "to play", base: "play", pastEn: "played", past3: "لَعِبَ", pres3: "يَلْعَبُ" },
  { id: "jalasa", root: "ج ل س", en: "to sit", base: "sit", pastEn: "sat", past3: "جَلَسَ", pres3: "يَجْلِسُ" },
  { id: "hamala", root: "ح م ل", en: "to carry", base: "carry", pastEn: "carried", past3: "حَمَلَ", pres3: "يَحْمِلُ" },
  { id: "dafaa", root: "د ف ع", en: "to pay; to push", base: "pay", pastEn: "paid", past3: "دَفَعَ", pres3: "يَدْفَعُ" },
  { id: "labisa", root: "ل ب س", en: "to wear, put on", base: "wear", pastEn: "wore", past3: "لَبِسَ", pres3: "يَلْبَسُ" },
  { id: "ghasala", root: "غ س ل", en: "to wash", base: "wash", pastEn: "washed", past3: "غَسَلَ", pres3: "يَغْسِلُ" },
  { id: "rajaa", root: "ر ج ع", en: "to return, go back", base: "return", pastEn: "returned", past3: "رَجَعَ", pres3: "يَرْجِعُ" },
  { id: "kharaja", root: "خ ر ج", en: "to go out, exit", base: "go out", pastEn: "went out", past3: "خَرَجَ", pres3: "يَخْرُجُ" },
  { id: "fataha", root: "ف ت ح", en: "to open", base: "open", pastEn: "opened", past3: "فَتَحَ", pres3: "يَفْتَحُ" },
  { id: "bahatha", root: "ب ح ث", en: "to search, look for", base: "search", pastEn: "searched", past3: "بَحَثَ", pres3: "يَبْحَثُ" },
  { id: "saida", root: "ص ع د", en: "to go up, ascend", base: "go up", pastEn: "went up", past3: "صَعِدَ", pres3: "يَصْعَدُ" },
  { id: "talaba", root: "ط ل ب", en: "to ask for, request", base: "ask for", pastEn: "asked for", past3: "طَلَبَ", pres3: "يَطْلُبُ" },
  { id: "wasala", root: "و ص ل", en: "to arrive", base: "arrive", pastEn: "arrived", past3: "وَصَلَ", pres3: "يَصِلُ" },
  { id: "wadaa", root: "و ض ع", en: "to put, place", base: "put", pastEn: "put", past3: "وَضَعَ", pres3: "يَضَعُ" },
  { id: "nama", root: "ن و م", en: "to sleep", base: "sleep", pastEn: "slept", past3: "نَامَ", pres3: "يَنَامُ", pastC: "نِم" },
  { id: "shahada", root: "ش ه د", en: "to watch, view", base: "watch", pastEn: "watched", past3: "شَاهَدَ", pres3: "يُشَاهِدُ" },
  { id: "safara", root: "س ف ر", en: "to travel", base: "travel", pastEn: "travelled", past3: "سَافَرَ", pres3: "يُسَافِرُ" },
  { id: "istayqaza", root: "ي ق ظ", en: "to wake up", base: "wake up", pastEn: "woke up", past3: "اسْتَيْقَظَ", pres3: "يَسْتَيْقِظُ" },
  { id: "istamaa", root: "س م ع", en: "to listen", base: "listen", pastEn: "listened", past3: "اسْتَمَعَ", pres3: "يَسْتَمِعُ" },
  { id: "tawaddaa", root: "و ض أ", en: "to make wudu", base: "make wudu", pastEn: "made wudu", past3: "تَوَضَّأَ", pres3: "يَتَوَضَّأُ" },
  { id: "arada", root: "ر و د", en: "to want, intend", base: "want", pastEn: "wanted", past3: "أَرَادَ", pres3: "يُرِيدُ", pastC: "أَرَد" },
  { id: "istataa", root: "ط و ع", en: "to be able to", base: "be able", pastEn: "was able", past3: "اسْتَطَاعَ", pres3: "يَسْتَطِيعُ", pastC: "اسْتَطَع" },
  { id: "ihtaja", root: "ح و ج", en: "to need", base: "need", pastEn: "needed", past3: "احْتَاجَ", pres3: "يَحْتَاجُ", pastC: "احْتَج" },

  // ---------- Quran-core verbs ----------
  { id: "khalaqa", root: "خ ل ق", en: "to create", base: "create", pastEn: "created", past3: "خَلَقَ", pres3: "يَخْلُقُ" },
  { id: "alima", root: "ع ل م", en: "to know", base: "know", pastEn: "knew", past3: "عَلِمَ", pres3: "يَعْلَمُ" },
  { id: "jaala", root: "ج ع ل", en: "to make, place", base: "make", pastEn: "made", past3: "جَعَلَ", pres3: "يَجْعَلُ" },
  { id: "akhadha", root: "أ خ ذ", en: "to take, seize", base: "take", pastEn: "took", past3: "أَخَذَ", pres3: "يَأْخُذُ" },
  { id: "dhakara", root: "ذ ك ر", en: "to remember, mention", base: "remember", pastEn: "remembered", past3: "ذَكَرَ", pres3: "يَذْكُرُ" },
  { id: "ghafara", root: "غ ف ر", en: "to forgive", base: "forgive", pastEn: "forgave", past3: "غَفَرَ", pres3: "يَغْفِرُ" },
  { id: "zalama", root: "ظ ل م", en: "to wrong, oppress", base: "wrong", pastEn: "wronged", past3: "ظَلَمَ", pres3: "يَظْلِمُ" },
  { id: "sabara", root: "ص ب ر", en: "to be patient", base: "be patient", pastEn: "was patient", past3: "صَبَرَ", pres3: "يَصْبِرُ" },
  { id: "nasara", root: "ن ص ر", en: "to help, give victory", base: "help", pastEn: "helped", past3: "نَصَرَ", pres3: "يَنْصُرُ" },
  { id: "daraba", root: "ض ر ب", en: "to strike; to set forth (an example)", base: "strike", pastEn: "struck", past3: "ضَرَبَ", pres3: "يَضْرِبُ" },
  { id: "kasaba", root: "ك س ب", en: "to earn", base: "earn", pastEn: "earned", past3: "كَسَبَ", pres3: "يَكْسِبُ" },
  { id: "sajada", root: "س ج د", en: "to prostrate", base: "prostrate", pastEn: "prostrated", past3: "سَجَدَ", pres3: "يَسْجُدُ" },
  { id: "kafara", root: "ك ف ر", en: "to disbelieve, reject", base: "disbelieve", pastEn: "disbelieved", past3: "كَفَرَ", pres3: "يَكْفُرُ" },
  { id: "razaqa", root: "ر ز ق", en: "to provide for", base: "provide", pastEn: "provided", past3: "رَزَقَ", pres3: "يَرْزُقُ" },
  { id: "hamida", root: "ح م د", en: "to praise", base: "praise", pastEn: "praised", past3: "حَمِدَ", pres3: "يَحْمَدُ" },
  { id: "wajada", root: "و ج د", en: "to find", base: "find", pastEn: "found", past3: "وَجَدَ", pres3: "يَجِدُ" },
  { id: "waada", root: "و ع د", en: "to promise", base: "promise", pastEn: "promised", past3: "وَعَدَ", pres3: "يَعِدُ" },
  { id: "anzala", root: "ن ز ل", en: "to send down", base: "send down", pastEn: "sent down", past3: "أَنْزَلَ", pres3: "يُنْزِلُ" },
  { id: "ittabaa", root: "ت ب ع", en: "to follow", base: "follow", pastEn: "followed", past3: "اتَّبَعَ", pres3: "يَتَّبِعُ" },
  { id: "khafa", root: "خ و ف", en: "to fear", base: "fear", pastEn: "feared", past3: "خَافَ", pres3: "يَخَافُ", pastC: "خِف" },
  { id: "taba", root: "ت و ب", en: "to repent, turn back", base: "repent", pastEn: "repented", past3: "تَابَ", pres3: "يَتُوبُ", pastC: "تُب" },
  { id: "zanna", root: "ظ ن ن", en: "to think, assume", base: "think", pastEn: "thought", past3: "ظَنَّ", pres3: "يَظُنُّ", pastC: "ظَنَن" },
  { id: "dalla", root: "ض ل ل", en: "to go astray", base: "go astray", pastEn: "went astray", past3: "ضَلَّ", pres3: "يَضِلُّ", pastC: "ضَلَل" },
  // form IV of أ-م-ن: the expected a-'minu contracts to ūminu
  { id: "amana", root: "أ م ن", en: "to believe", base: "believe", pastEn: "believed", past3: "آمَنَ", pres3: "يُؤْمِنُ", pastC: "آمَن", forms: { pres: { ana: "أُومِنُ" } } },

  /* Derived forms that share a root with a verb already here. Without their own
     table the un-vowelled skeleton would drag them onto the wrong verb —
     ʿallama "he taught" onto ʿalima "he knew", akhraja "he brought out" onto
     kharaja "he went out". */
  { id: "allama", root: "ع ل م", en: "to teach", base: "teach", pastEn: "taught", past3: "عَلَّمَ", pres3: "يُعَلِّمُ" },
  { id: "akhraja", root: "خ ر ج", en: "to bring out, expel", base: "bring out", pastEn: "brought out", past3: "أَخْرَجَ", pres3: "يُخْرِجُ" },
  { id: "kadhdhaba", root: "ك ذ ب", en: "to deny, call it a lie", base: "deny", pastEn: "denied", past3: "كَذَّبَ", pres3: "يُكَذِّبُ" },
  { id: "qatala", root: "ق ت ل", en: "to kill", base: "kill", pastEn: "killed", past3: "قَتَلَ", pres3: "يَقْتُلُ" },
  { id: "ataa", root: "ط و ع", en: "to obey", base: "obey", pastEn: "obeyed", past3: "أَطَاعَ", pres3: "يُطِيعُ", pastC: "أَطَع" },

  // ---------- irregular: hamza-final hollow, and weak-lām (defective) ----------
  {
    id: "awha", root: "و ح ي", en: "to reveal, inspire", base: "reveal", pastEn: "revealed", past3: "أَوْحَى", pres3: "يُوحِي",
    past: { ana: "أَوْحَيْتُ", anta: "أَوْحَيْتَ", anti: "أَوْحَيْتِ", huwa: "أَوْحَى", hiya: "أَوْحَتْ", nahnu: "أَوْحَيْنَا", antum: "أَوْحَيْتُمْ", hum: "أَوْحَوْا" },
    pres: { ana: "أُوحِي", anta: "تُوحِي", anti: "تُوحِينَ", huwa: "يُوحِي", hiya: "تُوحِي", nahnu: "نُوحِي", antum: "تُوحُونَ", hum: "يُوحُونَ" },
  },
  {
    id: "jaa", root: "ج ي أ", en: "to come", base: "come", pastEn: "came", past3: "جَاءَ", pres3: "يَجِيءُ",
    past: { ana: "جِئْتُ", anta: "جِئْتَ", anti: "جِئْتِ", huwa: "جَاءَ", hiya: "جَاءَتْ", nahnu: "جِئْنَا", antum: "جِئْتُمْ", hum: "جَاؤُوا" },
    pres: { ana: "أَجِيءُ", anta: "تَجِيءُ", anti: "تَجِيئِينَ", huwa: "يَجِيءُ", hiya: "تَجِيءُ", nahnu: "نَجِيءُ", antum: "تَجِيئُونَ", hum: "يَجِيئُونَ" },
  },
  {
    id: "shaa", root: "ش ي أ", en: "to will, wish", base: "will", pastEn: "willed", past3: "شَاءَ", pres3: "يَشَاءُ",
    past: { ana: "شِئْتُ", anta: "شِئْتَ", anti: "شِئْتِ", huwa: "شَاءَ", hiya: "شَاءَتْ", nahnu: "شِئْنَا", antum: "شِئْتُمْ", hum: "شَاؤُوا" },
    pres: { ana: "أَشَاءُ", anta: "تَشَاءُ", anti: "تَشَائِينَ", huwa: "يَشَاءُ", hiya: "تَشَاءُ", nahnu: "نَشَاءُ", antum: "تَشَاؤُونَ", hum: "يَشَاؤُونَ" },
  },
  {
    id: "daa", root: "د ع و", en: "to call upon, pray to", base: "call upon", pastEn: "called upon", past3: "دَعَا", pres3: "يَدْعُو",
    past: { ana: "دَعَوْتُ", anta: "دَعَوْتَ", anti: "دَعَوْتِ", huwa: "دَعَا", hiya: "دَعَتْ", nahnu: "دَعَوْنَا", antum: "دَعَوْتُمْ", hum: "دَعَوْا" },
    pres: { ana: "أَدْعُو", anta: "تَدْعُو", anti: "تَدْعِينَ", huwa: "يَدْعُو", hiya: "تَدْعُو", nahnu: "نَدْعُو", antum: "تَدْعُونَ", hum: "يَدْعُونَ" },
  },
  {
    id: "masha", root: "م ش ي", en: "to walk", base: "walk", pastEn: "walked", past3: "مَشَى", pres3: "يَمْشِي",
    past: { ana: "مَشَيْتُ", anta: "مَشَيْتَ", anti: "مَشَيْتِ", huwa: "مَشَى", hiya: "مَشَتْ", nahnu: "مَشَيْنَا", antum: "مَشَيْتُمْ", hum: "مَشَوْا" },
    pres: { ana: "أَمْشِي", anta: "تَمْشِي", anti: "تَمْشِينَ", huwa: "يَمْشِي", hiya: "تَمْشِي", nahnu: "نَمْشِي", antum: "تَمْشُونَ", hum: "يَمْشُونَ" },
  },
  {
    id: "ishtara", root: "ش ر ي", en: "to buy", base: "buy", pastEn: "bought", past3: "اشْتَرَى", pres3: "يَشْتَرِي",
    past: { ana: "اشْتَرَيْتُ", anta: "اشْتَرَيْتَ", anti: "اشْتَرَيْتِ", huwa: "اشْتَرَى", hiya: "اشْتَرَتْ", nahnu: "اشْتَرَيْنَا", antum: "اشْتَرَيْتُمْ", hum: "اشْتَرَوْا" },
    pres: { ana: "أَشْتَرِي", anta: "تَشْتَرِي", anti: "تَشْتَرِينَ", huwa: "يَشْتَرِي", hiya: "تَشْتَرِي", nahnu: "نَشْتَرِي", antum: "تَشْتَرُونَ", hum: "يَشْتَرُونَ" },
  },
];
