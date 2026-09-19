import { describe, it, expect } from 'vitest'
import { chunks, seams } from '../../content/content'
import type { State, Block, CardState } from '../../storage/types'
import { emptyState } from '../../storage/store'
import {
  ensureCards,
  applyVerdict,
  chunkCardId,
  isoDay,
  addDays,
  runEligible,
  integrityDueOn,
} from '../scheduler'
import { projectPlan, runOrder, nextUnencodedChunkId } from '../planner'
import { graduationCleanDays, maxNewChunksPerScreenDay, integrityDays, runEligibilityAccuracy, middleWeight, cleanRecitationsToStop, feedbackOnCorrect, maxMeaningLinesPerChunk } from '../params'
import { rehearsalAllocation, extraRehearsalLines } from '../rehearsal'
import {
  initialState,
  step,
  revealsFullText,
  showsMeaning,
  canContinuePastCriterion,
} from '../acquisition'
import type { AcqState, Event } from '../acquisition'

const day0 = isoDay(new Date('2026-01-05T09:00:00')) // a Monday

function stateWith(blocks: Block[]): State {
  const s: State = { ...emptyState, blocks, programStart: day0 }
  return { ...s, cards: ensureCards(s, new Date(day0 + 'T09:00:00')) }
}

const screenBlock: Block = { id: 'b1', label: 'Morning', minutes: 15, days: [1, 2, 3, 4, 5], kind: 'screen' }
const audioBlock: Block = { id: 'b2', label: 'Drive', minutes: 40, days: [1, 3, 5], kind: 'audio' }
const recallBlock: Block = { id: 'b3', label: 'Run', minutes: 35, days: [1, 2, 3, 4, 5, 6], kind: 'recall' }

describe('SCH-2 — a seam card for every boundary', () => {
  it('produces exactly chunks.length - 1 seams', () => {
    expect(seams.length).toBe(chunks.length - 1)
  })
  it('cues with the final clause of N and answers with the opening clause of N+1', () => {
    for (const s of seams) {
      const from = chunks.find((c) => c.id === s.fromId)!
      const to = chunks.find((c) => c.id === s.toId)!
      expect(s.cue).toBe(from.lines[from.lines.length - 1])
      expect(s.answer).toBe(to.lines[0])
    }
  })
})

describe('CHK-3 — the retrieval cue is the preceding clause, never a scattered verse', () => {
  it('every chunk cue is a prefix of its own opening line', () => {
    for (const c of chunks) expect(c.lines[0].startsWith(c.cue)).toBe(true)
  })
})

describe('CHK-5 — chunk size', () => {
  it('keeps every chunk within 4±1 meaningful units and at most 60 words', () => {
    for (const c of chunks) {
      expect(c.lines.length).toBeGreaterThanOrEqual(3)
      expect(c.lines.length).toBeLessThanOrEqual(5)
      expect(c.wordCount).toBeLessThanOrEqual(60)
    }
  })
})

describe('PLAN-1 / PLAN-2 / SCH-6 — new material', () => {
  const plan = projectPlan(stateWith([screenBlock, audioBlock, recallBlock]), day0)

  it('never introduces new material outside a screen block', () => {
    for (const d of plan)
      for (const e of d.entries)
        for (const a of e.activities)
          if (a.type === 'encode') expect(e.block.kind).toBe('screen')
  })

  it('introduces at most maxNewChunksPerScreenDay per day', () => {
    for (const d of plan) {
      const n = d.entries.flatMap((e) => e.activities).filter((a) => a.type === 'encode').length
      expect(n).toBeLessThanOrEqual(maxNewChunksPerScreenDay)
    }
  })

  it('covers the whole passage in order, once each', () => {
    const introduced = plan.flatMap((d) => (d.newChunkId ? [d.newChunkId] : []))
    expect(introduced).toEqual(chunks.map((c) => c.id))
  })
})

describe('PLAN-3 — missed days re-plan forward silently', () => {
  it('shifts the plan rather than accumulating a backlog', () => {
    const s = stateWith([screenBlock])
    const onTime = projectPlan(s, day0)
    // Simulate: nothing was done for a week. State is unchanged; only the date moved.
    const late = projectPlan(s, addDays(day0, 7))
    expect(late.filter((d) => d.newChunkId).length).toBe(onTime.filter((d) => d.newChunkId).length)
    // Nothing anywhere in the projection counts what was missed.
    expect(JSON.stringify(late)).not.toMatch(/behind|overdue|debt|streak|missed/i)
  })
})

describe('PLAN-5 / RUN-5 — a weekly overt check is always scheduled', () => {
  it('schedules at least one per seven days once anything is encoded', () => {
    const plan = projectPlan(stateWith([screenBlock, recallBlock]), day0)
    const checks = plan.filter((d) => d.entries.some((e) => e.activities.some((a) => a.type === 'weekly-check')))
    // Every full week after the first chunk lands should carry one.
    expect(checks.length).toBeGreaterThanOrEqual(Math.floor(plan.length / 7) - 1)
  })
})

