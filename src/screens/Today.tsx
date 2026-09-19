import { Shell } from '../components/Shell'
import { useStore } from '../storage/store'
import {
  projectPlan,
  nextUnencodedChunkId,
  screenReviewOrder,
  commuteOrder,
  runOrder,
  blocksOn,
} from '../engine/planner'
import { isoDay } from '../engine/scheduler'
import { chunkById, program, translation, chunks } from '../content/content'
import { navigate } from '../nav'

/**
 * One decision per screen. Today shows only what today's blocks call for —
 * never a backlog, never a count of what was skipped (PLAN-3).
 */
export function Today() {
  const s = useStore()
  const today = isoDay(new Date())
  const todaysBlocks = blocksOn(s.blocks, today)
  const nextNew = nextUnencodedChunkId(s)
  const reviewIds = screenReviewOrder(s, today)
  const commuteIds = commuteOrder(s, today)
  const run = runOrder(s, today)
  const encodedCount = chunks.filter((c) => s.cards[`chunk:${c.id}`]?.encodedOn).length

  const hasScreen = todaysBlocks.some((b) => b.kind === 'screen')
  const hasAudio = todaysBlocks.some((b) => b.kind === 'audio')
  const hasRecall = todaysBlocks.some((b) => b.kind === 'recall')

  return (
    <Shell>
      <div className="pt-8 pb-5">
        <h1 className="font-scripture text-4xl tracking-tight">{program.title}</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {program.subtitle} · {encodedCount} of {chunks.length} chunks encoded
        </p>
      </div>

      <div className="space-y-3">
        {hasScreen && nextNew && (
          <button className="tap-primary w-full" onClick={() => navigate(`/encode/${nextNew}`)}>
            Encode {chunkById.get(nextNew)?.ref}
          </button>
        )}

        {reviewIds.length > 0 && (
          <button className="tap-secondary w-full" onClick={() => navigate('/recall')}>
            Recall check · {reviewIds.length}
          </button>
        )}

        {hasRecall && run.cardIds.length > 0 && (
          <button className="tap-secondary w-full" onClick={() => navigate('/run')}>
            Run card
          </button>
        )}

        {hasAudio && commuteIds.length > 0 && (
          <button className="tap-secondary w-full" onClick={() => navigate('/commute')}>
            Commute
          </button>
        )}

        {!s.onboarded && (
          <button className="tap-primary w-full" onClick={() => navigate('/blocks')}>
            Set up my week
          </button>
        )}
      </div>

      <div className="mt-10 space-y-3">
        <button className="text-sm text-neutral-400 underline underline-offset-4" onClick={() => navigate('/plan')}>
          See the plan
        </button>
        <div />
        <button
          className="text-sm text-neutral-400 underline underline-offset-4"
          onClick={() => navigate('/boundaries')}
        >
          Review chunk boundaries
        </button>
      </div>

      {s.blocks.length > 0 && projectPlan(s, today).length === 0 && (
        <p className="text-sm text-neutral-500 mt-6">Nothing scheduled today.</p>
      )}

      <p className="text-xs text-neutral-600 leading-relaxed mt-12 pb-10">{translation.attribution}</p>
    </Shell>
  )
}
