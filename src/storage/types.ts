import type { Card as FsrsCard } from 'ts-fsrs'
import type { ErrorClass } from '../engine/params'

/** product.md: the three block types. New material only ever enters in a screen block (PLAN-1). */
export type BlockKind = 'screen' | 'audio' | 'recall'

export type Block = {
  id: string
  label: string
  minutes: number
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  kind: BlockKind
}

/** SCH-4: three tiers per day. */
export type Tier = 'new' | 'recent' | 'consolidated'

export type CardKind = 'chunk' | 'seam'

export type CardState = {
  id: string
  kind: CardKind
  /** chunk id, or the seam's own id */
  refId: string
  fsrs: FsrsCard
  tier: Tier
  /** SCH-4: graduation is by k consecutive clean daily recitations, never by calendar. */
  cleanDayStreak: number
  /** ISO date of the last day counted toward the streak, so one day can only count once. */
  lastCleanDay: string | null
  /** ACQ-4: how many clean recitations the acquisition session has banked. */
  acquisitionCleanCount: number
  encodedOn: string | null
  /** RUN-2: last measured clause accuracy, gates entry to the run tier. */
  lastAccuracy: number | null
}

export type ReviewMode = 'encode' | 'recall' | 'commute' | 'run' | 'weekly' | 'seam' | 'integrity'

export type Review = {
  id: string
  cardId: string
  at: string
  mode: ReviewMode
  grade: 1 | 2 | 3 | 4
  accuracy: number | null
  /** DIFF-1: every miss is classified, not just counted. This log is the point. */
  errors: { klass: ErrorClass; expected: string | null; got: string | null; at: number }[]
  /** RUN-4: hesitations are captured, not just pass/fail. */
  hesitated?: boolean
  /** DIFF-3: a fluent paraphrase is a miss, and is surfaced in the weekly check. */
  drift?: boolean
}

export type State = {
  version: 1
  onboarded: boolean
  blocks: Block[]
  programStart: string | null
  cards: Record<string, CardState>
  reviews: Review[]
  /** RUN-4: chunks flagged in a run enter the next audio session's repair queue. */
  repairQueue: string[]
  /** SCH-3: which fixed integrity milestones have been run. */
  integrityDone: number[]
  /** Per-user tunable overrides (protocol.md §10). */
  overrides: Partial<Record<string, number | boolean>>
  /** Audio settings live in one place (src/audio/voice.ts reads these). */
  voice: { uri: string | null; rate: number }
  /** SCH-7: ISO date of the last random-entry drill. */
  lastRandomEntryDrill: string | null
}
