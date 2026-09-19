import { describe, it, expect } from 'vitest'
import { score, align, normalizeWord, startedWithAnotherChunk } from '../diff'
import { chunks } from '../../content/content'

const c1 = chunks[0] // Romans 1:1-2
const c4 = chunks[3] // Romans 1:7

describe('DIFF-2 — normalization before diffing', () => {
  it('ignores case and punctuation', () => {
    expect(normalizeWord('Gospel,')).toBe('gospel')
    expect(normalizeWord('“The')).toBe('the')
  })
  it('strips diacritics', () => {
    expect(normalizeWord('ἀπόστολος')).toBe(normalizeWord('αποστολος'))
  })
  it('folds final sigma', () => {
    expect(normalizeWord('Ἰησοῦς')).toBe(normalizeWord('ιησουσ'))
    expect(normalizeWord('λόγος')).toBe('λογοσ')
  })
  it('keeps apostrophes, which distinguish words', () => {
    expect(normalizeWord('God’s')).toBe("god's")
    expect(normalizeWord('God')).not.toBe(normalizeWord('God’s'))
  })
})

describe('a perfect recitation', () => {
  it('scores clean at 100%', () => {
    const s = score(c1.lines, c1.text, c1.id)
    expect(s.clean).toBe(true)
    expect(s.wordAccuracy).toBe(1)
    expect(s.clauseAccuracy).toBe(1)
    expect(s.drift).toBe(false)
    expect(s.misses).toHaveLength(0)
  })

  it('still scores clean with different casing and punctuation', () => {
    const sloppy = c1.text.toUpperCase().replace(/[,—]/g, '')
    expect(score(c1.lines, sloppy, c1.id).clean).toBe(true)
  })
})

describe('DIFF-1 — every miss is classified', () => {
  it('catches an omission', () => {
    const s = score(c1.lines, c1.text.replace('a servant of ', ''), c1.id)
    expect(s.misses.map((m) => m.klass)).toContain('omission')
    expect(s.clean).toBe(false)
  })

  it('catches an insertion', () => {
    const s = score(c1.lines, c1.text.replace('Paul,', 'Paul the apostle,'), c1.id)
    expect(s.misses.map((m) => m.klass)).toContain('insertion')
  })

  it('classifies a connective swap separately from a content-word swap', () => {
    const connective = score(c1.lines, c1.text.replace('and set apart', 'but set apart'), c1.id)
    expect(connective.misses.map((m) => m.klass)).toContain('connective-swap')

    const content = score(c1.lines, c1.text.replace('servant', 'slave'), c1.id)
    expect(content.misses.map((m) => m.klass)).toContain('synonym-substitution')
  })

  it('records what was expected and what was said', () => {
    const s = score(c1.lines, c1.text.replace('servant', 'slave'), c1.id)
    const m = s.misses.find((x) => x.klass === 'synonym-substitution')!
    expect(m.expected).toMatch(/servant/)
    expect(m.got).toMatch(/slave/)
  })

  it('flags starting with another chunk’s opening clause', () => {
    expect(startedWithAnotherChunk(c1.id, c4.text)).toBe(true)
    expect(startedWithAnotherChunk(c1.id, c1.text)).toBe(false)
  })
})

describe('DIFF-3 — translation drift is a miss, not a pass', () => {
  it('fails a fluent paraphrase that keeps the sense', () => {
    const paraphrase =
      'Paul, a slave of Christ Jesus, summoned to be an apostle, and separated for the good news of God— ' +
      'the good news He pledged in advance through His prophets in the Sacred Scriptures,'
    const s = score(c1.lines, paraphrase, c1.id)
    expect(s.clean).toBe(false)
    expect(s.drift).toBe(true)
    // Fluent enough to feel right, which is exactly why it must not pass.
    expect(s.wordAccuracy).toBeGreaterThan(0.6)
  })

  it('does not call a half-forgotten recitation drift', () => {
    const s = score(c1.lines, 'Paul, a servant of Christ Jesus, called to be an apostle,', c1.id)
    expect(s.drift).toBe(false)
    expect(s.misses.every((m) => m.klass === 'omission')).toBe(true)
  })
})

describe('RUN-2 — clause accuracy is what gates the run tier', () => {
  it('counts a line as lost when anything inside it goes wrong', () => {
    const broken = [...c1.lines]
    broken[1] = 'called to be a messenger,'
    const s = score(c1.lines, broken.join(' '), c1.id)
    expect(s.clauseAccuracy).toBeCloseTo((c1.lines.length - 1) / c1.lines.length)
    expect(s.clauseAccuracy).toBeLessThan(s.wordAccuracy)
  })
})

describe('alignment', () => {
  it('collapses an adjacent drop-and-add into one substitution', () => {
    const ops = align('the power of God', 'the strength of God')
    expect(ops.filter((o) => o.op === 'substitute')).toHaveLength(1)
    expect(ops.filter((o) => o.op === 'omit' || o.op === 'insert')).toHaveLength(0)
  })

  it('handles an empty attempt without crashing', () => {
    const s = score(c1.lines, '', c1.id)
    expect(s.wordAccuracy).toBe(0)
    expect(s.clauseAccuracy).toBe(0)
    expect(s.misses.every((m) => m.klass === 'omission')).toBe(true)
  })
})

describe('every chunk round-trips against itself', () => {
  it('scores 100% clean for all of them', () => {
    for (const c of chunks) {
      const s = score(c.lines, c.text, c.id)
      expect({ id: c.id, clean: s.clean }).toEqual({ id: c.id, clean: true })
    }
  })
})
