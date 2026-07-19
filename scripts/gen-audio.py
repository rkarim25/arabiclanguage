# Pre-generate neural TTS audio for every word and sentence the site teaches,
# using Microsoft Edge's free neural voices (edge-tts). This is what fixes the
# "very very mechanical" browser voice: real recorded-quality audio shipped as
# static files, played by speak() in app.js with speechSynthesis as fallback.
#
#   pip install edge-tts
#   python scripts/gen-audio.py          (incremental — skips files that exist)
#
# Sources: data/lexicon.json (every Arabic word + its English gloss) and
# data/sentences.json (every conjugated sentence + its English line).
# Output:  audio/ar/<hash>.mp3, audio/en/<hash>.mp3,
#          data/audio-manifest.json  { "ar": {"<norm text>": "<hash>"}, "en": {...} }
# Re-run after gen-lexicon.js / sentences.json changes.

import asyncio, hashlib, json, os, re, sys

try:
    import edge_tts
except ImportError:
    sys.exit("pip install edge-tts first")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
AUDIO = os.path.join(ROOT, "audio")

AR_VOICE = "ar-SA-HamedNeural"   # steady, clear male — good for study words
EN_VOICE = "en-GB-RyanNeural"    # natural British male

# normalization must MATCH js/app.js normalizeAr (Arabic) / the en key rule in speak()
TASHKEEL = re.compile(r"[ً-ٰـۖ-ۭ]")
def norm_ar(s):
    s = TASHKEEL.sub("", s)
    s = re.sub(r"[أإآٱ]", "ا", s)
    s = s.replace("ى", "ي")
    s = re.sub(r"[^؀-ۿ\s]", "", s)
    return re.sub(r"\s+", " ", s).strip()
def norm_en(s):
    return re.sub(r"\s+", " ", str(s).strip().lower())

def h(key):
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]

jobs = {}  # (lang, norm) -> speak-text (first wins; keep tashkeel — it helps TTS)
def add(lang, text):
    text = str(text or "").strip()
    if not text: return
    n = norm_ar(text) if lang == "ar" else norm_en(text)
    if not n or (lang == "ar" and len(n) < 2) or (lang, n) in jobs: return  # en allows "I"
    jobs[(lang, n)] = text

lex = json.load(open(os.path.join(DATA, "lexicon.json"), encoding="utf-8"))
for entry in lex.values():
    add("ar", entry[0])
    add("en", entry[2])

# English glosses from EVERY source directly — the lexicon dedupes by Arabic
# key, but cards serve their own source's gloss, so a lexicon-only sweep left
# 17% of spoken English with no clip (the robot voice Reza flagged twice).
def loadd(f): return json.load(open(os.path.join(DATA, f), encoding="utf-8"))
for g in loadd("everyday.json")["groups"]:
    for m in g["members"]: add("en", m.get("en"))
for f in loadd("families.json")["families"]:
    for m in f["members"]: add("en", m.get("en"))
for w in loadd("quran-core.json")["words"]: add("en", w.get("en"))
for f in sorted(os.listdir(DATA)):
    if re.match(r"^story-\d+\.json$", f):
        for w in loadd(f).get("vocab", []): add("en", w.get("en"))
for s in loadd("verses.json")["surahs"]:
    for v in s["verses"]:
        for w in v["words"]: add("en", w[2])

# the conversational phrase deck — full sentences, both languages
for g in loadd("phrases.json")["groups"]:
    for m in g["members"]:
        add("ar", m.get("ar"))
        add("en", m.get("en"))

# fixed spoken UI lines (audio.html)
add("en", "Audio coach. Listen, and recall the meaning before I say it.")

sen = json.load(open(os.path.join(DATA, "sentences.json"), encoding="utf-8"))
PERSON_EN = {"ana": "I", "nahnu": "we", "hum": "they"}
for v in sen["verbs"]:
    add("ar", v["obj"]["ar"])
    add("en", v["obj"]["en"])
    for pk, tenses in v["forms"].items():
        for tk, form in tenses.items():
            add("ar", form)
            add("ar", f'{form} {v["obj"]["ar"]}')
            en_verb = v["past"] if tk == "past" else ("will " + v["base"] if tk == "fut" else v["base"])
            add("en", f'{PERSON_EN.get(pk, pk)} {en_verb} {v["obj"]["en"]}')

os.makedirs(os.path.join(AUDIO, "ar"), exist_ok=True)
os.makedirs(os.path.join(AUDIO, "en"), exist_ok=True)

manifest = {"ar": {}, "en": {}}
todo = []
for (lang, n), text in jobs.items():
    name = h(lang + "|" + n)
    manifest[lang][n] = name
    path = os.path.join(AUDIO, lang, name + ".mp3")
    if not (os.path.exists(path) and os.path.getsize(path) > 500):
        todo.append((lang, text, path))

print(f"{len(jobs)} clips total, {len(todo)} to generate")

async def gen(sem, lang, text, path, stats):
    async with sem:
        for attempt in range(3):
            try:
                voice = AR_VOICE if lang == "ar" else EN_VOICE
                spoken = text if lang == "ar" else text.replace("ﷺ", "").strip() or text
                await edge_tts.Communicate(spoken, voice, rate="-10%").save(path)
                if os.path.getsize(path) > 500:
                    stats["ok"] += 1
                    if stats["ok"] % 50 == 0: print(f'{stats["ok"]}/{len(todo)} done')
                    return
            except Exception as e:
                await asyncio.sleep(2 * (attempt + 1))
        stats["fail"] += 1
        if os.path.exists(path): os.remove(path)
        print("FAILED:", lang, text[:40])

async def main():
    sem = asyncio.Semaphore(6)
    stats = {"ok": 0, "fail": 0}
    await asyncio.gather(*(gen(sem, l, t, p, stats) for l, t, p in todo))
    # drop manifest entries whose file didn't materialize
    for lang in ("ar", "en"):
        manifest[lang] = {n: name for n, name in manifest[lang].items()
                          if os.path.exists(os.path.join(AUDIO, lang, name + ".mp3"))}
    json.dump(manifest, open(os.path.join(DATA, "audio-manifest.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    print(f'generated {stats["ok"]}, failed {stats["fail"]}, manifest: '
          f'{len(manifest["ar"])} ar + {len(manifest["en"])} en')

asyncio.run(main())