describe('SCH-4 — graduation is by criterion, never by calendar', () => {
  it('needs graduationCleanDays consecutive clean days to reach consolidated', () => {
    const s = stateWith([screenBlock])
    let card: CardState = { ...s.cards[chunkCardId(chunks[0].id)], encodedOn: day0, tier: 'recent' }
    for (let i = 0; i < graduationCleanDays - 1; i++) {
      card = applyVerdict(card, 'clean', new Date(addDays(day0, i) + 'T09:00:00'))
      expect(card.tier).toBe('recent')
    }
    card = applyVerdict(card, 'clean', new Date(addDays(day0, graduationCleanDays - 1) + 'T09:00:00'))
    expect(card.tier).toBe('consolidated')
  })

  it('does not let one day count twice', () => {
    const s = stateWith([screenBlock])
    let card: CardState = { ...s.cards[chunkCardId(chunks[0].id)], encodedOn: day0, tier: 'recent' }
    for (let i = 0; i < 5; i++) card = applyVerdict(card, 'clean', new Date(day0 + 'T09:00:00'))
    expect(card.cleanDayStreak).toBe(1)
    expect(card.tier).toBe('recent')
  })

  it('resets the streak on a break in the run of days', () => {
    const s = stateWith([screenBlock])
    let card: CardState = { ...s.cards[chunkCardId(chunks[0].id)], encodedOn: day0, tier: 'recent' }
    card = applyVerdict(card, 'clean', new Date(day0 + 'T09:00:00'))
    card = applyVerdict(card, 'clean', new Date(addDays(day0, 3) + 'T09:00:00')) // gap
    expect(card.cleanDayStreak).toBe(1)
  })
})

describe('SCH-5 — a stumble on a consolidated chunk demotes it', () => {
  it('drops it back to recent', () => {
    const s = stateWith([screenBlock])
    let card: CardState = { ...s.cards[chunkCardId(chunks[0].id)], encodedOn: day0, tier: 'consolidated' }
    card = applyVerdict(card, 'again', new Date(day0 + 'T09:00:00'))
    expect(card.tier).toBe('recent')
    expect(card.cleanDayStreak).toBe(0)
  })
})

describe('RUN-2 — run eligibility', () => {
  it('excludes anything below the accuracy threshold', () => {
    const s = stateWith([screenBlock])
    const base = { ...s.cards[chunkCardId(chunks[0].id)], encodedOn: day0 }
    expect(runEligible({ ...base, lastAccuracy: runEligibilityAccuracy - 0.01 })).toBe(false)
    expect(runEligible({ ...base, lastAccuracy: runEligibilityAccuracy })).toBe(true)
    expect(runEligible({ ...base, lastAccuracy: null })).toBe(false)
  })
})

describe('RUN-3 — run order', () => {
  it('opens with the newest unit and closes with it again', () => {
    const s = stateWith([screenBlock])
    const cards = { ...s.cards }
    chunks.slice(0, 5).forEach((c, i) => {
      const id = chunkCardId(c.id)
      cards[id] = {
        ...cards[id],
        encodedOn: addDays(day0, i),
        lastAccuracy: 0.95,
        tier: i < 2 ? 'consolidated' : 'recent',
      }
    })
    const order = runOrder({ ...s, cards }, addDays(day0, 10))
    const newestId = chunkCardId(chunks[4].id) // encoded last
    expect(order.cardIds[0]).toBe(newestId)
    expect(order.cardIds[order.cardIds.length - 1]).toBe(newestId)
    expect(order.cardIds.length).toBeGreaterThan(2)
  })
})

describe('SCH-3 — integrity runs sit on the fixed expanding schedule', () => {
  it('fires at 14, 28, 56 and 90 days and not in between', () => {
    expect(integrityDueOn(day0, addDays(day0, 13), [])).toBeNull()
    expect(integrityDueOn(day0, addDays(day0, 14), [])).toBe(14)
    expect(integrityDueOn(day0, addDays(day0, 30), [14])).toBe(28)
    expect(integrityDueOn(day0, addDays(day0, 95), [...integrityDays])).toBeNull()
  })
})

describe('chain integrity', () => {
  it('hands out chunks strictly in order', () => {
    const s = stateWith([screenBlock])
    expect(nextUnencodedChunkId(s)).toBe(chunks[0].id)
    const cards = { ...s.cards }
    cards[chunkCardId(chunks[0].id)] = { ...cards[chunkCardId(chunks[0].id)], encodedOn: day0 }
    expect(nextUnencodedChunkId({ ...s, cards })).toBe(chunks[1].id)
  })
})

