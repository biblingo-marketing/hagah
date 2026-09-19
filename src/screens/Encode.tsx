import { useState } from 'react'
import { Shell } from '../components/Shell'
import { chunkById, prevChunk } from '../content/content'
import { setState, useStore } from '../storage/store'
import { applyVerdict, chunkCardId, isoDay } from '../engine/scheduler'
import { lineEmphasis, extraRehearsalLines } from '../engine/rehearsal'
import { initialState, step, showsMeaning } from '../engine/acquisition'
import { cleanRecitationsToStop, aloudPromptOnFirstExposure } from '../engine/params'
import { resolve } from '../engine/settings'
import { navigate } from '../nav'

/**
 * The acquisition state machine, ACQ-1 through ACQ-6.
 *
 *   guess ──► aloud ──► recall ──┬─ clean ──► recall … ──► done (at criterion)
 *                        ▲       └─ stumbled ──► feedback ──► extra ──┘
 *                        └───────────────────────────────────────────┘
 *
 * The order is load-bearing, not cosmetic: the attempt comes before the reveal
 * (ACQ-1), the first reveal is read aloud (ACQ-2), feedback appears only after a
 * miss (ACQ-3), meaning arrives only after a retrieval attempt (ACQ-6), and the
 * session ends itself at criterion with nothing to press (ACQ-4).
 */
