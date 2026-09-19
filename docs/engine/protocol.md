# Hagah Engine Protocol

Status: **draft, awaiting Nick's approval.** Once approved this file is **read-only for agents**, like the decisions table. Changes arrive as reviewed diffs, never as incidental edits during a feature row.

Purpose: every practice mechanic in Hagah, stated as an implementable invariant with its component, parameters, test, evidence tier and confidence. Agents implement against invariant IDs. If an acceptance file and this file disagree, this file wins and the acceptance file is corrected.

Sources: `scripture-memorization/evidence-review-summary.md` and `scripture-memorization/research-memos-phases-4-6.md` in the Bible & Theology project. Citations below are traceable to those memos, which carry their own verification notes — several well-known items there are flagged as cited from memory rather than confirmed. Nothing in this file should be repeated in marketing copy as a research claim without checking the memo's verification section first.

## 0. How to read an invariant

| Field | Meaning |
| --- | --- |
| ID | Stable reference. Acceptance files cite these. Never renumber. |
| Rule | What the code must do. Written so a reviewer can falsify it. |
| Params | Named constants. All live in `lib/engine/params.dart`, never inline. |
| Test | The check that proves it. Unit, widget, or data assertion. |
| Evidence | **A** replicated/meta-analytic · **B** single study or contested · **C** extrapolation, practitioner lore, or synthesis across paradigms. |
| Confidence | My confidence that the rule is right *for this product*, which is not the same as the evidence tier. A C-tier rule with low cost and high plausibility can still be worth shipping. |

A rule whose confidence is below moderate ships as a **tunable with a default and an instrument**, never as a hardcoded assumption.

---

## 1. Acquisition (Encode mode)

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| ACQ-1 | A chunk with zero reps opens in a cue-only state: the user attempts the text before any reveal. The attempt is never scored. | — | Widget: no path reaches the full-text state for `reps == 0` without passing the guess state | B (pretesting effect; prose extensions are current, live research) | Moderate |
| ACQ-2 | First exposure prompts one **aloud** read, not a silent one. | `aloudPromptOnFirstExposure = true` | Widget: prompt present at first reveal | A (production effect; extends to text passages and endures a week) | High for direction, moderate for magnitude — the between-subjects effect is roughly half the within-subject one |
| ACQ-3 | Overt recall follows, with correct-answer feedback shown **only after a failed or hesitant attempt**. A clean attempt advances without re-showing the text. | `feedbackOnCorrect = false` | Unit: feedback state unreachable when attempt is graded clean | A (feedback after correct responses adds essentially nothing regardless of confidence; testing effect g≈0.73 with feedback vs 0.39 without) | High |
| ACQ-4 | Acquisition stops at criterion. No "one more time" affordance. | `cleanRecitationsToStop = 3` | Widget: stop is forced at criterion; no continue button | A for criterion-based practice; the specific number is contested — see note below | Moderate |
| ACQ-5 | On each re-read, the chunk's middle lines are visually weighted and get extra rehearsal turns. | `middleWeight = 1.5` | Unit: rehearsal allocation function | B/C (serial position at first exposure) | Low-moderate → tunable, instrumented |
| ACQ-6 | Meaning aids are **bounded and post-retrieval**: one speech-act line per chunk and one seam note, shown *after* the recall attempt, never as a lesson before it. | `maxMeaningLinesPerChunk = 2` | Data: pipeline output rejects chunks with longer notes. Widget: notes unreachable before first attempt | A, with a sharp caveat: teaching the analytic strategy *alone* **hurt** verbatim recall (33% vs 57%), while "active experiencing" beat deliberate memorization (60% vs 50%) | High on the caveat |
| ACQ-7 | The planner may offer a short evening re-recitation of the day's unit, with first retrieval scheduled the next morning. | `eveningMicroBlockMinutes = 3`, `sleepBracketEnabled = true` | Unit: planner emits the pair when an evening block exists | C (monastic practice, huffaz self-report; convergent across traditions) | Low-moderate → off by default, offered in onboarding |

**Note on ACQ-4.** The sources disagree. The evidence review specifies three clean recitations; the acquisition memo recommends blocked attempts "until it can be recited once without support," and the successive-relearning literature places its criterion *across spaced sessions*, not within one. In-session overlearning past criterion has no support. Ship `cleanRecitationsToStop = 3`, instrument time-to-criterion and next-day accuracy, and treat 1 vs 3 as experiment **E1**.