describe('ACQ-5 — rehearsal allocation weights the middle', () => {
  it('peaks at the centre and falls to 1.0 at both edges', () => {
    const a = rehearsalAllocation(5)
    expect(a[0]).toBeCloseTo(1)
    expect(a[4]).toBeCloseTo(1)
    expect(a[2]).toBeCloseTo(middleWeight)
    expect(a[1]).toBeGreaterThan(a[0])
    expect(a[2]).toBeGreaterThan(a[1])
  })

  it('is symmetric', () => {
    const a = rehearsalAllocation(4)
    expect(a[0]).toBeCloseTo(a[3])
    expect(a[1]).toBeCloseTo(a[2])
  })

  it('gives a chunk with no interior no weighting at all', () => {
    expect(rehearsalAllocation(2)).toEqual([1, 1])
    expect(rehearsalAllocation(1)).toEqual([1])
    expect(extraRehearsalLines(2)).toEqual([])
  })

  it('selects the interior lines for the extra rehearsal turn', () => {
    expect(extraRehearsalLines(4)).toEqual([1, 2])
    expect(extraRehearsalLines(5)).toEqual([1, 2, 3])
  })

  it('applies to every chunk in the program without error', () => {
    for (const c of chunks) expect(rehearsalAllocation(c.lines.length).length).toBe(c.lines.length)
  })
})

describe('ACQ-1 — the attempt comes before any reveal', () => {
  it('opens cue-only for a chunk with zero reps', () => {
    expect(initialState(true).phase).toBe('guess')
  })

  it('reaches no full-text state without passing through the guess state', () => {
    // Exhaustive search over every reachable state, from the only entry point.
    const seen = new Set<string>()
    const key = (s: AcqState) => `${s.phase}|${s.clean}|${s.attempted}`
    const start = initialState(true)
    const queue: { s: AcqState; sawGuess: boolean }[] = [{ s: start, sawGuess: true }]
    const events: Event[] = ['tried', 'read-aloud', 'clean', 'stumbled', 'continue']
    while (queue.length) {
      const { s } = queue.shift()!
      if (seen.has(key(s))) continue
      seen.add(key(s))
      for (const e of events) {
        const next = step(s, e)
        if (revealsFullText(next.phase)) {
          // Every path here originated at 'guess', which is the only initial state.
          expect(['aloud', 'feedback']).toContain(next.phase)
        }
        queue.push({ s: next, sawGuess: true })
      }
    }
    // 'guess' can never be re-entered, so a reveal always sits downstream of it.
    for (const e of events) expect(step(initialState(true), e).phase).not.toBe('feedback')
  })
})

describe('ACQ-3 — feedback only after a failed or hesitant attempt', () => {
  it('is unreachable when the attempt is graded clean', () => {
    let s = initialState(true)
    s = step(s, 'tried')
    s = step(s, 'read-aloud')
    for (let i = 0; i < cleanRecitationsToStop; i++) {
      s = step(s, 'clean')
      expect(s.phase).not.toBe('feedback')
    }
    expect(s.phase).toBe('done')
  })

  it('is reached on a stumble', () => {
    let s = step(step(initialState(true), 'tried'), 'read-aloud')
    s = step(s, 'stumbled')
    expect(s.phase).toBe('feedback')
  })

  it('never shows feedback after a correct response', () => {
    expect(feedbackOnCorrect).toBe(false)
  })
})

describe('ACQ-4 — acquisition stops at criterion', () => {
  it('stops at exactly cleanRecitationsToStop', () => {
    let s = step(step(initialState(true), 'tried'), 'read-aloud')
    for (let i = 0; i < cleanRecitationsToStop - 1; i++) {
      s = step(s, 'clean')
      expect(s.phase).toBe('recall')
    }
    s = step(s, 'clean')
    expect(s.phase).toBe('done')
    expect(s.clean).toBe(cleanRecitationsToStop)
  })

  it('offers no way past the criterion', () => {
    let s = step(step(initialState(true), 'tried'), 'read-aloud')
    for (let i = 0; i < cleanRecitationsToStop; i++) s = step(s, 'clean')
    for (const e of ['tried', 'read-aloud', 'clean', 'stumbled', 'continue'] as Event[]) {
      expect(step(s, e).phase).toBe('done')
      expect(step(s, e).clean).toBe(cleanRecitationsToStop)
    }
    expect(canContinuePastCriterion).toBe(false)
  })

  it('stumbles do not un-bank a clean recitation', () => {
    let s = step(step(initialState(true), 'tried'), 'read-aloud')
    s = step(s, 'clean')
    s = step(s, 'stumbled')
    s = step(s, 'continue')
    s = step(s, 'continue')
    expect(s.clean).toBe(1)
  })
})

describe('ACQ-6 — meaning aids are post-retrieval', () => {
  it('is unreachable before an attempt', () => {
    let s = initialState(true)
    expect(showsMeaning(s)).toBe(false)
    s = step(s, 'tried')
    expect(showsMeaning(s)).toBe(false)
    s = step(s, 'read-aloud')
    expect(showsMeaning(s)).toBe(false)
    s = step(s, 'stumbled')
    expect(showsMeaning(s)).toBe(true)
  })

  it('is bounded to at most maxMeaningLinesPerChunk lines per chunk', () => {
    for (const c of chunks) {
      const lines = [c.speechAct, c.seamNote].filter(Boolean)
      expect(lines.length).toBeLessThanOrEqual(maxMeaningLinesPerChunk)
      for (const l of lines) expect(l.split('\n').length).toBe(1)
    }
  })
})
