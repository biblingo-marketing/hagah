import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { silenceMsFor, spokenRef } from '../../audio/voice'
import { chunks } from '../../content/content'
import { pausePerWord, playAnswerOnSuccess } from '../params'

const src = readFileSync(join(process.cwd(), 'src/screens/Commute.tsx'), 'utf8')

describe('AUD-3 — silence scales with chunk length', () => {
  it('allocates pausePerWord seconds per word', () => {
    expect(silenceMsFor('one two three four')).toBe(Math.round(4 * pausePerWord * 1000))
  })

  it('gives a longer chunk a longer silence, for every chunk in the program', () => {
    const sorted = [...chunks].sort((a, b) => a.wordCount - b.wordCount)
    for (let i = 1; i < sorted.length; i++) {
      const prev = silenceMsFor(sorted[i - 1].text)
      const cur = silenceMsFor(sorted[i].text)
      expect(cur).toBeGreaterThanOrEqual(prev)
    }
    // The shortest chunk here still gets over ten seconds to recite into.
    expect(silenceMsFor(sorted[0].text)).toBeGreaterThan(10_000)
  })

  it('handles an empty string without producing a negative wait', () => {
    expect(silenceMsFor('')).toBe(0)
  })
})

describe('AUD-1 — anticipate-then-check, never simultaneous shadowing', () => {
  it('orders the loop cue → silence → answer', () => {
    const cue = src.indexOf("setPhase('cue')")
    const silence = src.indexOf("setPhase('silence')")
    const answer = src.indexOf("setPhase('answer')")
    expect(cue).toBeGreaterThan(-1)
    expect(silence).toBeGreaterThan(cue)
    expect(answer).toBeGreaterThan(silence)
  })

  it('never plays the cue and the answer together', () => {
    // Each speak() is awaited, so nothing overlaps.
    const speaks = src.match(/await speak\(/g) ?? []
    const bare = src.match(/(?<!await )\bspeak\(/g) ?? []
    expect(speaks.length).toBeGreaterThanOrEqual(3)
    expect(bare.length).toBe(0)
  })
})

describe('AUD-2 — the answer is skipped on a self-reported success', () => {
  it('defaults playAnswerOnSuccess to false', () => {
    expect(playAnswerOnSuccess).toBe(false)
  })
  it('gates the answer on the success flag', () => {
    expect(src).toMatch(/if \(passive \|\| playAnswerOnSuccess \|\| !gotIt\.current\)/)
  })
})

describe('SAFE-1 — commute mode requires no screen interaction', () => {
  it('advances the loop without any tap', () => {
    // The loop's own effect moves to the next card; the buttons only accelerate it.
    expect(src).toMatch(/setI\(\(x\) => x \+ 1\)/)
  })
  it('shows a safety notice on first use and keeps passive listening one tap away', () => {
    expect(src).toMatch(/phase === 'notice'/)
    expect(src).toMatch(/Passive listening only/)
    expect(src).toMatch(/Just play it to me/)
  })
  it('uses targets big enough to hit without looking', () => {
    expect(src).toMatch(/min-h-\[8rem\]/)
  })
})

describe('CHK-2 — the spoken reference component of the compound cue', () => {
  it('reads a reference as words rather than punctuation', () => {
    expect(spokenRef('1:9b–10')).toBe('1 9b to 10')
    expect(spokenRef('1:7')).toBe('1 7')
  })
})
