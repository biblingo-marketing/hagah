import type { Block, BlockKind, State, CardState } from '../storage/types'
import { chunks, seams } from '../content/content'
import {
  chunkCardId,
  addDays,
  daysBetween,
  inRecentWindow,
  isDue,
  neglected,
  runEligible,
  integrityDueOn,
  stabilityOf,
} from './scheduler'
import {
  maxNewChunksPerScreenDay,
  newUnitsPerAcquisitionSession,
  recentTierDays,
  randomEntryDrillsPerWeek,
  overtChecksPerWeek,
  seamsPassMinutes,
} from './params'

export type Activity =
  | { type: 'encode'; chunkId: string }
  | { type: 'recall'; cardIds: string[] }
  | { type: 'commute'; cardIds: string[] }
  | { type: 'run'; cardIds: string[]; seamIds: string[] }
  | { type: 'weekly-check'; cardIds: string[] }
  | { type: 'integrity'; milestone: number }
  | { type: 'random-entry'; chunkId: string }

export type PlanEntry = {
  block: Block
  activities: Activity[]
}

export type PlanDay = {
  date: string
  entries: PlanEntry[]
  /** Chunk introduced on this day, if any. Drives "dated plan through the passage". */
  newChunkId: string | null
}

const effectiveNewPerScreenDay = () => Math.min(maxNewChunksPerScreenDay, newUnitsPerAcquisitionSession)

export function blocksOn(blocks: Block[], date: string): Block[] {
  const dow = new Date(date + 'T00:00:00').getDay()
  return blocks.filter((b) => b.days.includes(dow))
}

export function hasNonScreenBlock(blocks: Block[]): boolean {
  return blocks.some((b) => b.kind !== 'screen')
}

export function hasScreenBlock(blocks: Block[]): boolean {
  return blocks.some((b) => b.kind === 'screen')
}

// ── Today's real work ─────────────────────────────────────────────────────────

export const encodedCards = (s: State) => Object.values(s.cards).filter((c) => c.encodedOn)

/** The next chunk that has never been encoded. The chain is strictly in order. */
export function nextUnencodedChunkId(s: State): string | null {
  for (const c of chunks) {
    if (!s.cards[chunkCardId(c.id)]?.encodedOn) return c.id
  }
  return null
}

/** SCH-4: the recent tier — everything from the last ~3-4 weeks, practiced daily. */
export function recentCards(s: State, today: string): CardState[] {
  return encodedCards(s).filter(
    (c) => c.kind === 'chunk' && (c.tier === 'recent' || c.tier === 'new' || inRecentWindow(c, today)),
  )
}

/** SCH-4: the consolidated tier, reviewed on rotation rather than daily. */
export function consolidatedCards(s: State): CardState[] {
  return encodedCards(s).filter((c) => c.kind === 'chunk' && c.tier === 'consolidated')
}

/**
 * SCH-4 consolidated rotation, plus SCH-8: anything untouched for maxNeglectDays is
 * raised regardless of where FSRS put it. Due cards come first, then the most neglected.
 */
export function consolidatedRotation(s: State, today: string, now = new Date()): CardState[] {
  const pool = consolidatedCards(s)
  const urgent = pool.filter((c) => neglected(c, today))
  const due = pool.filter((c) => !urgent.includes(c) && isDue(c, now))
  const rest = pool
    .filter((c) => !urgent.includes(c) && !due.includes(c))
    .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
  return [...urgent, ...due, ...rest]
}

/** SCH-2: active seam cards — a seam is live once the chunk on its far side is encoded. */
export function activeSeams(s: State): CardState[] {
  return seams
    .filter((seam) => s.cards[chunkCardId(seam.toId)]?.encodedOn)
    .map((seam) => s.cards[seam.id])
    .filter(Boolean)
}

/**
 * RUN-3: run order is newest unit first, then consolidated, then fragile,
 * then a seams-only pass, then the newest unit again.
 * RUN-2 gates entry: only material at ≥80% clause accuracy on its last check.
 */
