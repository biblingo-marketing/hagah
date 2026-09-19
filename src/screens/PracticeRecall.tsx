import { VerifySession } from '../components/VerifySession'
import { useStore } from '../storage/store'
import { practiceAllOrder, seamsOnlyOrder } from '../engine/planner'

/**
 * On-demand cued recall over everything encoded, most-overdue first — rather than the
 * scheduled screen-block queue. Reviewing a card before FSRS asks for it is fine:
 * the scheduler works from elapsed time since the last review, so an early review is
 * scored on its own terms rather than discarded.
 */
export function PracticeRecall() {
  const s = useStore()
  return (
    <VerifySession
      title="Recall check"
      mode="recall"
      queue={practiceAllOrder(s)}
      intro="Recite it aloud, all the way through. Then it gets scored against the text."
    />
  )
}

/**
 * The seams-only pass, standalone. RUN-3 runs it inside the run card; the evidence
 * review ranks a daily five-minute seams pass seventh of ten changes. Errors cluster
 * at the joins because verbatim recall is regenerated from meaning rather than
 * replayed, so the joins are where there is least to regenerate from.
 */
export function PracticeSeams() {
  const s = useStore()
  return (
    <VerifySession
      title="Seams"
      mode="seam"
      queue={seamsOnlyOrder(s)}
      summarize
      intro="End of the one you have, straight into the start of the next. Just the join — stop after the first clause."
    />
  )
}
