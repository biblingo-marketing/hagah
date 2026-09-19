# -*- coding: utf-8 -*-
"""
Builds src/content/romans.json from the official BSB release text.

CHK-1: boundaries fall at discourse units. CHK-5: 4±1 meaningful units,
~30-60 words in English. Each chunk's `lines` ARE those meaningful units, which
also gives CHK-4 (one fixed visual layout, no reflow between sessions) and
ACQ-5 (middle lines identifiable for extra rehearsal) for free.

The script asserts that the chunk lines reassemble into the BSB text exactly.
If a single word is mistyped, this build fails rather than shipping a wrong text.
"""
import json, re, sys, unicodedata, pathlib

SRC = pathlib.Path("/tmp/claude-0/-home-user-hagah/9b78ee47-a266-5344-9a2e-46360e92d703/scratchpad/romans_1_5.json")
OUT = pathlib.Path(__file__).resolve().parent.parent / "src" / "content" / "romans.json"

src = json.loads(SRC.read_text(encoding="utf-8"))
V = src["verses"]

ATTRIBUTION = ("Scripture quotations are from the Berean Standard Bible (BSB), "
               "which is in the public domain and available at https://bereanbible.com")

# ── Chunk table. Hand-authored; `lines` are the meaningful units. ──────────────
# refs: the verses the chunk spans.  Sub-verse splits are noted in `covers`,
# which is what the assertion checks against.
CHUNKS = [
 dict(id="rom-1-001", ref="1:1–2", covers=["1:1","1:2"], landmark="Greeting · the sender",
   cue="Paul, a servant of Christ Jesus",
   lines=[
     "Paul, a servant of Christ Jesus,",
     "called to be an apostle,",
     "and set apart for the gospel of God—",
     "the gospel He promised beforehand through His prophets in the Holy Scriptures,",
   ],
   speechAct="Paul names himself by office, then hands the letter straight over to its subject.",
   seamNote="Opening of the letter. Nothing precedes it."),

 dict(id="rom-1-002", ref="1:3–4", covers=["1:3","1:4"], landmark="Greeting · what the gospel is about",
   cue="regarding His Son",
   lines=[
     "regarding His Son,",
     "who was a descendant of David according to the flesh,",
     "and who through the Spirit of holiness was declared with power to be the Son of God by His resurrection from the dead:",
     "Jesus Christ our Lord.",
   ],
   speechAct="The gospel is defined by a person, in two phases: descended from David, declared Son of God.",
   seamNote="“Regarding His Son” hangs directly on “the gospel of God” — the gospel just named now gets its content."),

 dict(id="rom-1-003", ref="1:5–6", covers=["1:5","1:6"], landmark="Greeting · Paul's commission",
   cue="Through Him and on behalf of His name",
   lines=[
     "Through Him and on behalf of His name,",
     "we received grace and apostleship",
     "to call all those among the Gentiles to the obedience that comes from faith.",
     "And you also are among those who are called to belong to Jesus Christ.",
   ],
   speechAct="Paul's apostleship is derived, not self-generated, and it aims at Gentile obedience.",
   seamNote="“Through Him” reaches back to “Jesus Christ our Lord” — the Son just named is the one the commission comes through."),

 dict(id="rom-1-004", ref="1:7", covers=["1:7"], landmark="Greeting · the addressees",
   cue="To all in Rome",
   lines=[
     "To all in Rome who are loved by God",
     "and called to be saints:",
     "Grace and peace to you",
     "from God our Father and the Lord Jesus Christ.",
   ],
   speechAct="The sentence lands on its recipients and turns into a blessing.",
   seamNote="The opening sentence has run since verse 1 without naming anyone; this is the addressee it has been waiting for."),

 dict(id="rom-1-005", ref="1:8–9a", covers=["1:8","1:9a"], landmark="Thanksgiving · the oath",
   cue="First, I thank my God",
   lines=[
     "First, I thank my God through Jesus Christ for all of you,",
     "because your faith is being proclaimed all over the world.",
     "God, whom I serve with my spirit in preaching the gospel of His Son,",
     "is my witness",
   ],
   speechAct="Thanksgiving, then an oath: Paul calls God as witness to his praying.",
   seamNote="The greeting is closed. “First” opens the body of the letter with the thanksgiving that conventionally follows it."),

 dict(id="rom-1-006", ref="1:9b–10", covers=["1:9b","1:10"], landmark="Thanksgiving · the prayer",
   cue="how constantly I remember you",
   lines=[
     "how constantly I remember you",
     "in my prayers at all times,",
     "asking that now at last by God’s will",
     "I may succeed in coming to you.",
   ],
   speechAct="The content of the oath: unceasing prayer, with one request — safe arrival.",
   seamNote="“Is my witness” needs an object; “how constantly” supplies what God is being called to witness."),

 dict(id="rom-1-007", ref="1:11–12", covers=["1:11","1:12"], landmark="Thanksgiving · why he wants to come",
   cue="For I long to see you",
   lines=[
     "For I long to see you",
     "so that I may impart to you some spiritual gift to strengthen you,",
     "that is, that you and I may be mutually encouraged by each other’s faith.",
   ],
   speechAct="He states his reason for coming, then corrects it mid-sentence into mutual exchange.",
   seamNote="“For” gives the ground of the prayer just mentioned: he asks to come because he longs to come."),

 dict(id="rom-1-008", ref="1:13", covers=["1:13"], landmark="Thanksgiving · repeated attempts",
   cue="I do not want you to be unaware, brothers",
   lines=[
     "I do not want you to be unaware, brothers,",
     "how often I planned to come to you",
     "(but have been prevented from visiting until now),",
     "in order that I might have a harvest among you,",
     "just as I have had among the other Gentiles.",
   ],
   speechAct="A disclosure formula: he has tried to come before, and been stopped.",
   seamNote="The longing of verse 11 becomes a record — he has not merely wished to come, he has planned it repeatedly."),

 dict(id="rom-1-009", ref="1:14–15", covers=["1:14","1:15"], landmark="Thanksgiving · the obligation",
   cue="I am obligated",
   lines=[
     "I am obligated both to Greeks and non-Greeks,",
     "both to the wise and the foolish.",
     "That is why I am so eager to preach the gospel",
     "also to you who are in Rome.",
   ],
   speechAct="The plans rest on a debt: he owes the gospel to everyone, Rome included.",
   seamNote="The harvest among the Gentiles is grounded — the reason he keeps planning to come is that he owes them."),

 dict(id="rom-1-010", ref="1:16–17", covers=["1:16","1:17"], landmark="Thesis · the righteousness of God",
   cue="I am not ashamed of the gospel",
   lines=[
     "I am not ashamed of the gospel,",
     "because it is the power of God for salvation to everyone who believes,",
     "first to the Jew, then to the Greek.",
     "For the gospel reveals the righteousness of God that comes by faith from start to finish,",
     "just as it is written: “The righteous will live by faith.”",
   ],
   speechAct="The letter's thesis: the gospel saves because it reveals God's righteousness, received by faith.",
   seamNote="Eagerness to preach is explained by confidence — and the letter states the theme it will argue for eleven chapters."),
]