export function Encode({ chunkId }: { chunkId: string }) {
  const store = useStore()
  const speakVerseNumbers = resolve(store, 'speakVerseNumbers')
  const chunk = chunkById.get(chunkId)
  const hasInterior = (chunk?.lines.length ?? 0) > 2
  const [acq, setAcq] = useState(() => initialState(hasInterior))
  const send = (e: Parameters<typeof step>[1]) => setAcq((s) => step(s, e))
  const { phase, clean } = acq

  if (!chunk) {
    return (
      <Shell title="Encode" back="/">
        <p className="text-neutral-400">That chunk does not exist.</p>
      </Shell>
    )
  }

  const previous = prevChunk(chunk.id)
  const emphasis = (i: number) => lineEmphasis(chunk.lines.length, i)
  const extra = extraRehearsalLines(chunk.lines.length)
  // No scrolling during encode: the longest chunks step down a size rather than overflow.
  const size =
    chunk.wordCount > 48 ? 'text-[1.28rem]' : chunk.wordCount > 36 ? 'text-[1.45rem]' : 'text-[1.6rem]'

  const finish = () => {
    setState((st) => {
      const id = chunkCardId(chunk.id)
      const card = st.cards[id]
      if (!card) return st
      const today = isoDay(new Date())
      const encoded = { ...card, encodedOn: card.encodedOn ?? today, acquisitionCleanCount: clean }
      return {
        ...st,
        cards: { ...st.cards, [id]: applyVerdict({ ...encoded, tier: 'recent' }, 'clean') },
        reviews: [
          ...st.reviews,
          {
            id: crypto.randomUUID(),
            cardId: id,
            at: new Date().toISOString(),
            mode: 'encode' as const,
            grade: 3 as const,
            accuracy: null,
            errors: [],
          },
        ],
      }
    })
    navigate('/')
  }

  const ScriptureLines = ({ weighted }: { weighted: boolean }) => (
    <div className={`scripture ${size}`}>
      {chunk.lines.map((line, i) => (
        <div
          key={i}
          className="mb-2"
          // ACQ-5: on each re-read the middle lines are visually weighted.
          style={weighted ? { opacity: emphasis(i) } : undefined}
        >
          {line}
        </div>
      ))}
    </div>
  )

  const Ref = () => (
    <div className="label mb-4">
      {/* CHK-2: the compound cue — verse number, opening clause, structural landmark. */}
      {speakVerseNumbers && <span className="text-neutral-400">{chunk.ref}</span>}
      <span className="mx-2 text-neutral-700">·</span>
      {chunk.landmark}
    </div>
  )

  // ── ACQ-1: cue only. The attempt happens before any reveal, and is never scored. ──
  if (phase === 'guess') {
    return (
      <Shell title="Encode" back="/" noScroll>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col justify-center">
            <Ref />
            {previous && (
              <>
                <div className="label mb-2">Ends the chunk before</div>
                <p className="scripture text-[1.15rem] text-neutral-500 mb-8">
                  …{previous.lines[previous.lines.length - 1]}
                </p>
              </>
            )}
            <div className="label mb-2">Starts</div>
            <p className={`scripture ${size}`}>{chunk.cue}…</p>
            <p className="text-neutral-400 mt-8 leading-relaxed">
              Before you see it: say what you think comes next. Out loud, as far as you can get.
            </p>
            <p className="text-neutral-600 text-sm mt-2">Nothing here is scored.</p>
          </div>
          <div className="pb-6">
            <button className="tap-primary w-full" onClick={() => send('tried')}>
              I&apos;ve tried it
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── ACQ-2: first exposure prompts one aloud read, not a silent one. ──
  if (phase === 'aloud') {
    return (
      <Shell title="Encode" back="/" noScroll>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col justify-center">
            <Ref />
            <ScriptureLines weighted={false} />
            {aloudPromptOnFirstExposure && (
              <p className="text-neutral-300 mt-8 leading-relaxed font-semibold">Read it aloud. Once.</p>
            )}
            <p className="text-neutral-600 text-sm mt-1">Out loud, not in your head. Once is enough.</p>
          </div>
          <div className="pb-6">
            <button className="tap-primary w-full" onClick={() => send('read-aloud')}>
              Read it
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── ACQ-3: overt recall. A clean attempt advances without re-showing the text. ──
  if (phase === 'recall') {
    return (
      <Shell title="Encode" back="/" noScroll>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col justify-center">
            <Ref />
            <div className="label mb-2">From memory</div>
            <p className={`scripture ${size}`}>{chunk.cue}…</p>
            <p className="text-neutral-400 mt-8 leading-relaxed">Recite the whole chunk aloud.</p>
            <div className="flex gap-1.5 mt-8" aria-label={`${clean} of ${cleanRecitationsToStop} clean`}>
              {Array.from({ length: cleanRecitationsToStop }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < clean ? 'bg-neutral-200' : 'bg-ink-800'}`}
                />
              ))}
            </div>
          </div>
          <div className="pb-6 space-y-3">
            <button className="tap-primary w-full" onClick={() => send('clean')}>
              Clean
            </button>
            <button className="tap-secondary w-full" onClick={() => send('stumbled')}>
              I stumbled
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── ACQ-3 feedback (miss only) + ACQ-6 meaning, which is post-retrieval by construction. ──
  if (phase === 'feedback') {
    return (
      <Shell title="Encode" back="/" noScroll>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            <Ref />
            <ScriptureLines weighted />
            {/* ACQ-6: bounded to two lines, and unreachable until an attempt has happened. */}
            {showsMeaning(acq) && (
              <div className="mt-6 border-t border-ink-700 pt-4 space-y-2">
                <p className="text-sm text-neutral-400 leading-snug">{chunk.speechAct}</p>
                <p className="text-sm text-neutral-500 leading-snug">{chunk.seamNote}</p>
              </div>
            )}
          </div>
          <div className="pb-6">
            <button
              className="tap-primary w-full"
              onClick={() => send('continue')}
            >
              {extra.length ? 'Drill the middle' : 'Try again'}
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── ACQ-5: the extra rehearsal turn the middle lines have earned. ──
  if (phase === 'extra') {
    return (
      <Shell title="Encode" back="/" noScroll>
        <div className="h-full flex flex-col">
          <div className="flex-1 flex flex-col justify-center">
            <div className="label mb-4">The part that slips</div>
            <div className={`scripture ${size}`}>
              {extra.map((i) => (
                <div key={i} className="mb-2">
                  {chunk.lines[i]}
                </div>
              ))}
            </div>
            <p className="text-neutral-500 text-sm mt-8">
              Say these twice, then take the chunk from the top.
            </p>
          </div>
          <div className="pb-6">
            <button className="tap-primary w-full" onClick={() => send('continue')}>
              Back to the whole chunk
            </button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── ACQ-4: criterion reached. The session is over and there is nothing to press. ──
  return (
    <Shell title="Encode" back="/" noScroll>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col justify-center">
          <Ref />
          <p className="font-scripture text-3xl leading-snug">
            {cleanRecitationsToStop} clean. This chunk is done for today.
          </p>
          <p className="text-neutral-400 mt-6 leading-relaxed">
            More repetition now buys nothing. The next retrieval is what matters, and it is
            already scheduled.
          </p>
          {/* No "one more time" affordance, by design (ACQ-4). */}
        </div>
        <div className="pb-6">
          <button className="tap-primary w-full" onClick={finish}>
            Finish
          </button>
        </div>
      </div>
    </Shell>
  )
}
