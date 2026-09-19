import { useEffect, useRef, useState } from 'react'
import { Shell } from '../components/Shell'
import { DiffView, DiffLegend } from '../components/Diff'
import { chunkById, chunks, seamById } from '../content/content'
import { setState, useStore } from '../storage/store'
import { applyVerdict, isoDay, chunkCardId } from '../engine/scheduler'
import { screenReviewOrder } from '../engine/planner'
import { score, missSummary, errorClassLabel } from '../engine/diff'
import type { Score } from '../engine/diff'
import * as rec from '../audio/recognition'
import { navigate } from '../nav'
import { speakVerseNumbers } from '../engine/params'

type Stage = 'prompt' | 'speaking' | 'typing' | 'result'

export function RecallCheck() {
  const s = useStore()
  const today = isoDay(new Date())
  const queue = screenReviewOrder(s, today)
  const [i, setI] = useState(0)
  const [stage, setStage] = useState<Stage>('prompt')
  const [heard, setHeard] = useState('')
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<Score | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const listener = useRef<rec.Listener | null>(null)

  const cardId = queue[i]
  const card = cardId ? s.cards[cardId] : undefined
  const chunk = card?.kind === 'chunk' ? chunkById.get(card.refId) : undefined
  const seam = card?.kind === 'seam' ? seamById.get(card.refId) : undefined

  const lines = chunk ? chunk.lines : seam ? [seam.answer] : []
  const cue = chunk ? chunk.cue : seam ? seam.cue : ''
  const label = chunk ? chunk.ref : seam ? 'Seam' : ''

  useEffect(() => () => listener.current?.stop(), [])

  if (!queue.length || !card) {
    return (
      <Shell title="Recall check" back="/">
        <p className="text-neutral-400 mt-6">Nothing to check right now.</p>
        <button className="tap-primary w-full mt-6" onClick={() => navigate('/')}>
          Back
        </button>
      </Shell>
    )
  }

  const startSpeaking = () => {
    setMicError(null)
    setHeard('')
    setStage('speaking')
    const l = rec.listen(
      (text) => setHeard(text),
      (why) => {
        setMicError(why)
        // DIFF-4: recognition failing never blocks the check — fall straight to typing.
        setStage('typing')
      },
    )
    if (!l) {
      setMicError('unsupported')
      setStage('typing')
      return
    }
    listener.current = l
  }

  const finishAttempt = (text: string) => {
    listener.current?.stop()
    listener.current = null
    setResult(score(lines, text, chunk?.id))
    setStage('result')
  }

  const commit = (verdict: 'again' | 'hesitant' | 'clean') => {
    const acc = result?.clauseAccuracy ?? null
    setState((st) => {
      const c = st.cards[cardId]
      if (!c) return st
      const updated = applyVerdict({ ...c, lastAccuracy: acc }, verdict)
      return {
        ...st,
        cards: { ...st.cards, [cardId]: updated },
        reviews: [
          ...st.reviews,
          {
            id: crypto.randomUUID(),
            cardId,
            at: new Date().toISOString(),
            mode: 'recall' as const,
            grade: verdict === 'again' ? (1 as const) : verdict === 'hesitant' ? (2 as const) : (3 as const),
            accuracy: acc,
            // DIFF-1: the classified misses are the point of the log.
            errors: result?.misses ?? [],
            drift: result?.drift,
          },
        ],
      }
    })
    setResult(null)
    setHeard('')
    setTyped('')
    setStage('prompt')
    if (i + 1 < queue.length) setI(i + 1)
    else navigate('/')
  }

  const progress = `${i + 1} of ${queue.length}`

  if (stage === 'prompt') {
    return (
      <Shell title={`Recall check · ${progress}`} back="/">
        <div className="mt-8">
          <div className="label mb-3">
            {speakVerseNumbers && <span className="text-neutral-400">{label}</span>}
            {chunk && <><span className="mx-2 text-neutral-700">·</span>{chunk.landmark}</>}
          </div>
          <div className="label mb-2">Cue</div>
          <p className="scripture text-[1.5rem] mb-10">{cue}…</p>
          <p className="text-neutral-400 leading-relaxed">
            Recite it aloud, all the way through. Then it gets scored against the text.
          </p>
        </div>
        <div className="mt-10 space-y-3 pb-10">
          {rec.supported() && (
            <button className="tap-primary w-full" onClick={startSpeaking}>
              Recite aloud
            </button>
          )}
          {/* DIFF-4: the typed path is always present, not a fallback you have to find. */}
          <button className="tap-secondary w-full" onClick={() => setStage('typing')}>
            Type it instead
          </button>
        </div>
      </Shell>
    )
  }

  if (stage === 'speaking') {
    return (
      <Shell title={`Recall check · ${progress}`} back="/">
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-3 h-3 rounded-full bg-stability-fragile" />
            <span className="label">listening</span>
          </div>
          <p className="scripture text-[1.3rem] text-neutral-400 min-h-[8rem] leading-relaxed">
            {heard || <span className="text-neutral-700">…</span>}
          </p>
        </div>
        <div className="mt-10 space-y-3 pb-10">
          <button className="tap-primary w-full" onClick={() => finishAttempt(heard)}>
            Done reciting
          </button>
          <button
            className="tap-secondary w-full"
            onClick={() => {
              listener.current?.stop()
              listener.current = null
              setTyped(heard)
              setStage('typing')
            }}
          >
            Type it instead
          </button>
        </div>
      </Shell>
    )
  }

  if (stage === 'typing') {
    return (
      <Shell title={`Recall check · ${progress}`} back="/">
        <div className="mt-6">
          <div className="label mb-2">Cue</div>
          <p className="scripture text-[1.25rem] mb-5">{cue}…</p>
          {micError && (
            <p className="text-xs text-neutral-500 mb-3">
              {micError === 'unsupported'
                ? 'This browser has no speech recognition. Typing works everywhere.'
                : `Microphone unavailable (${micError}). Typing works everywhere.`}
            </p>
          )}
          <textarea
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            rows={8}
            className="w-full bg-ink-900 border border-ink-700 rounded-2xl p-4 scripture text-[1.15rem]
                       outline-none focus:border-neutral-500 resize-none"
            placeholder="Type it from memory…"
          />
        </div>
        <div className="mt-6 pb-10">
          <button className="tap-primary w-full" disabled={!typed.trim()} onClick={() => finishAttempt(typed)}>
            Score it
          </button>
        </div>
      </Shell>
    )
  }

  // ── Result ──
  const r = result!
  const pct = Math.round(r.clauseAccuracy * 100)
  return (
    <Shell title={`Recall check · ${progress}`} back="/">
      <div className="mt-4">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="font-scripture text-4xl">{pct}%</span>
          <span className="label">of clauses exact</span>
        </div>

        {/* DIFF-3: a fluent paraphrase is a miss and is named as one. */}
        {r.drift && (
          <div className="rounded-2xl border border-stability-working/40 bg-stability-working/10 p-4 mb-5">
            <p className="text-sm text-stability-working font-semibold mb-1">Drifting toward paraphrase</p>
            <p className="text-sm text-neutral-300 leading-snug">
              The sense was right and the words were not. That reads as fluent, which is why
              it does not count as a pass.
            </p>
          </div>
        )}

        <DiffView ops={r.ops} />
        <DiffLegend />

        {r.misses.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {missSummary(r.misses).map((m) => (
              <li key={m.klass} className="text-xs bg-ink-800 border border-ink-700 rounded-full px-3 py-1.5 text-neutral-400">
                {m.n} {errorClassLabel[m.klass]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 space-y-3 pb-10">
        <div className="label">How did that feel?</div>
        <button className="tap-primary w-full" onClick={() => commit('clean')} disabled={r.drift}>
          Clean
        </button>
        <button className="tap-secondary w-full" onClick={() => commit('hesitant')}>
          Had to hunt for it
        </button>
        <button className="tap-secondary w-full" onClick={() => commit('again')}>
          Lost it
        </button>
        {r.drift && (
          <p className="text-xs text-neutral-500">
            Marked as drift, so “clean” is not available on this one.
          </p>
        )}
      </div>
    </Shell>
  )
}

export const totalChunks = chunks.length
export const cardChunkId = chunkCardId
