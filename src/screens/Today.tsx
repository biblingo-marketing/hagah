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
  encodeAvailability,
} from '../engine/planner'
import { isoDay, stabilityOf, stabilityColor, chunkCardId } from '../engine/scheduler'
import { newChunkCap } from '../engine/settings'
import { chunkById, program, translation, chunks } from '../content/content'
import { navigate } from '../nav'

/**
 * Today shows what today's blocks call for, and nothing else: no backlog, no count of
 * what was skipped, no streak (PLAN-3, CLAUDE.md guardrail 4).
 *
 * What it does *not* do is prevent anything. A mode missing here means the plan did
 * not ask for it today, not that it is unavailable — Practice reaches all of them.
 */
export function Today() {
  const s = useStore()
  const today = isoDay(new Date())
  const todaysBlocks = blocksOn(s.blocks, today)
  const nextNew = nextUnencodedChunkId(s)
  const encode = encodeAvailability(s, today, newChunkCap(s))
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
          className="tap-secondary w-full mt-3"
          onClick={() => navigate(nextNew ? `/encode/${nextNew}` : '/practice')}
        >
          Just start practicing
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

  const scheduled: { key: string; label: string; to: string; primary?: boolean }[] = []
  // RUN-5: never quietly droppable, so it leads when due.
  if (weekly) scheduled.push({ key: 'weekly', label: 'Weekly check', to: '/weekly', primary: true })
  if (integrity !== null)
    scheduled.push({ key: 'integrity', label: `Whole passage · day ${integrity}`, to: '/integrity', primary: true })
  if (hasScreen && encode.ok)
    scheduled.push({
      key: 'encode',
      label: `Encode ${chunkById.get(encode.chunkId)?.ref}`,
      to: `/encode/${encode.chunkId}`,
      primary: !weekly && integrity === null,
    })
  if (hasScreen && reviewIds.length)
    scheduled.push({ key: 'recall', label: `Recall check · ${reviewIds.length}`, to: '/recall' })
  if (hasRecall && run.cardIds.length)
    scheduled.push({ key: 'run', label: 'Run card', to: '/run' })
  if (hasAudio && commuteIds.length)
    scheduled.push({ key: 'commute', label: `Commute · ${commuteIds.length}`, to: '/commute' })
  if (drill) scheduled.push({ key: 'drill', label: 'Random-entry drill', to: '/random-entry' })

  return (
    <Shell tab="today">
      <div className="pt-8 pb-5">
        <h1 className="font-scripture text-4xl tracking-tight">{program.title}</h1>
        <p className="text-neutral-500 text-sm mt-1">
          {program.subtitle} · {encoded.length} of {chunks.length} encoded
        </p>
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

      {scheduled.length > 0 && <div className="label mb-2.5">Today</div>}

      <div className="space-y-3">
        {scheduled.map((item) => (
          <button
            key={item.key}
            className={item.primary ? 'tap-primary w-full' : 'tap-secondary w-full'}
            onClick={() => navigate(item.to)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {scheduled.length === 0 && (
        <p className="text-neutral-400 leading-relaxed mb-5">
          {noBlocksToday
            ? 'No block scheduled today. Nothing is owed.'
            : 'Today’s blocks are done. Nothing is owed.'}
        </p>
      )}

      {/* The schedule never blocks practice — it only says what today asked for. */}
      <button className="tap-secondary w-full mt-3" onClick={() => navigate('/practice')}>
        {scheduled.length ? 'Practice something else' : 'Practice anyway'}
      </button>

      {hasScreen && !encode.ok && encode.reason === 'cap-reached' && (
        <p className="text-neutral-600 text-sm mt-5 leading-relaxed">
          Today’s new chunk is done. The next one opens tomorrow.
        </p>
      )}

      <p className="text-xs text-neutral-600 leading-relaxed mt-12 pb-6">{translation.attribution}</p>
    </Shell>
  )
}
