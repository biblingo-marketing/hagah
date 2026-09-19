import { middleWeight } from './params'

/**
 * ACQ-5: "On each re-read, the chunk's middle lines are visually weighted and get
 * extra rehearsal turns." middleWeight = 1.5.
 *
 * Serial position means the first and last units of a chunk are privileged for free
 * at first exposure; the interior is what decays. So weight rises smoothly from 1.0
 * at each edge to `middleWeight` at the centre, rather than stepping. A two-line
 * chunk has no interior and gets no weighting.
 *
 * Evidence tier B/C and low-moderate confidence, so this is a tunable with an
 * instrument, not a hardcoded assumption (protocol.md §10, experiment E4).
 */
export function rehearsalAllocation(lineCount: number, weight = middleWeight): number[] {
  if (lineCount <= 0) return []
  if (lineCount <= 2) return new Array(lineCount).fill(1)
  return Array.from({ length: lineCount }, (_, i) => {
    const position = (2 * i) / (lineCount - 1) - 1 // -1 at the first line, +1 at the last
    return 1 + (weight - 1) * (1 - Math.abs(position))
  })
}

/**
 * The lines that earn an extra rehearsal turn on a re-read: everything weighted
 * above the chunk's mean. For a 4-line chunk that is the middle two.
 */
export function extraRehearsalLines(lineCount: number, weight = middleWeight): number[] {
  const alloc = rehearsalAllocation(lineCount, weight)
  if (alloc.length <= 2) return []
  const mean = alloc.reduce((a, b) => a + b, 0) / alloc.length
  return alloc.map((w, i) => (w > mean ? i : -1)).filter((i) => i >= 0)
}

/** Opacity for the visual weighting, so the interior reads as the emphasised part. */
export function lineEmphasis(lineCount: number, index: number, weight = middleWeight): number {
  const alloc = rehearsalAllocation(lineCount, weight)
  if (!alloc.length) return 1
  const max = Math.max(...alloc)
  const min = Math.min(...alloc)
  if (max === min) return 1
  // Edges dim to 0.62, the centre stays at full strength.
  return 0.62 + 0.38 * ((alloc[index] - min) / (max - min))
}
