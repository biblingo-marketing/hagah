import { Shell } from '../components/Shell'
import { useStore } from '../storage/store'
import {
  nextUnencodedChunkId,
  screenReviewOrder,
  commuteOrder,
  runOrder,
  blocksOn,
  weeklyCheckDue,
  randomEntryDue,
  integrityDue,
} from '../engine/planner'
import { isoDay, stabilityOf, stabilityColor, chunkCardId } from '../engine/scheduler'
import { chunkById, program, translation, chunks } from '../content/content'
import { navigate } from '../nav'

/**
 * One decision per screen. Today shows what today's blocks call for and nothing else:
 * no backlog, no count of what was skipped, no streak (PLAN-3, and CLAUDE.md guardrail 4).
 */
export function Today() {
  const s = useStore()
  const today = isoDay(new Date())
  const todaysBlocks = blocksOn(s.blocks, today)
  const nextNew = nextUnencodedChunkId(s)
  const reviewIds = screenReviewOrder(s, today)
  const commuteIds = commuteOrder(s, today)
  const run = runOrder(s, today)
  const encoded = chunks.filter((c) => s.cards[chunkCardId(c.id)]?.encodedOn)

  const hasScreen = todaysBlocks.some((b) => b.kind === 'screen')
  const hasAudio = todaysBlocks.some((b) => b.kind === 'audio')
  const hasRecall = todaysBlocks.some((b) => b.kind === 'recall')
  const noBlocksToday = s.onboarded && todaysBlocks.length === 0

  const weekly = weeklyCheckDue(s, today)
  const drill = randomEntryDue(s, today)
  const integrity = integrityDue(s, today)

  if (!s.onboarded) {
    return (
      <Shell>
        <div className="pt-16 pb-6">
          <h1 className="font-scripture text-5xl tracking-tight">Hagah</h1>
          <p className="text-neutral-500 mt-2 text-sm">by Biblingo</p>
        </div>
        <p className="scripture text-[1.5rem] leading-snug mb-4">
          A training plan for memorizing {program.title} around the hours you actually have.
        </p>
        <p className="text-neutral-400 text-sm leading-relaxed mb-10">
          {program.subtitle} · {chunks.length} chunks, chunked at discourse boundaries.
        </p>
        <button className="tap-primary w-full" onClick={() => navigate('/blocks')}>
          Set up my week
        </button>
        <button
          className="text-sm text-neutral-400 underline underline-offset-4 mt-8"
          onClick={() => navigate('/boundaries')}
        >
          Look at the chunk boundaries first
        </button>
        <p className="text-xs text-neutral-600 leading-relaxed mt-12 pb-10">{translation.attribution}</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="pt-8 pb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-scripture text-4xl tracking-tight">{program.title}</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {program.subtitle} · {encoded.length} of {chunks.length} encoded
          </p>
        </div>
        <button
          onClick={() => navigate('/settings')}
          className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-neutral-500 text-xl shrink-0"
          aria-label="Settings"
        >
          ⋯
        </button>
      </div>

      {/* Stability is a colour, never a number (SCH-1, product.md). */}
      {encoded.length > 0 && (
        <div className="flex gap-1 mb-7" aria-label="How firmly each chunk is held">
          {chunks.map((c) => {
            const card = s.cards[chunkCardId(c.id)]
            return (
              <div
                key={c.id}
                title={c.ref}
                className={`h-2 flex-1 rounded-full ${card ? stabilityColor[stabilityOf(card)] : 'bg-ink-800'}`}
              />
            )
          })}
        </div>
      )}

      <div className="space-y-3">
        {/* RUN-5: never quietly droppable, so it sits above everything else when due. */}
        {weekly && (
          <button className="tap-primary w-full" onClick={() => navigate('/weekly')}>
            Weekly check
          </button>
        )}

        {integrity !== null && (
          <button className="tap-primary w-full" onClick={() => navigate('/integrity')}>
            Whole passage · day {integrity}
          </button>
        )}

        {hasScreen && nextNew && (
          <button className={weekly ? 'tap-secondary w-full' : 'tap-primary w-full'} onClick={() => navigate(`/encode/${nextNew}`)}>
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
            Commute · {commuteIds.length}
          </button>
        )}

        {drill && (
          <button className="tap-secondary w-full" onClick={() => navigate('/random-entry')}>
            Random-entry drill
          </button>
        )}
      </div>

      {noBlocksToday && !weekly && integrity === null && (
        <p className="text-neutral-500 mt-8 leading-relaxed">
          No block scheduled today. Nothing is owed.
        </p>
      )}

      {!hasScreen && nextNew && !noBlocksToday && (
        <p className="text-neutral-600 text-sm mt-6 leading-relaxed">
          New material waits for a screen block. Today has none.
        </p>
      )}

      <div className="mt-10 flex flex-col items-start gap-3">
        <button className="text-sm text-neutral-400 underline underline-offset-4" onClick={() => navigate('/plan')}>
          See the plan
        </button>
        <button
          className="text-sm text-neutral-400 underline underline-offset-4"
          onClick={() => navigate('/boundaries')}
        >
          Chunk boundaries
        </button>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed mt-12 pb-10">{translation.attribution}</p>
    </Shell>
  )
}
