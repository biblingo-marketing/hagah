import raw from './romans.json'

export type Chunk = {
  id: string
  /** Display reference, e.g. "1:8–9a". Sub-verse splits are allowed (CHK-1: discourse units). */
  ref: string
  /** CHK-2: the structural landmark component of the compound cue. */
  landmark: string
  sectionId: string
  /** CHK-3: the retrieval cue is the opening clause. */
  cue: string
  /** CHK-5: the meaningful units. Also the fixed layout (CHK-4) and ACQ-5's line weighting. */
  lines: string[]
  text: string
  wordCount: number
  /** ACQ-6: one speech-act line, shown only after a retrieval attempt. */
  speechAct: string
  /** ACQ-6: one seam note — why this chunk follows the previous one. */
  seamNote: string
}

export type Program = {
  id: string
  title: string
  subtitle: string
  translationId: string
}

export type Translation = {
  id: string
  name: string
  attribution: string
  publicDomain: boolean
}

export type Section = { id: string; title: string }

export const program = raw.program as Program
export const translation = raw.translation as Translation
export const sections = raw.sections as Section[]
export const chunks = raw.chunks as Chunk[]

export const chunkById = new Map(chunks.map((c) => [c.id, c]))

/** Chunks are an ordered chain; index is the position in the program. */
export const chunkIndex = new Map(chunks.map((c, i) => [c.id, i]))

export function chunkAt(i: number): Chunk | undefined {
  return chunks[i]
}

export function nextChunk(id: string): Chunk | undefined {
  const i = chunkIndex.get(id)
  return i === undefined ? undefined : chunks[i + 1]
}

export function prevChunk(id: string): Chunk | undefined {
  const i = chunkIndex.get(id)
  return i === undefined || i === 0 ? undefined : chunks[i - 1]
}

/**
 * SCH-2: every boundary gets its own seam card.
 * cue = final clause of chunk N, answer = opening clause of N+1.
 * There are exactly chunks.length - 1 of them per program.
 */
export type Seam = { id: string; fromId: string; toId: string; cue: string; answer: string; note: string }

export const seams: Seam[] = chunks.slice(0, -1).map((c, i) => {
  const next = chunks[i + 1]
  return {
    id: `seam:${c.id}>${next.id}`,
    fromId: c.id,
    toId: next.id,
    cue: c.lines[c.lines.length - 1], // final clause of chunk N
    answer: next.lines[0], // opening clause of N+1
    note: next.seamNote,
  }
})

export const seamById = new Map(seams.map((s) => [s.id, s]))

/**
 * CHK-6: program → section → chunk. Practice can start at any node,
 * so a lapse never forces a restart from the beginning.
 */
export function sectionOf(chunk: Chunk): Section | undefined {
  return sections.find((s) => s.id === chunk.sectionId)
}

export function chunksInSection(sectionId: string): Chunk[] {
  return chunks.filter((c) => c.sectionId === sectionId)
}