# ── Sub-verse split points. A verse listed here is divided at the given text. ──
SPLITS = { "1:9": "how constantly I remember you" }

def norm(s):
    s = unicodedata.normalize("NFC", s)
    s = s.replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()

def words(s):
    return norm(s).split(" ")

# Expand covers like "1:9a"/"1:9b" into their actual text.
def covered_text(ref):
    m = re.fullmatch(r"(\d+:\d+)([ab])?", ref)
    if not m:
        sys.exit(f"bad ref in covers: {ref}")
    base, part = m.group(1), m.group(2)
    if base not in V:
        sys.exit(f"verse not in source: {base}")
    full = norm(V[base])
    if part is None:
        return full
    if base not in SPLITS:
        sys.exit(f"{base} split into parts but no split point declared")
    marker = norm(SPLITS[base])
    i = full.find(marker)
    if i < 0:
        sys.exit(f"split marker not found in {base}: {marker!r}")
    return full[:i].strip() if part == "a" else full[i:].strip()

errors = []
report = []
for c in CHUNKS:
    built = norm(" ".join(c["lines"]))
    expected = norm(" ".join(covered_text(r) for r in c["covers"]))
    if built != expected:
        # show the first divergent word so a typo is trivial to find
        b, e = words(built), words(expected)
        k = next((i for i in range(min(len(b), len(e))) if b[i] != e[i]), min(len(b), len(e)))
        errors.append(f"{c['id']} ({c['ref']}) diverges at word {k+1}:\n"
                      f"   built:    …{' '.join(b[max(0,k-4):k+5])}\n"
                      f"   expected: …{' '.join(e[max(0,k-4):k+5])}")
    n = len(words(built))
    units = len(c["lines"])
    flags = []
    if n > 60: flags.append("OVER 60 words (CHK-5)")
    if n < 30: flags.append("under 30 words (CHK-5)")
    if not (3 <= units <= 5): flags.append(f"{units} units, outside 4±1 (CHK-5)")
    report.append((c["id"], c["ref"], n, units, "; ".join(flags)))

# Continuity: chunks must tile 1:1-1:17 with no gap and no overlap.
tiled = norm(" ".join(norm(" ".join(covered_text(r) for r in c["covers"])) for c in CHUNKS))
source = norm(" ".join(V[f"1:{i}"] for i in range(1, 18)))
if tiled != source:
    errors.append("chunks do not tile Romans 1:1-17 exactly (gap or overlap)")

print(f"{'chunk':<12}{'ref':<10}{'words':>6}{'units':>7}   flags")
for r in report:
    print(f"{r[0]:<12}{r[1]:<10}{r[2]:>6}{r[3]:>7}   {r[4]}")

if errors:
    print("\nFAILED:")
    for e in errors: print(" -", e)
    sys.exit(1)

sections = []
seen = set()
for c in CHUNKS:
    head = c["landmark"].split(" · ")[0]
    if head not in seen:
        seen.add(head); sections.append({"id": head.lower().replace(" ", "-"), "title": head})

out = {
  "_comment": "Hand-editable. `lines` are the meaningful units (CHK-5) and are also the fixed visual layout (CHK-4). Boundaries become immutable once practiced against (CHK-1). Rebuild/verify with: python3 tools/build_chunks.py",
  "program": {
    "id": "romans",
    "title": "Romans",
    "subtitle": "Chapters 1–5",
    "translationId": "BSB",
  },
  "translation": {
    "id": "BSB",
    "name": "Berean Standard Bible",
    "attribution": ATTRIBUTION,
    "publicDomain": True,
  },
  "sections": sections,
  "chunks": [
    {
      "id": c["id"], "ref": c["ref"], "landmark": c["landmark"],
      "sectionId": c["landmark"].split(" · ")[0].lower().replace(" ", "-"),
      "cue": c["cue"],
      "lines": c["lines"],
      "text": norm(" ".join(c["lines"])),
      "wordCount": len(words(" ".join(c["lines"]))),
      "speechAct": c["speechAct"],
      "seamNote": c["seamNote"],
    } for c in CHUNKS
  ],
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"\nOK — {len(CHUNKS)} chunks verified against BSB source → {OUT.relative_to(OUT.parent.parent.parent)}")
