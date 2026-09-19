import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chunks, seams } from '../../content/content'
import type { State, Block, CardState } from '../../storage/types'
import { emptyState } from '../../storage/store'
import { ensureCards, isoDay, addDays, chunkCardId } from '../scheduler'
import {
  encodeAvailability,
  newChunksEncodedOn,
  practiceAllOrder,
  seamsOnlyOrder,
  projectPlan,
} from '../planner'
import { resolve, newChunkCap } from '../settings'
import { maxNewChunksPerScreenDay, runEligibilityAccuracy, pausePerWord } from '../params'

const day0 = isoDay(new Date('2026-01-05T09:00:00'))
const screenBlock: Block = { id: 'b1', label: 'Morning', minutes: 15, days: [1, 2, 3, 4, 5], kind: 'screen' }

function base(blocks: Block[] = [screenBlock]): State {
  const s: State = { ...emptyState, blocks, programStart: day0 }
  return { ...s, cards: ensureCards(s, new Date(day0 + 'T09:00:00')) }
}

function withEncoded(s: State, n: number, on = day0): State {
  const cards = { ...s.cards }
  chunks.slice(0, n).forEach((c) => {
    const id = chunkCardId(c.id)
    cards[id] = { ...cards[id], encodedOn: on, tier: 'recent', lastAccuracy: 0.95 } as CardState
  })
  return { ...s, cards }
}

describe('on-demand practice does not require a scheduled block', () => {
  it('offers a queue with no blocks configured at all', () => {
    const s = withEncoded({ ...base([]), blocks: [] }, 3)
    expect(practiceAllOrder(s).length).toBeGreaterThan(0)
    expect(encodeAvailability(s, addDays(day0, 1), 1).ok).toBe(true)
  })

  it('orders by most overdue rather than by what is due today', () => {
    const s = withEncoded(base(), 4)
    const order = practiceAllOrder(s)
    // Nothing has been reviewed, so every card is included rather than filtered out.
    expect(order.length).toBeGreaterThanOrEqual(4)
  })

  it('surfaces seams once the chunk on the far side is encoded', () => {
    expect(seamsOnlyOrder(withEncoded(base(), 1))).toHaveLength(0)
    expect(seamsOnlyOrder(withEncoded(base(), 2))).toHaveLength(1)
    expect(seamsOnlyOrder(withEncoded(base(), chunks.length))).toHaveLength(seams.length)
  })
})

describe('PLAN-2 — the pace cap holds on demand, not just in the plan', () => {
  it('allows the first new chunk of the day', () => {
    const r = encodeAvailability(base(), day0, 1)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.chunkId).toBe(chunks[0].id)
  })

  it('refuses a second new chunk on the same day at the default cap', () => {
    const s = withEncoded(base(), 1, day0)
    const r = encodeAvailability(s, day0, newChunkCap(s))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('cap-reached')
      expect(r.encodedToday).toBe(1)
      expect(r.cap).toBe(maxNewChunksPerScreenDay)
    }
  })

  it('opens again the next day', () => {
    const s = withEncoded(base(), 1, day0)
    expect(encodeAvailability(s, addDays(day0, 1), 1).ok).toBe(true)
  })

  it('honours a raised per-user cap', () => {
    const s = { ...withEncoded(base(), 1, day0), overrides: { maxNewChunksPerScreenDay: 2 } }
    expect(newChunkCap(s)).toBe(2)
    expect(encodeAvailability(s, day0, newChunkCap(s)).ok).toBe(true)
  })

  it('counts only chunks first encoded on that day', () => {
    const s = withEncoded(base(), 2, day0)
    expect(newChunksEncodedOn(s, day0)).toHaveLength(2)
    expect(newChunksEncodedOn(s, addDays(day0, 1))).toHaveLength(0)
  })

  it('reports none-left when the program is fully encoded', () => {
    const s = withEncoded(base(), chunks.length, addDays(day0, -30))
    const r = encodeAvailability(s, day0, 1)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('none-left')
  })
})

describe('PLAN-1 still holds — the planner never schedules first exposure off-screen', () => {
  it('keeps encode activities in screen blocks even with every block kind present', () => {
    const s = base([
      screenBlock,
      { id: 'b2', label: 'Drive', minutes: 40, days: [1, 2, 3, 4, 5], kind: 'audio' },
      { id: 'b3', label: 'Run', minutes: 35, days: [1, 2, 3, 4, 5], kind: 'recall' },
    ])
    for (const d of projectPlan(s, day0))
      for (const e of d.entries)
        for (const a of e.activities) if (a.type === 'encode') expect(e.block.kind).toBe('screen')
  })
})

describe('per-user tunables are actually read', () => {
  it('falls back to the protocol default when unset', () => {
    const s = base()
    expect(resolve(s, 'runEligibilityAccuracy')).toBe(runEligibilityAccuracy)
    expect(resolve(s, 'pausePerWord')).toBe(pausePerWord)
  })

  it('returns a stored override', () => {
    const s = { ...base(), overrides: { pausePerWord: 0.6, playAnswerOnSuccess: true } }
    expect(resolve(s, 'pausePerWord')).toBe(0.6)
    expect(resolve(s, 'playAnswerOnSuccess')).toBe(true)
  })

  it('clamps a stored value to the range the protocol publishes', () => {
    const s = { ...base(), overrides: { pausePerWord: 99, runEligibilityAccuracy: -5 } }
    expect(resolve(s, 'pausePerWord')).toBe(0.8)
    expect(resolve(s, 'runEligibilityAccuracy')).toBe(0.6)
  })

  it('ignores a junk stored value rather than propagating NaN into the engine', () => {
    const s = { ...base(), overrides: { pausePerWord: Number.NaN } }
    expect(resolve(s, 'pausePerWord')).toBe(pausePerWord)
  })
})

describe('nav is absent from the focused practice screens', () => {
  const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

  it('does not render on encode, commute or the scored checks', () => {
    // "One action per screen" during encode, and no escape hatches in the car.
    for (const f of [
      'src/screens/Encode.tsx',
      'src/screens/Commute.tsx',
      'src/components/VerifySession.tsx',
      'src/screens/RunCard.tsx',
      'src/screens/Integrity.tsx',
    ]) {
      expect({ file: f, hasTab: /<Shell[^>]*\btab=/.test(read(f)) }).toEqual({ file: f, hasTab: false })
    }
  })

  it('does render on the hub screens', () => {
    for (const f of [
      'src/screens/Today.tsx',
      'src/screens/Practice.tsx',
      'src/screens/Plan.tsx',
      'src/screens/Boundaries.tsx',
      'src/screens/Settings.tsx',
    ]) {
      expect({ file: f, hasTab: /tab="/.test(read(f)) }).toEqual({ file: f, hasTab: true })
    }
  })
})
