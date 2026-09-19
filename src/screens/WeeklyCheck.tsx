import { VerifySession } from '../components/VerifySession'
import { useStore } from '../storage/store'
import { encodedCards } from '../engine/planner'

/**
 * RUN-5: a weekly overt check — aloud or typed, scored against the text — runs
 * regardless of how well silent recall is going, because covert recall cannot
 * detect its own drift. It is not quietly droppable (protocol.md §13).
 */
export function WeeklyCheck() {
  const s = useStore()
  const queue = encodedCards(s)
    .filter((c) => c.kind === 'chunk')
    .sort((a, b) => (a.encodedOn ?? '').localeCompare(b.encodedOn ?? ''))
    .map((c) => c.id)

  return (
    <VerifySession
      title="Weekly check"
      mode="weekly"
      queue={queue}
      summarize
      intro="Everything you have, verbatim, scored against the text. This is the one that catches drift you cannot hear yourself."
    />
  )
}
