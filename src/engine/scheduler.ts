import { createEmptyCard, fsrs, generatorParameters, Rating, State as FsrsState } from 'ts-fsrs'
import type { Card as FsrsCard, Grade } from 'ts-fsrs'
import type { CardState, CardKind, Tier, State } from '../storage/types'
import { chunks, seams } from '../content/content'
import {
  desiredRetention,
  graduationCleanDays,
  recentTierDays,
  runEligibilityAccuracy,
  integrityDays,
  maxNeglectDays,
} from './params'

/**
 * SCH-1: FSRS schedules chunk cards, desired retention 0.90, and the user sees a
 * colour rather than a number. This is the reference implementation (ts-fsrs),
 * not a re-derivation, so the scheduling matches the benchmarked model exactly.
 */
const params = generatorParameters({ request_retention: desiredRetention, enable_fuzz: true })
const engine = fsrs(params)

export const chunkCardId = (chunkId: string) => `chunk:${chunkId}`
export const seamCardId = (seamId: string) => seamId // seams already carry a "seam:" prefix

export function newCard(id: string, kind: CardKind, refId: string, now = new Date()): CardState {
  return {
    id,
    kind,
    refId,
    fsrs: createEmptyCard(now),
    tier: 'new',
    cleanDayStreak: 0,
    lastCleanDay: null,
    acquisitionCleanCount: 0,
    encodedOn: null,
    lastAccuracy: null,
  }
}

export function isoDay(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return isoDay(d)
}

/** Grades map straight onto FSRS ratings. "Hesitant" is Hard, per RUN-4. */
export type Verdict = 'again' | 'hesitant' | 'clean' | 'easy'
export const verdictToRating: Record<Verdict, Grade> = {
  again: Rating.Again,
  hesitant: Rating.Hard,
  clean: Rating.Good,
  easy: Rating.Easy,
}

export function schedule(card: FsrsCard, verdict: Verdict, now = new Date()): FsrsCard {
  return engine.next(card, now, verdictToRating[verdict]).card
}

/**
 * SCH-4 / SCH-5: tier transitions.
 *  - new → recent as soon as the chunk is encoded.
 *  - recent → consolidated by criterion: k consecutive clean *days* (graduationCleanDays),
 *    never by calendar. `recentTierDays` bounds how long "recent" can mean, but it does
 *    not itself promote anything.
 *  - SCH-5: any stumble on a consolidated chunk demotes it straight back to recent.
 */
export function applyVerdict(card: CardState, verdict: Verdict, now = new Date()): CardState {
  const today = isoDay(now)
  const clean = verdict === 'clean' || verdict === 'easy'

  let cleanDayStreak = card.cleanDayStreak
  let lastCleanDay = card.lastCleanDay
  if (clean) {
    // One day can only contribute once — "consecutive clean daily recitations".
    if (lastCleanDay !== today) {
      cleanDayStreak = lastCleanDay && daysBetween(lastCleanDay, today) === 1 ? cleanDayStreak + 1 : 1
      lastCleanDay = today
    }
  } else {
    cleanDayStreak = 0
    lastCleanDay = null
  }

  let tier: Tier = card.tier
  if (tier === 'new' && card.encodedOn) tier = 'recent'
  if (tier === 'recent' && cleanDayStreak >= graduationCleanDays) tier = 'consolidated'
  // SCH-5: a stumble on a consolidated chunk demotes it to the recent tier.
  if (tier === 'consolidated' && !clean) tier = 'recent'

  return {
    ...card,
    fsrs: schedule(card.fsrs, verdict, now),
    tier,
    cleanDayStreak,
    lastCleanDay,
  }
}

/**
 * product.md: "The app never shows a scheduling number. Stability is a color."
 * Four buckets, named for what they mean to the reciter, not for FSRS internals.
 */
export type Stability = 'new' | 'fragile' | 'working' | 'firm'

export function stabilityOf(card: CardState): Stability {
  if (card.fsrs.state === FsrsState.New || !card.encodedOn) return 'new'
  if (card.fsrs.state === FsrsState.Relearning || card.fsrs.stability < 3) return 'fragile'
  if (card.fsrs.stability < 21) return 'working'
  return 'firm'
}

export const stabilityColor: Record<Stability, string> = {
  new: 'bg-stability-new',
  fragile: 'bg-stability-fragile',
  working: 'bg-stability-working',
  firm: 'bg-stability-firm',
}

/** RUN-2: material enters the run tier only at ≥80% clause accuracy on its last check. */
export function runEligible(card: CardState, threshold = runEligibilityAccuracy): boolean {
  return card.encodedOn !== null && card.lastAccuracy !== null && card.lastAccuracy >= threshold
}

export function isDue(card: CardState, now = new Date()): boolean {
  return new Date(card.fsrs.due).getTime() <= now.getTime()
}

/** SCH-4: everything encoded within roughly the last 3-4 weeks is "recent" and reviewed daily. */
export function inRecentWindow(card: CardState, today: string, windowDays = recentTierDays): boolean {
  return card.encodedOn !== null && daysBetween(card.encodedOn, today) <= windowDays
}

/** SCH-8: no active program goes longer than maxNeglectDays without a retrieval touch. */
export function neglected(card: CardState, today: string): boolean {
  const last = card.fsrs.last_review ? isoDay(new Date(card.fsrs.last_review)) : card.encodedOn
  return last !== null && daysBetween(last, today) >= maxNeglectDays
}

/**
 * SCH-3: whole-program integrity runs sit on a fixed expanding schedule (14/28/56/90
 * days from the program start), deliberately *not* on FSRS.
 */
export function integrityDueOn(programStart: string, today: string, done: number[]): number | null {
  const elapsed = daysBetween(programStart, today)
  for (const milestone of integrityDays) {
    if (elapsed >= milestone && !done.includes(milestone)) return milestone
  }
  return null
}

/** Build the full card set for the program: one per chunk, plus one per boundary (SCH-2). */
export function ensureCards(state: State, now = new Date()): Record<string, CardState> {
  const cards = { ...state.cards }
  for (const c of chunks) {
    const id = chunkCardId(c.id)
    if (!cards[id]) cards[id] = newCard(id, 'chunk', c.id, now)
  }
  // SCH-2: a seam card exists for every boundary; it becomes *active* only once
  // the chunk on its far side has been encoded ("created when N+1 is first encoded").
  for (const s of seams) {
    if (!cards[s.id]) cards[s.id] = newCard(s.id, 'seam', s.id, now)
  }
  return cards
}

export function seamActive(state: State, seamToChunkId: string): boolean {
  const target = state.cards[chunkCardId(seamToChunkId)]
  return !!target?.encodedOn
}
