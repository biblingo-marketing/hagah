import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { chunks } from '../../content/content'

const src = readFileSync(join(process.cwd(), 'src/screens/RunCard.tsx'), 'utf8')

describe('RUN-1 — the run card is read-only and shows no text', () => {
  it('never renders chunk text, lines or cues', () => {
    // A structural check, not a rendering one: if the screen cannot reach the text,
    // it cannot leak it. Showing the text would turn free recall into restudy.
    expect(src).not.toMatch(/\.text\b/)
    expect(src).not.toMatch(/\.lines\b/)
    expect(src).not.toMatch(/\.cue\b/)
    expect(src).not.toMatch(/\.speechAct\b/)
    expect(src).not.toMatch(/\bseam\.answer\b/)
  })

  it('renders only references and landmarks', () => {
    expect(src).toMatch(/chunk\?\.ref/)
    expect(src).toMatch(/chunk\?\.landmark/)
  })

  it('has no Scripture verbatim embedded in it', () => {
    for (const c of chunks) {
      expect(src).not.toContain(c.lines[0])
      expect(src).not.toContain(c.cue)
    }
  })
})

describe('RUN-4 — grading captures hesitation, not just pass/fail', () => {
  it('offers a distinct hesitated verdict and feeds the repair queue', () => {
    expect(src).toMatch(/'hesitant'/)
    expect(src).toMatch(/hesitated: v === 'hesitant'/)
    expect(src).toMatch(/repair\.add\(id\)/)
  })
})
