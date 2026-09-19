import { cleanRecitationsToStop, feedbackOnCorrect } from './params'

/**
 * The acquisition state machine as a pure function, so ACQ-1, ACQ-3 and ACQ-4 can be
 * proved by test rather than asserted in a comment. The Encode screen is a renderer
 * for this and holds no transition logic of its own.
 */
export type Phase = 'guess' | 'aloud' | 'recall' | 'feedback' | 'extra' | 'done'
export type Event = 'tried' | 'read-aloud' | 'clean' | 'stumbled' | 'continue'

export type AcqState = {
  phase: Phase
  clean: number
  /** ACQ-6: meaning aids are unreachable until a retrieval attempt has happened. */
  attempted: boolean
  /** ACQ-5: whether this chunk has interior lines that earn an extra rehearsal turn. */
  hasInterior: boolean
}

export function initialState(hasInterior: boolean): AcqState {
  // ACQ-1: a chunk with zero reps opens cue-only. There is no other entry point.
  return { phase: 'guess', clean: 0, attempted: false, hasInterior }
}

export function step(s: AcqState, e: Event): AcqState {
  switch (s.phase) {
    case 'guess':
      // ACQ-1: the only way out of the guess state is having attempted it.
      return e === 'tried' ? { ...s, phase: 'aloud' } : s

    case 'aloud':
      // ACQ-2: one aloud read, then straight to overt recall.
      return e === 'read-aloud' ? { ...s, phase: 'recall' } : s

    case 'recall': {
      if (e === 'clean') {
        const clean = s.clean + 1
        // ACQ-4: stop is forced at criterion; ACQ-3: a clean attempt never re-shows the text.
        const phase: Phase = clean >= cleanRecitationsToStop ? 'done' : 'recall'
        return { ...s, phase, clean, attempted: true }
      }
      if (e === 'stumbled') {
        // ACQ-3: correct-answer feedback only after a failed or hesitant attempt.
        return { ...s, phase: 'feedback', attempted: true }
      }
      return s
    }

    case 'feedback':
      return e === 'continue' ? { ...s, phase: s.hasInterior ? 'extra' : 'recall' } : s

    case 'extra':
      return e === 'continue' ? { ...s, phase: 'recall' } : s

    case 'done':
      // ACQ-4: there is no "one more time". Nothing moves out of done.
      return s
  }
}

/** ACQ-3: the states that show the full text. Reachable only after a miss, or the first read. */
export const revealsFullText = (p: Phase) => p === 'aloud' || p === 'feedback'

/** ACQ-6: meaning aids may render only here, and only once an attempt has happened. */
export const showsMeaning = (s: AcqState) => s.phase === 'feedback' && s.attempted

/** ACQ-4: exposed so the screen cannot invent a continue affordance. */
export const canContinuePastCriterion = false
export { cleanRecitationsToStop, feedbackOnCorrect }
