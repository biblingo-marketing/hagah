/**
 * Every named constant from docs/engine/protocol.md lives here and nowhere else.
 * CLAUDE.md guardrail 7: "Named constants from the protocol live in one file,
 * not scattered inline."
 *
 * Do not inline any of these values at a call site. If a value needs to change,
 * it changes here — and if the protocol names the value, changing it is a
 * protocol change, which is Nick's call (guardrail 6).
 *
 * The `tunable` block mirrors protocol.md §10. Values marked "per-user" there are
 * overridable through settings; the rest are fixed for everyone.
 */

// ── §1 Acquisition ────────────────────────────────────────────────────────────
/** ACQ-2: first exposure prompts one *aloud* read, not a silent one. */
export const aloudPromptOnFirstExposure = true
/** ACQ-3: correct-answer feedback only after a failed or hesitant attempt. */
export const feedbackOnCorrect = false
/** ACQ-4: acquisition stops at criterion; no "one more time" affordance. Experiment E1. */
export const cleanRecitationsToStop = 3
/** ACQ-5: middle lines get extra rehearsal turns. Low-moderate confidence → instrumented. */
export const middleWeight = 1.5
/** ACQ-6: meaning aids are bounded and post-retrieval. */
export const maxMeaningLinesPerChunk = 2
/** ACQ-7: optional evening re-recitation, first retrieval next morning. Off by default. */
export const eveningMicroBlockMinutes = 3
export const sleepBracketEnabled = false // C-tier → "off by default, offered in onboarding"

// ── §2 Chunking and cues ──────────────────────────────────────────────────────
/** CHK-2: spoken verse number as one component of the compound cue. User toggle. */
export const speakVerseNumbers = true
/** CHK-5: target chunk size is 4±1 meaningful units. */
export const targetUnitsPerChunk = 4
/** CHK-5: ~30–60 words in English. */
export const maxWordsPerChunk = 60
export const minWordsPerChunk = 30

// ── §3 Scheduling ─────────────────────────────────────────────────────────────
/** SCH-1: FSRS desired retention. The user sees a color, never a number. */
export const desiredRetention = 0.9
/** SCH-3: whole-program integrity runs on a fixed expanding schedule, not FSRS. */
export const integrityDays = [14, 28, 56, 90] as const
/** SCH-4: "recent" tier covers roughly the last 3–4 weeks, practiced daily. */
export const recentTierDays = 28
/** SCH-4: graduation recent → consolidated is by criterion, never by calendar. */
export const graduationCleanDays = 3
/** SCH-7: random-entry drill ("start at 8:18") runs weekly. */
export const randomEntryDrillsPerWeek = 1
/** SCH-8: no active program goes longer than this without a retrieval touch. */
export const maxNeglectDays = 14
/** SCH-6: acquisition blocks; an acquisition session contains one unit only. */
export const newUnitsPerAcquisitionSession = 1

// ── §4 Free recall (Run card) ─────────────────────────────────────────────────
/** RUN-2: material enters the run tier only at ≥80% clause accuracy. Experiment E5. */
export const runEligibilityAccuracy = 0.8
/** RUN-3: the seams-only pass inside a run. */
export const seamsPassMinutes = 5
/** RUN-5: a weekly overt check is scheduled regardless of how silent recall is going. */
export const overtChecksPerWeek = 1

// ── §5 Audio (Commute mode) ───────────────────────────────────────────────────
/** AUD-2: on a self-reported success the answer audio is skipped by default. */
export const playAnswerOnSuccess = false
/** AUD-3: silence scales with chunk length, in seconds per word. */
export const pausePerWord = 0.45
/** AUD-5: a user's own recording is preferred over TTS. (No recorder in this build yet.) */
export const preferSelfRecordedAudio = true

// ── §8 Planner ────────────────────────────────────────────────────────────────
/** PLAN-2: pace cap. Range 1–2, default 1. */
export const maxNewChunksPerScreenDay = 1
/** PLAN-4: onboarding requires the user to consider at least one non-screen block. */
export const requireNonScreenBlock = true
/** PLAN-6: languageMode ∈ {en, grc, both}; default en. Experiment E2. */
export const languageMode: 'en' | 'grc' | 'both' = 'en'
/** PLAN-7: a Greek unit is scheduled after the English unit of the same text. */
export const greekFollowsEnglish = true

// ── §6 Scoring ────────────────────────────────────────────────────────────────
/** DIFF-1: the closed set of error classes stored on every review row. */
export const errorClasses = [
  'synonym-substitution',
  'connective-swap',
  'omission',
  'insertion',
  'wrong-paragraph-start',
] as const
export type ErrorClass = (typeof errorClasses)[number]

/**
 * DIFF-1: connectives are tracked separately because verbatim recall is regenerated
 * from meaning plus an activated lexical set, so swaps cluster on the joins.
 */
export const connectives = new Set([
  'and', 'but', 'for', 'so', 'then', 'yet', 'or', 'nor',
  'because', 'since', 'therefore', 'thus', 'however', 'moreover',
  'nevertheless', 'furthermore', 'although', 'though', 'while', 'whereas',
  'now', 'indeed', 'also', 'even', 'as', 'that', 'when', 'if', 'than',
])

// ── §10 Tunables ──────────────────────────────────────────────────────────────
/** Ranges from protocol.md §10. `perUser` marks the ones a user may override. */
export const tunables = {
  cleanRecitationsToStop: { default: cleanRecitationsToStop, min: 1, max: 3, perUser: false },
  middleWeight: { default: middleWeight, min: 1.0, max: 2.0, perUser: false },
  graduationCleanDays: { default: graduationCleanDays, min: 2, max: 5, perUser: false },
  recentTierDays: { default: recentTierDays, min: 14, max: 40, perUser: false },
  runEligibilityAccuracy: { default: runEligibilityAccuracy, min: 0.6, max: 0.95, perUser: true },
  pausePerWord: { default: pausePerWord, min: 0.3, max: 0.8, perUser: true },
  maxNewChunksPerScreenDay: { default: maxNewChunksPerScreenDay, min: 1, max: 2, perUser: true },
  desiredRetention: { default: desiredRetention, min: 0.85, max: 0.95, perUser: false },
  maxNeglectDays: { default: maxNeglectDays, min: 7, max: 30, perUser: false },
  playAnswerOnSuccess: { default: playAnswerOnSuccess, perUser: true },
  speakVerseNumbers: { default: speakVerseNumbers, perUser: true },
} as const
