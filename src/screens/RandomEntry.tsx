import { useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { chunkById, nextChunk } from '../content/content'
import { setState, useStore } from '../storage/store'
import { applyVerdict, isoDay, chunkCardId } from '../engine/scheduler'
import { randomEntryNode } from '../engine/planner'
import { navigate } from '../nav'

/**
 * SCH-7: the app names a node and you begin there. This is the answer to the failure
 * mode of a pure serial chain — after a lapse you should not have to restart from
 * verse one — and it is why CHK-6 keeps a content-addressable hierarchy above the chain.
 */
export function RandomEntry() {
  const s = useStore()
  const [id] = useState(() => randomEntryNode(s))
  const chunk = id ? chunkById.get(id) : null
  const after = useMemo(() => (chunk ? nextChunk(chunk.id) : undefined), [chunk])
  const [revealed, setRevealed] = useState(false)

  if (!chunk) {
    return (
      <Shell title="Random entry" back="/">
        <p className="text-neutral-400 mt-6">Not enough encoded yet for this drill.</p>
      </Shell>
    )
  }

  const grade = (verdict: 'clean' | 'again') => {
    setState((st) => {
      const cardId = chunkCardId(chunk.id)
      const c = st.cards[cardId]
      if (!c) return st
      return {
        ...st,
        lastRandomEntryDrill: isoDay(new Date()),
        cards: { ...st.cards, [cardId]: applyVerdict(c, verdict) },
        reviews: [
          ...st.reviews,
          {
            id: crypto.randomUUID(),
            cardId,
            at: new Date().toISOString(),
            mode: 'recall' as const,
            grade: verdict === 'clean' ? (3 as const) : (1 as const),
            accuracy: null,
            errors: [],
          },
        ],
      }
    })
    navigate('/')
  }

  return (
    <Shell title="Random entry" back="/">
      <div className="mt-8">
        <p className="text-neutral-400 leading-relaxed mb-8">
          No run-up. Start here and keep going for two chunks.
        </p>
        <div className="label mb-3">Start at</div>
        <div className="font-scripture text-[3.5rem] leading-none">{chunk.ref}</div>
        <div className="text-neutral-500 mt-3">{chunk.landmark}</div>
      </div>

      <div className="mt-12 space-y-3 pb-10">
        {!revealed ? (
          <button className="tap-secondary w-full" onClick={() => setRevealed(true)}>
            Check where that was
          </button>
        ) : (
          <div className="rounded-2xl bg-ink-900 border border-ink-700 p-4 mb-2">
            <p className="scripture text-[1.2rem]">{chunk.cue}…</p>
            {after && <p className="text-xs text-neutral-500 mt-3">then {after.ref} · {after.landmark}</p>}
          </div>
        )}
        <button className="tap-primary w-full" onClick={() => grade('clean')}>
          Found it and kept going
        </button>
        <button className="tap-secondary w-full" onClick={() => grade('again')}>
          Had to start from the beginning
        </button>
      </div>
    </Shell>
  )
}
