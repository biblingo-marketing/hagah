import { connectives } from './params'
import type { ErrorClass } from './params'
import { chunks } from '../content/content'

/**
 * DIFF-2: normalization before diffing — case, punctuation, diacritics, final sigma.
 * Greek scoring is labelled experimental in the UI (SAFE-4); this handles the
 * mechanics but no engine has a Koine acoustic model, so the label stands.
 */
export function normalizeWord(w: string): string {
  return w
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .toLowerCase()
    .replace(/ς/g, 'σ') // final sigma → sigma
    .replace(/[’'’]/g, "'") // curly apostrophes, kept: they distinguish words
    .replace(/[^\p{L}\p{N}']/gu, '')
}

export function tokenize(text: string): { raw: string; norm: string }[] {
  return text
    .split(/\s+/)
    .map((raw) => ({ raw, norm: normalizeWord(raw) }))
    .filter((t) => t.norm.length > 0)
}

export type Op =
  | { op: 'match'; expected: string; got: string; ei: number }
  | { op: 'substitute'; expected: string; got: string; ei: number }
  | { op: 'omit'; expected: string; ei: number }
  | { op: 'insert'; got: string; ei: number }

/** Word-level alignment by LCS. Chunks are ≤60 words, so the DP table is trivial. */
export function align(expected: string, actual: string): Op[] {
  const E = tokenize(expected)
  const A = tokenize(actual)
  const n = E.length
  const m = A.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = E[i - 1].norm === A[j - 1].norm ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

  // Walk back, collecting the edit script in order.
  const ops: Op[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && E[i - 1].norm === A[j - 1].norm) {
      ops.push({ op: 'match', expected: E[i - 1].raw, got: A[j - 1].raw, ei: i - 1 })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ op: 'insert', got: A[j - 1].raw, ei: i })
      j--
    } else {
      ops.push({ op: 'omit', expected: E[i - 1].raw, ei: i - 1 })
      i--
    }
  }
  ops.reverse()

  // Collapse each run of drops-and-adds into substitutions, pairing them positionally.
  // A two-word swap ("an apostle" → "a messenger") is one fluent substitution per word,
  // not a scatter of omissions and insertions — and misclassifying it would also smear
  // the miss across a line boundary and corrupt clause accuracy (RUN-2).
  const out: Op[] = []
  let k = 0
  while (k < ops.length) {
    if (ops[k].op === 'match') {
      out.push(ops[k])
      k++
      continue
    }
    const run: Op[] = []
    while (k < ops.length && ops[k].op !== 'match') run.push(ops[k++])
    const omits = run.filter((o): o is Extract<Op, { op: 'omit' }> => o.op === 'omit')
    const inserts = run.filter((o): o is Extract<Op, { op: 'insert' }> => o.op === 'insert')
    const paired = Math.min(omits.length, inserts.length)
    for (let x = 0; x < paired; x++)
      out.push({
        op: 'substitute',
        expected: omits[x].expected,
        got: inserts[x].got,
        ei: omits[x].ei,
      })
    for (let x = paired; x < omits.length; x++) out.push(omits[x])
    // A surplus added word belongs to the clause it interrupted, not the next one.
    const anchor = omits.length ? omits[omits.length - 1].ei : inserts[0].ei
    for (let x = paired; x < inserts.length; x++) out.push({ ...inserts[x], ei: anchor })
  }
  return out
}

export type Miss = { klass: ErrorClass; expected: string | null; got: string | null; at: number }

export type Score = {
  ops: Op[]
  misses: Miss[]
  /** Fraction of the expected words recited correctly. */
  wordAccuracy: number
  /** RUN-2's measure: fraction of clauses (lines) recited with no error at all. */
  clauseAccuracy: number
  /** DIFF-3: a fluent paraphrase. Scored as a miss, never a pass. */
  drift: boolean
  clean: boolean
}

/**
 * DIFF-1: every miss is classified, not just counted. The class is what makes the
 * review log fittable later, and it follows from the framing finding — verbatim recall
 * is regenerated from meaning plus an activated lexical set, so errors are fluent
 * substitutions that cluster at seams.
 */
function classify(op: Op, startedWrong: boolean): Miss | null {
  if (op.op === 'match') return null
  if (op.op === 'omit') return { klass: 'omission', expected: op.expected, got: null, at: op.ei }
  if (op.op === 'insert') return { klass: 'insertion', expected: null, got: op.got, at: op.ei }
  if (startedWrong && op.ei === 0)
    return { klass: 'wrong-paragraph-start', expected: op.expected, got: op.got, at: op.ei }
  const swapped =
    connectives.has(normalizeWord(op.expected)) || connectives.has(normalizeWord(op.got))
  return {
    klass: swapped ? 'connective-swap' : 'synonym-substitution',
    expected: op.expected,
    got: op.got,
    at: op.ei,
  }
}

/**
 * DIFF-1 wrong-paragraph-start: the recitation opens with another chunk's opening
 * clause. This is the seam failure the whole design is built around, so it gets its
 * own class rather than being logged as a handful of substitutions.
 */
export function startedWithAnotherChunk(expectedChunkId: string, actual: string): boolean {
  const head = tokenize(actual)
    .slice(0, 4)
    .map((t) => t.norm)
    .join(' ')
  if (!head) return false
  for (const c of chunks) {
    if (c.id === expectedChunkId) continue
    const other = tokenize(c.lines[0])
      .slice(0, 4)
      .map((t) => t.norm)
      .join(' ')
    if (other && other === head) return true
  }
  return false
}

export function score(lines: string[], actual: string, chunkId?: string): Score {
  const expected = lines.join(' ')
  const ops = align(expected, actual)
  const startedWrong = chunkId ? startedWithAnotherChunk(chunkId, actual) : false
  const misses = ops.map((o) => classify(o, startedWrong)).filter((m): m is Miss => m !== null)

  const expectedCount = tokenize(expected).length
  const matched = ops.filter((o) => o.op === 'match').length
  const wordAccuracy = expectedCount ? matched / expectedCount : 0

  // Clause accuracy: a line counts only if nothing went wrong inside it.
  const lineOf: number[] = []
  lines.forEach((line, li) => tokenize(line).forEach(() => lineOf.push(li)))
  const dirty = new Set<number>()
  for (const m of misses) {
    const li = lineOf[Math.min(m.at, lineOf.length - 1)]
    if (li !== undefined) dirty.add(li)
  }
  const clauseAccuracy = lines.length ? (lines.length - dirty.size) / lines.length : 0

  // DIFF-3: translation drift is an error class, not a pass. A recitation of roughly
  // the right length whose errors are mostly word swaps is a paraphrase, however fluent.
  const subs = misses.filter(
    (m) => m.klass === 'synonym-substitution' || m.klass === 'connective-swap',
  ).length
  const structural = misses.filter((m) => m.klass === 'omission' || m.klass === 'insertion').length
  const drift = subs > 0 && subs >= structural && wordAccuracy >= 0.6

  return { ops, misses, wordAccuracy, clauseAccuracy, drift, clean: misses.length === 0 }
}

export function missSummary(misses: Miss[]): { klass: ErrorClass; n: number }[] {
  const counts = new Map<ErrorClass, number>()
  for (const m of misses) counts.set(m.klass, (counts.get(m.klass) ?? 0) + 1)
  return [...counts.entries()].map(([klass, n]) => ({ klass, n })).sort((a, b) => b.n - a.n)
}

export const errorClassLabel: Record<ErrorClass, string> = {
  'synonym-substitution': 'word swapped',
  'connective-swap': 'connective swapped',
  omission: 'dropped',
  insertion: 'added',
  'wrong-paragraph-start': 'started in the wrong place',
}
