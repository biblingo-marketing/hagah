import { VerifySession } from '../components/VerifySession'
import { useStore } from '../storage/store'
import { screenReviewOrder } from '../engine/planner'
import { isoDay } from '../engine/scheduler'

/** The daily cued recall check. Scored against the text, word by word. */
export function RecallCheck() {
  const s = useStore()
  const today = isoDay(new Date())
  return <VerifySession title="Recall check" mode="recall" queue={screenReviewOrder(s, today)} />
}
