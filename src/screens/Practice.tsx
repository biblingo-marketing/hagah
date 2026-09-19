import { Shell } from '../components/Shell'
import { useStore } from '../storage/store'
import {
  encodeAvailability,
  practiceAllOrder,
  seamsOnlyOrder,
  commuteOrder,
  runOrder,
  randomEntryNode,
  encodedCards,
} from '../engine/planner'
import { isoDay } from '../engine/scheduler'
import { newChunkCap, resolve } from '../engine/settings'
import { chunkById, chunks } from '../content/content'
import { seamsPassMinutes } from '../engine/params'
import { navigate } from '../nav'

/**
 * Everything, on demand. The plan says what today calls for; this says what is
 * possible. Nothing here is hidden because the calendar did not ask for it — a mode
 * is only unavailable when it genuinely cannot run, and then it says why.
 */
export function Practice() {
  const s = useStore()
  const today = isoDay(new Date())
  const cap = newChunkCap(s)

  const encode = encodeAvailability(s, today, cap)
  const all = practiceAllOrder(s)
  const seams = seamsOnlyOrder(s)
  const commute = commuteOrder(s, today)
  const run = runOrder(s, today)
  const drillNode = randomEntryNode(s)
  const encodedCount = encodedCards(s).filter((c) => c.kind === 'chunk').length
  const threshold = Math.round(resolve(s, 'runEligibilityAccuracy') * 100)

  return (
    <Shell title="Practice" tab="practice">
      <p className="text-sm text-neutral-400 leading-relaxed mb-7 mt-1">
        Anything, any time. The plan is a suggestion about when — not a lock on what.
      </p>

      <div className="space-y-6 pb-8">
        <Group label="New material">
          {encode.ok ? (
            <Item
              title={`Encode ${chunkById.get(encode.chunkId)?.ref}`}
              sub={chunkById.get(encode.chunkId)?.landmark}
              primary
              onClick={() => navigate(`/encode/${encode.chunkId}`)}
            />
          ) : encode.reason === 'none-left' ? (
            <Note>
              Every chunk in {chunks.length > 0 ? 'this program' : 'the program'} has been encoded.
              From here it is all maintenance.
            </Note>
          ) : (
            <Note>
              {encode.encodedToday === 1
                ? 'One new chunk is already encoded today.'
                : `${encode.encodedToday} new chunks are already encoded today.`}{' '}
              The cap is {cap} a day — more than that and the day’s material stops sticking.
              The next one unlocks tomorrow, and you can raise the cap in Settings.
            </Note>
          )}
        </Group>

        <Group label="Cued recall">
          <Item
            title="Recall check"
            sub={all.length ? `${all.length} chunks and seams, most overdue first` : undefined}
            disabled={!all.length}
            disabledNote="Nothing encoded yet — start with a new chunk."
            onClick={() => navigate('/practice/recall')}
          />
          <Item
            title="Seams only"
            sub={seams.length ? `${seams.length} joins · about ${seamsPassMinutes} min` : undefined}
            disabled={!seams.length}
            disabledNote="A seam appears once the chunk on its far side is encoded."
            onClick={() => navigate('/practice/seams')}
          />
        </Group>

        <Group label="Hands-free">
          <Item
            title="Commute"
            sub={commute.length ? `${commute.length} in the queue` : undefined}
            disabled={!commute.length}
            disabledNote="Nothing encoded yet."
            onClick={() => navigate('/commute')}
          />
        </Group>

        <Group label="No device">
          <Item
            title="Run card"
            sub={run.cardIds.length ? `${run.cardIds.length} to recite, plus seams` : undefined}
            disabled={!run.cardIds.length}
            disabledNote={
              encodedCount
                ? `Nothing is at ${threshold}% clause accuracy yet. Do a recall check first — free recall that mostly fails teaches nothing.`
                : 'Nothing encoded yet.'
            }
            onClick={() => navigate('/run')}
          />
          <Item
            title="Random-entry drill"
            sub={drillNode ? 'Start cold at a named place' : undefined}
            disabled={!drillNode}
            disabledNote="Needs at least three chunks encoded."
            onClick={() => navigate('/random-entry')}
          />
        </Group>

        <Group label="Verification">
          <Item
            title="Weekly check"
            sub={encodedCount ? `Everything you have · ${encodedCount} chunks` : undefined}
            disabled={!encodedCount}
            disabledNote="Nothing encoded yet."
            onClick={() => navigate('/weekly')}
          />
          <Item
            title="Whole passage"
            sub={encodedCount >= 3 ? 'Start to finish, no text' : undefined}
            disabled={encodedCount < 3}
            disabledNote="Needs at least three chunks encoded."
            onClick={() => navigate('/integrity')}
          />
        </Group>
      </div>
    </Shell>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="label mb-2.5">{label}</div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function Item({
  title,
  sub,
  onClick,
  primary = false,
  disabled = false,
  disabledNote,
}: {
  title: string
  sub?: string
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  disabledNote?: string
}) {
  if (disabled) {
    return (
      <div className="rounded-2xl border border-ink-800 px-5 py-4">
        <div className="font-semibold text-neutral-600">{title}</div>
        {disabledNote && <p className="text-xs text-neutral-600 mt-1 leading-snug">{disabledNote}</p>}
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl px-5 py-4 min-h-[4rem] active:scale-[0.99] transition-transform ${
        primary ? 'bg-neutral-100 text-ink-950' : 'bg-ink-800 border border-ink-700 text-neutral-100'
      }`}
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
    >
      <div className="font-semibold text-lg">{title}</div>
      {sub && (
        <div className={`text-xs mt-0.5 ${primary ? 'text-ink-950/60' : 'text-neutral-500'}`}>{sub}</div>
      )}
    </button>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-800 px-5 py-4">
      <p className="text-sm text-neutral-400 leading-relaxed">{children}</p>
    </div>
  )
}