export function runOrder(s: State, today: string): { cardIds: string[]; seamIds: string[] } {
  const eligible = encodedCards(s).filter((c) => c.kind === 'chunk' && runEligible(c))
  const byRecency = [...eligible].sort(
    (a, b) => daysBetween(a.encodedOn!, today) - daysBetween(b.encodedOn!, today),
  )
  const newest = byRecency[0]
  const rest = byRecency.filter((c) => c.id !== newest?.id)

  const consolidated = rest.filter((c) => c.tier === 'consolidated')
  const fragile = rest.filter(
    (c) => c.tier !== 'consolidated' && (stabilityOf(c) === 'fragile' || stabilityOf(c) === 'working'),
  )
  const remainder = rest.filter((c) => !consolidated.includes(c) && !fragile.includes(c))

  const cardIds = [
    ...(newest ? [newest.id] : []), // newest unit first
    ...consolidated.map((c) => c.id), // then consolidated
    ...fragile.map((c) => c.id), // then fragile
    ...remainder.map((c) => c.id),
    ...(newest ? [newest.id] : []), // and the newest unit again, a second spaced retrieval
  ]
  return { cardIds, seamIds: activeSeams(s).map((c) => c.id) }
}

/**
 * RUN-4 repair queue first, then due recent-tier material, then the consolidated
 * rotation. Commute mode never carries first exposure (PLAN-1).
 */
export function commuteOrder(s: State, today: string, now = new Date()): string[] {
  const repair = s.repairQueue.filter((id) => s.cards[id]?.encodedOn)
  const recent = recentCards(s, today)
    .filter((c) => !repair.includes(c.id))
    .sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime())
  const rotation = consolidatedRotation(s, today, now).filter((c) => !repair.includes(c.id))
  const seamIds = activeSeams(s)
    .filter((c) => isDue(c, now))
    .map((c) => c.id)
  return [...repair, ...recent.map((c) => c.id), ...seamIds, ...rotation.map((c) => c.id)]
}