---

## 2. Chunking and cues

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| CHK-1 | Boundaries fall at discourse units and are **immutable** once any `review` row references the chunk. | — | DB constraint + integration test attempting a boundary move | A/B (verbatim recall respects clause/intonation units) | High |
| CHK-2 | Every chunk carries a compound cue: optional spoken verse number, the opening clause (Greek: the opening particle), and a structural landmark (book, section, position in the argument). | `speakVerseNumbers = true` (user toggle) | Pipeline test: no chunk ships without all three cue components | C (verse-number addressing) + B (performance-cue theory) | Moderate-high |
| CHK-3 | The retrieval cue for a chunk card is **the preceding clause**. Scattered, out-of-order verse cues are never used as a quiz format. | — | Unit: cue construction asserts adjacency | A/B (part-list cueing impairs the un-cued remainder; impairment shrinks when cues respect the material's serial organization, which adjacency does and scattering does not) | Moderate-high |
| CHK-4 | One fixed visual layout per program: same line breaks, same typography, same view. Layout does not reflow between sessions. | — | Golden test on chunk rendering | C (page-image encoding; convergent with "photograph the verse" practice) | Moderate, low cost |
| CHK-5 | Target chunk size is 4±1 meaningful units, ~30–60 words in English and fewer in Greek early on. The pipeline reports its length distribution and flags outliers for human review. | `targetUnitsPerChunk = 4`, `maxWordsPerChunk = 60` | Pipeline report asserted in CI | B (working-memory chunk capacity is nearer 4 than 7) | Moderate |
| CHK-6 | Above the chunk chain sits a **hierarchy**: program → section → paragraph, each with a one-word landmark. The app can start practice at any node. | — | Unit: every chunk resolves to a node path | B (expert memorizers build content-addressable hierarchies; a pure serial chain forces a restart from the beginning after any lapse) | High — this is the main structural risk in whole-book work |

---

## 3. Scheduling

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| SCH-1 | FSRS schedules chunk cards. Desired retention 0.90. The user sees a color, never a number. | `desiredRetention = 0.90` | Unit against the reference implementation | A (FSRS benchmarked on ~700M reviews) | High |
| SCH-2 | Every boundary gets its own **seam card**: cue = final clause of chunk N, answer = opening clause of N+1. Created when N+1 is first encoded. | — | Unit: seam card count == chunk count − 1 per program | C by mechanism, but the failure mode is named independently by practitioners and by the transition literature | High |
| SCH-3 | Whole-program integrity runs are on a **fixed expanding schedule**, not FSRS. | `integrityDays = [14, 28, 56, 90]` | Unit | C (traditional fixed-cycle maintenance; maintenance is required indefinitely — nothing supports a passage "staying" unmaintained) | Moderate-high |
| SCH-4 | Three tiers per day: **new** (one unit), **recent** (everything from the last ~3–4 weeks, daily), **consolidated** (rotation). Graduation from recent to consolidated is by criterion — k consecutive clean daily recitations — never by calendar. | `recentTierDays = 28`, `graduationCleanDays = 3` | Unit: tier assignment and graduation | A (successive relearning: ~3 spaced relearning sessions is the efficiency sweet spot; three spaced recalls ≈68% at one week vs 26% massed) mapped onto C (hifz sabaq/sabqi/manzil) | Moderate-high |
| SCH-5 | A stumble on a consolidated chunk demotes it to the recent tier. | — | Unit | C | High, low cost |
| SCH-6 | **Acquisition blocks; maintenance interleaves.** An acquisition session contains one unit only. Mixing across programs happens in maintenance sessions. | `newUnitsPerAcquisitionSession = 1` | Unit: planner never emits two new units in one block | A with a material caveat: interleaving averages g=0.42 overall but is **negative for vocabulary-like material (g=−0.39)**, and initial sequence acquisition resembles that case more than it resembles category learning | Moderate |
| SCH-7 | A **random-entry drill** runs weekly: the app names a node ("start at 8:18") and the user begins there. | `randomEntryDrillsPerWeek = 1` | Unit: drill scheduled | B (recovery from a lapse depends on prepared entry points) + C (Vedic permutation recitation is the traditional answer to the same problem) | High |
| SCH-8 | No active program goes longer than `maxNeglectDays` without a retrieval touch. | `maxNeglectDays = 14` | Unit: planner raises neglected material | A/B (retrieval-induced forgetting is a transient accessibility effect that retrieval undoes; it is a reason not to neglect material for weeks, not a reason to avoid practicing the competing program) | Moderate |

---

## 4. Free recall (Run card)

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| RUN-1 | The run card is read-only. No text is shown, no interaction is expected during the block, grading happens afterward. | — | Widget | A (free recall is the most potent format when it succeeds; showing text converts it to restudy) | High |
| RUN-2 | Material enters the run tier only at **≥80% clause accuracy** on its last check. Below that it returns to cued practice. | `runEligibilityAccuracy = 0.80` | Unit: eligibility filter | A (retrieval-success constraint: free recall g=0.81 in the high-success-with-feedback subset, but its benefit collapses when attempts mostly fail without feedback) | Moderate-high; the exact threshold is a judgment call → **E5** |
| RUN-3 | Run order: newest unit first, then consolidated, then fragile, then a seams-only pass, then the newest unit again. | `seamsPassMinutes = 5` | Unit: ordering function | C (synthesis; gives the newest material two spaced retrievals within one session) | Moderate |
| RUN-4 | Post-run grading captures **hesitations**, not just pass/fail. Flagged chunks enter the next audio session's repair queue. | — | Unit: repair queue populated from run flags | A (covert retrieval works when actually completed; its weakness is unmonitored drift) + A (feedback belongs on the errors) | High |
| RUN-5 | A weekly **overt** check — aloud or typed, scored against the text — is scheduled regardless of how well silent recall is going. | `overtCheckPerWeek = 1` | Unit | A (verbatim decays toward paraphrase unless verbatim is repeatedly required; covert recall cannot detect its own drift) | High |

---

## 5. Audio (Commute mode)

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| AUD-1 | The loop is **anticipate-then-check**: cue → silence → user recites → chunk plays. Simultaneous shadowing is never the memory mechanic. | — | Widget: player state machine | A by components (anticipation is cued recall; the audio is feedback within 1–2 s; even failed attempts potentiate later learning), C as a synthesis. Simultaneous shadowing is production-enhanced *restudy*, and concurrent articulation occupies the phonological loop that subvocal retrieval needs | High |
| AUD-2 | On a self-reported success the answer audio is **skipped** by default and the player advances. | `playAnswerOnSuccess = false` | Widget | A (feedback after correct retrieval adds essentially nothing) | Moderate-high — verify it does not feel abrupt in the car (D5) |
| AUD-3 | Silence scales with chunk length. | `pausePerWord = 0.45` (seconds) | Unit | C | Moderate, tunable in-app |
| AUD-4 | **One fixed voice and reading per program per language.** Voices are never swapped mid-program. | — | Data: program pins an audio profile | C, but convergent across every tradition that achieves verbatim stability; switching recordings mid-project introduces avoidable interference | High |
| AUD-5 | If the user records their own reading, that recording is preferred over TTS for their review audio. | `preferSelfRecordedAudio = true` | Unit: audio source resolution order | A (read aloud > hear own voice > hear another's voice > read silently, indicating a self-referential benefit beyond articulation) | Moderate-high — a real feature, cheap to build |
| AUD-6 | Simultaneous shadowing exists only as an explicitly labeled **Greek pronunciation** mode, brief, on new material, and is never counted as a review. | — | Unit: shadow sessions write no `review` rows | A/B (the L2 shadowing literature supports phonology, listening and fluency; it makes no claim about memory for a known text) | High |

---

## 6. Scoring and error classification

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| DIFF-1 | Every miss is **classified**, not just counted: synonym substitution, connective swap, omission, insertion, wrong-paragraph start. The class is stored on the `review` row. | — | Unit on a labeled fixture set | A (verbatim recall is regenerated from meaning plus an activated lexical set, so errors are fluent substitutions clustering at seams) | High — this log is what makes a sequence-aware model fittable later |
| DIFF-2 | Normalization before diffing: case, punctuation, diacritics, final sigma. Greek scoring is labeled experimental in the UI. | — | Unit | Practical; no engine has a Koine acoustic model | High |
| DIFF-3 | **Translation drift** is treated as an error class, not a pass. A fluent paraphrase scores as a miss and is surfaced in the weekly check. | — | Unit: paraphrase fixtures fail | A (gist intrusion in verbatim recall; English prose is dangerously paraphrasable, Greek less so) | High |
| DIFF-4 | Speech scoring never gates progress. Any flow that requires it has a typed or self-graded path. | — | Integration: full loop completes with recognition disabled | Category evidence: speech recognition is the most-complained-about feature in competing apps at passage scale | High |

---

## 7. Interference and parallels

This section has **no counterpart in any competing product** and follows from the interference memo. It matters as soon as a user holds two Pauline letters.

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| INT-1 | The pipeline detects near-duplicate strings across the user's active programs and generates **divergence cards**: occurrences side by side, first divergence point highlighted. | `divergenceMinTokens = 5` | Pipeline test on known Pauline formulae | A by mechanism (when a change is noticed at study and recollected later, the earlier material *facilitates* instead of interfering) + C at text scale | High by mechanism, moderate at scale |
| INT-2 | Before a new program that shares formulae with an active one, the planner requires a **full retrieval pass** of the existing program. | — | Unit: gate fires | A (testing before interpolated learning prevents proactive interference build-up and reduces prior-list intrusions; a reminder test can eliminate retroactive interference) | High |
| INT-3 | Discriminating cues are **structural addresses** (book, section, argument position), never environmental context. | — | Cue construction test | A (environmental context effects are reliable but small and easily overshadowed; organizational context is the strong discriminator) | High |
| INT-4 | Divergence cards are scheduled as their own card kind, not folded into chunk cards. | — | Unit | C | Moderate |

---

## 8. Planner

| ID | Rule | Params | Test | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- |
| PLAN-1 | New material is introduced only in screen blocks. Audio and recall blocks never carry first exposure. | — | Unit | A (divided attention degrades encoding; the car is for retrieval of learned material, not acquisition) | High |
| PLAN-2 | Pace cap. | `maxNewChunksPerScreenDay = 2`, default 1 | Unit | B/C (overload cliff; working-memory chunk capacity) | Moderate-high |
| PLAN-3 | Missed days re-plan forward **silently**. No debt counter, no "you are behind," no streak. | — | Unit: plan regeneration after a gap | Product judgment, supported by category review evidence that rigid schedules and review pile-ups drive abandonment | High |
| PLAN-4 | Onboarding requires the user to consider at least one non-screen block; proceeding with none shows what they lose. | `requireNonScreenBlock = true` | Widget | Thesis-critical; D1 confirms hands-free contexts are where practitioners' review time actually is | Moderate — this is the product bet, so it is instrumented, not enforced |
| PLAN-5 | A weekly verification block is always scheduled (RUN-5). | — | Unit | A | High |
| PLAN-6 | `languageMode ∈ {en, grc, both}`, default `en` for new users. Concurrent bilingual learning is opt-in and labeled untested. | `languageMode = en` | Unit | Explicitly flagged as an open assumption in the evidence review; no study exists on memorizing the same long text verbatim in two languages | Unknown → **E2** |
| PLAN-7 | Within a program, a Greek unit is scheduled after the English unit of the same text, so meaning constraints are available. | `greekFollowsEnglish = true` | Unit | B/C (words and melody learned together are recalled better together; comprehension accelerates verbatim acquisition even though it is not a prerequisite) | Moderate |

---

## 9. Safety and claims

| ID | Rule | Evidence | Confidence |
| --- | --- | --- | --- |
| SAFE-1 | Commute mode requires **no screen interaction**. Grading is by large targets, headset button, or voice. First use shows a brief safety notice, and a passive-listening mode is one tap away. | A (hands-free conversation imposes a genuine cognitive load and produces inattention blindness; the cost is cognitive, not manual, so hands-free does not remove it — and generative tasks like reciting are more disruptive than listening) | High |
| SAFE-2 | No copy anywhere claims Hagah improves memory in general. Claims are domain-specific: you will know this text. | A (the best-controlled study of whole-text memorizers found **no far transfer** — memorizers matched controls on standard memory tests while showing extraordinary domain-specific recall) | High |
| SAFE-3 | No learning-styles framing. Dual coding is a legitimate design idea and is not the same claim. | A (no empirical support for matching instruction to a preferred style) | High |
| SAFE-4 | Greek scoring is labeled experimental wherever it appears. | Practical | High |

---

## 10. Tunables

Every value here lives in one file, is overridable per user where marked, and emits a PostHog property so its effect is measurable.

| Param | Default | Range | Per-user | Why it is a tunable |
| --- | --- | --- | --- | --- |
| `cleanRecitationsToStop` | 3 | 1–3 | no | Sources disagree (ACQ-4) |
| `middleWeight` | 1.5 | 1.0–2.0 | no | Weak evidence base |
| `graduationCleanDays` | 3 | 2–5 | no | Criterion sweet spot is approximate |
| `recentTierDays` | 28 | 14–40 | no | No data on optimal sabqi length |
| `runEligibilityAccuracy` | 0.80 | 0.6–0.95 | yes | Threshold is a judgment call |
| `pausePerWord` | 0.45 s | 0.3–0.8 | yes | Speaking rate varies |
| `maxNewChunksPerScreenDay` | 1 | 1–2 | yes | Overload cliff is individual |
| `desiredRetention` | 0.90 | 0.85–0.95 | no | FSRS standard |
| `integrityDays` | 14/28/56/90 | — | no | No data for verbatim text |
| `maxNeglectDays` | 14 | 7–30 | no | Derived from transience of retrieval-induced forgetting |
| `playAnswerOnSuccess` | false | — | yes | Feels abrupt to some users (test in D5) |
| `speakVerseNumbers` | true | — | yes | Native anti-seam device for the Davis-method audience; not universal |

---

## 11. Open questions as instrumented experiments

None of these is answered by the literature. Each ships as a logged comparison rather than a guess.

| ID | Question | How it is measured | Gate |
| --- | --- | --- | --- |
| E1 | 1 vs 3 clean recitations at acquisition | Randomize per user at onboarding; compare next-morning first-retrieval accuracy | 200 users with ≥14 days |
| E2 | Greek and English concurrently vs sequentially | Compare `languageMode = both` users against sequential adopters on chunk stability and drop-off | Needs enough Greek users to be possible at all — may never resolve |
| E3 | Does a long interval add anything for richly-cued verbatim text? | Log FSRS interval vs observed accuracy; look for a plateau | 30 days of review logs |
| E4 | Does middle-weighting help? | A/B `middleWeight` 1.0 vs 1.5 | 200 users |
| E5 | Right run-eligibility threshold | Correlate pre-run accuracy with post-run hesitation counts | 500 run sessions |
| E6 | Sequence-aware scheduler vs FSRS | Shadow model logs predicted retrievability per review; compare calibration | 30 days; promotion requires Nick's approval |

---

## 12. What the evidence does not support

Stated so no agent, and no future version of this document, quietly adds them.

- **Any general memory, IQ or academic benefit.** The literature making these claims is uncontrolled and self-selected; the one well-controlled study is null. Do not build features or copy around it.
- **Simultaneous shadowing as a memory technique.** It is restudy, and the concurrent articulation blocks the retrieval it appears to be practicing.
- **Out-of-order verse quizzing** as a review format. Adjacent cues only.
- **Method of loci for word-level verbatim text.** It is well-proven for ordered lists — which a program's paragraph sequence is, so it is legitimate at the hierarchy level (CHK-6) — but competitive memorizers themselves fall back on repetition for exact wording, and there is no research on verbatim-text mnemonics.
- **Unbounded cumulative daily review.** The standard whole-book method prescribes reciting everything accumulated so far each day; at scale that exceeds its own stated time cap, which implicitly requires a rotation the method never specifies. SCH-4 is Hagah's answer, and the divergence from a method this audience knows should be explained in-app, not hidden.
- **Interleaving within an acquisition session.** For arbitrary, low-similarity material, blocking wins.
- **A promise that memorized text stays without maintenance.** Nothing supports it; section boundaries persist while interiors decay.

## 13. The listener gap

Every tradition that achieves verbatim stability at scale — hifz, Vedic recitation, monastic memorization, Ethiopian zema, professional acting — has a **human checker** who knows the text and corrects errors immediately. That role is what keeps verbatim from drifting into paraphrase, and it is the single thing an app replaces least well.

Hagah's substitutes, in descending order of reliability: the weekly overt check against the text (RUN-5), speech scoring with error classification (DIFF-1), and self-reported grading. None equals a listener. Two implications: the weekly check is not optional and should never be quietly droppable, and a "recite to someone" feature — share a recitation, or a family/church listener role — is the highest-value post-launch addition the research points to. It is deliberately out of v1 scope, and it is not a social feature in the streaks-and-badges sense; it is the missing corrective mechanism.