/** The screen block's review load once the new unit is done: recent tier, daily. */
export function screenReviewOrder(s: State, today: string, now = new Date()): string[] {
  const recent = recentCards(s, today).sort(
    (a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime(),
  )
  const seamIds = activeSeams(s)
    .filter((c) => isDue(c, now))
    .map((c) => c.id)
  return [...recent.map((c) => c.id), ...seamIds]
}

// ── The dated plan ────────────────────────────────────────────────────────────

/**
 * Which weekday carries the weekly overt check (RUN-5 / PLAN-5). It has to be a
 * block where the text is available to score against, so a screen block is preferred.
 */
function weeklyCheckDay(blocks: Block[]): { dow: number; block: Block } | null {
  const screens = blocks.filter((b) => b.kind === 'screen')
  const pool = screens.length ? screens : blocks
  let best: { dow: number; block: Block } | null = null
  for (const b of pool) {
    for (const d of b.days) {
      if (!best || d > best.dow) best = { dow: d, block: b }
    }
  }
  return best
}

/** SCH-7: the weekly random-entry drill. Works hands-free, so audio/recall is preferred. */
function randomEntryDay(blocks: Block[]): { dow: number; block: Block } | null {
  const nonScreen = blocks.filter((b) => b.kind !== 'screen')
  const pool = nonScreen.length ? nonScreen : blocks
  for (const b of pool) {
    const d = [...b.days].sort((x, y) => x - y)[0]
    if (d !== undefined) return { dow: d, block: b }
  }
  return null
}

/**
 * Projects a dated plan forward.
 *
 * PLAN-3 is satisfied structurally rather than by a catch-up rule: the projection is
 * recomputed from *current state* every time it is read. A missed day introduces no
 * debt and no backlog — tomorrow simply becomes the next screen day, and the plan
 * shifts. There is nothing here that counts what was skipped.
 *
 * Future tiers are forecast from the recent-window (SCH-4's "last ~3-4 weeks"),
 * because criterion-based graduation depends on outcomes that have not happened yet.
 * Live tier assignment still goes strictly by criterion, in scheduler.applyVerdict.
 */
export function projectPlan(s: State, fromDay: string, maxDays = 180): PlanDay[] {
  const days: PlanDay[] = []
  const blocks = s.blocks
  if (!blocks.length) return days

  const encodedAt = new Map<string, string>()
  for (const c of chunks) {
    const card = s.cards[chunkCardId(c.id)]
    if (card?.encodedOn) encodedAt.set(c.id, card.encodedOn)
  }

  const queue = chunks.map((c) => c.id).filter((id) => !encodedAt.has(id))
  const weekly = weeklyCheckDay(blocks)
  const drill = randomEntryDay(blocks)
  const start = s.programStart ?? fromDay
  const done = [...s.integrityDone]

  let day = fromDay
  let introducedAll = queue.length === 0
  let tailDays = 0

  for (let i = 0; i < maxDays; i++) {
    const todays = blocksOn(blocks, day)
    const dow = new Date(day + 'T00:00:00').getDay()
    let newChunkId: string | null = null
    const entries: PlanEntry[] = []

    for (const block of todays) {
      const activities: Activity[] = []

      if (block.kind === 'screen') {
        // PLAN-1 + PLAN-2 + SCH-6: new material only here, and one unit per session.
        if (newChunkId === null && queue.length) {
          const take = effectiveNewPerScreenDay()
          for (let k = 0; k < take && queue.length; k++) {
            const id = queue.shift()!
            encodedAt.set(id, day)
            newChunkId = id
            activities.push({ type: 'encode', chunkId: id })
          }
        }
        const recent = [...encodedAt.entries()]
          .filter(([, d]) => daysBetween(d, day) <= recentTierDays && d !== day)
          .map(([id]) => chunkCardId(id))
        if (recent.length) activities.push({ type: 'recall', cardIds: recent })

        // RUN-5 / PLAN-5: the weekly overt check is always scheduled.
        if (weekly && weekly.block.id === block.id && dow === weekly.dow && encodedAt.size) {
          activities.push({
            type: 'weekly-check',
            cardIds: [...encodedAt.keys()].map(chunkCardId),
          })
        }
      }

      if (block.kind === 'audio') {
        const pool = [...encodedAt.keys()].map(chunkCardId)
        if (pool.length) activities.push({ type: 'commute', cardIds: pool })
      }

      if (block.kind === 'recall') {
        const pool = [...encodedAt.entries()]
          .filter(([, d]) => d !== day) // nothing encoded today is run-eligible yet (RUN-2)
          .map(([id]) => chunkCardId(id))
        if (pool.length) {
          const seamIds = seams.filter((sm) => encodedAt.has(sm.toId)).map((sm) => sm.id)
          activities.push({ type: 'run', cardIds: pool, seamIds })
        }
      }

      // SCH-7: one random-entry drill a week.
      if (drill && drill.block.id === block.id && dow === drill.dow && encodedAt.size > 2) {
        const pool = [...encodedAt.keys()]
        activities.push({ type: 'random-entry', chunkId: pool[Math.floor(pool.length / 2)] })
      }

      // SCH-3: whole-program integrity runs on the fixed expanding schedule.
      const milestone = integrityDueOn(start, day, done)
      if (milestone !== null && block.kind !== 'screen' && introducedAll) {
        done.push(milestone)
        activities.push({ type: 'integrity', milestone })
      }

      if (activities.length) entries.push({ block, activities })
    }

    if (entries.length || newChunkId) days.push({ date: day, entries, newChunkId })

    if (!queue.length) introducedAll = true
    if (introducedAll) {
      tailDays++
      // Carry the projection far enough past the last new chunk to show the
      // maintenance shape, then stop. No point projecting a year of rotation.
      if (tailDays > 21) break
    }
    day = addDays(day, 1)
  }

  return days
}

/** "Several weeks of material" — the date the last chunk gets introduced. */
export function finishDate(plan: PlanDay[]): string | null {
  const withNew = plan.filter((d) => d.newChunkId)
  return withNew.length ? withNew[withNew.length - 1].date : null
}

export function activityLabel(a: Activity): string {
  switch (a.type) {
    case 'encode':
      return 'Encode new chunk'
    case 'recall':
      return `Recall check · ${a.cardIds.length}`
    case 'commute':
      return `Commute · ${a.cardIds.length}`
    case 'run':
      return `Run card · ${a.cardIds.length} + seams (${seamsPassMinutes} min)`
    case 'weekly-check':
      return `Weekly check · ${a.cardIds.length}`
    case 'integrity':
      return `Whole-passage run · day ${a.milestone}`
    case 'random-entry':
      return 'Random-entry drill'
  }
}

export const weeklyQuota = { overtChecksPerWeek, randomEntryDrillsPerWeek }
export type { BlockKind }
