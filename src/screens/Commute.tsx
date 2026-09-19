import { useEffect, useRef, useState } from 'react'
import { Shell } from '../components/Shell'
import { chunkById, seamById } from '../content/content'
import { setState, useStore } from '../storage/store'
import { applyVerdict, isoDay } from '../engine/scheduler'
import { commuteOrder } from '../engine/planner'
import { playAnswerOnSuccess, speakVerseNumbers } from '../engine/params'
import { speak, cancelSpeech, silenceMsFor, spokenRef, resolveVoice, supportsSpeech } from '../audio/voice'
import { navigate } from '../nav'

type Phase = 'notice' | 'ready' | 'cue' | 'silence' | 'answer' | 'done'

/**
 * AUD-1: the loop is anticipate-then-check — cue, silence, you recite, then the chunk
 * plays. Simultaneous shadowing is never the mechanic here: concurrent articulation
 * occupies the phonological loop that subvocal retrieval needs, so it is restudy
 * wearing the costume of practice.
 *
 * SAFE-1: no screen interaction is required. The loop advances itself; the two
 * targets are accelerators, not gates, and passive listening is one tap away.
 */
export function Commute() {
  const s = useStore()
  const today = isoDay(new Date())
  const [queue] = useState(() => commuteOrder(s, today))
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<Phase>(() =>
    localStorage.getItem('hagah.commute.notice') ? 'ready' : 'notice',
  )
  /** The loop runs on `active`, not on `phase` — phase is what the screen shows. */
  const [active, setActive] = useState(false)
  const [passive, setPassive] = useState(false)
  const gotIt = useRef(false)
  const skip = useRef<(() => void) | null>(null)

  const cardId = queue[i]
  const card = cardId ? s.cards[cardId] : undefined
  const chunk = card?.kind === 'chunk' ? chunkById.get(card.refId) : undefined
  const seam = card?.kind === 'seam' ? seamById.get(card.refId) : undefined

  const ref = chunk?.ref ?? (seam ? `${chunkById.get(seam.fromId)?.ref} → ${chunkById.get(seam.toId)?.ref}` : '')
  const cueText = chunk ? chunk.cue : seam ? seam.cue : ''
  const answerText = chunk ? chunk.text : seam ? seam.answer : ''

  useEffect(() => {
    void resolveVoice()
  }, [])

  useEffect(() => {
    if (!active) return
    if (!cardId) {
      setPhase('done')
      setActive(false)
      return
    }
    let cancelled = false
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms)
        skip.current = () => {
          clearTimeout(t)
          resolve()
        }
      })

    void (async () => {
      // Cue: the compound cue of CHK-2 — spoken reference, then the opening clause.
      setPhase('cue')
      if (speakVerseNumbers && ref) await speak(spokenRef(ref))
      if (cancelled) return
      await speak(cueText)
      if (cancelled) return

      if (!passive) {
        // AUD-3: silence scales with chunk length, at pausePerWord seconds a word.
        setPhase('silence')
        await delay(silenceMsFor(answerText))
        if (cancelled) return
      }

      // AUD-2: on a self-reported success the answer audio is skipped by default.
      if (passive || playAnswerOnSuccess || !gotIt.current) {
        setPhase('answer')
        await speak(answerText)
        if (cancelled) return
      }

      gotIt.current = false
      skip.current = null
      setI((x) => x + 1)
    })()

    return () => {
      cancelled = true
      skip.current = null
      cancelSpeech()
    }
  }, [i, active, passive, cardId, answerText, cueText, ref])

  const grade = (verdict: 'clean' | 'again') => {
    if (!cardId) return
    gotIt.current = verdict === 'clean'
    setState((st) => {
      const c = st.cards[cardId]
      if (!c) return st
      const repair = new Set(st.repairQueue)
      if (verdict === 'clean') repair.delete(cardId)
      else repair.add(cardId)
      return {
        ...st,
        cards: { ...st.cards, [cardId]: applyVerdict(c, verdict) },
        repairQueue: [...repair],
        reviews: [
          ...st.reviews,
          {
            id: crypto.randomUUID(),
            cardId,
            at: new Date().toISOString(),
            mode: 'commute' as const,
            grade: verdict === 'clean' ? (3 as const) : (1 as const),
            accuracy: null,
            errors: [],
          },
        ],
      }
    })
    // AUD-2: a success jumps the answer and moves on. A miss lets the answer play.
    if (verdict === 'clean' && !playAnswerOnSuccess) skip.current?.()
    else skip.current?.()
  }

  const stop = () => {
    setActive(false)
    cancelSpeech()
    navigate('/')
  }

  // ── SAFE-1: brief safety notice on first use. ──
  if (phase === 'notice') {
    return (
      <Shell title="Commute" back="/">
        <div className="mt-8 space-y-5">
          <p className="scripture text-[1.4rem] leading-snug">
            Reciting while driving is a real cognitive load, not a free one.
          </p>
          <p className="text-neutral-400 leading-relaxed">
            Hands-free is not the same as attention-free. Generating text from memory takes
            more of you than listening does. Nothing here needs the screen — if a stretch of
            road needs you, stop reciting and let it play.
          </p>
          <button
            className="tap-secondary w-full"
            onClick={() => {
              setPassive(true)
              localStorage.setItem('hagah.commute.notice', '1')
              setActive(true)
            }}
          >
            Just play it to me
          </button>
        </div>
        <div className="mt-8 pb-10">
          <button
            className="tap-primary w-full"
            onClick={() => {
              localStorage.setItem('hagah.commute.notice', '1')
              setPhase('ready')
            }}
          >
            Understood
          </button>
        </div>
      </Shell>
    )
  }

  if (phase === 'ready') {
    return (
      <Shell title="Commute" back="/">
        <div className="mt-8">
          <p className="scripture text-[1.5rem] leading-snug mb-4">
            {queue.length} to work through.
          </p>
          <p className="text-neutral-400 leading-relaxed">
            The cue plays, then there is silence the length of the chunk. Recite into the
            silence. Then you hear it. Nothing needs tapping.
          </p>
          {!supportsSpeech() && (
            <p className="text-stability-fragile text-sm mt-4">
              This browser has no speech synthesis, so there is no audio to play.
            </p>
          )}
        </div>
        <div className="mt-10 space-y-3 pb-10">
          <button className="tap-huge tap-primary w-full" onClick={() => setActive(true)}>
            Start
          </button>
          {/* SAFE-1: passive listening is one tap away. */}
          <button
            className="tap-secondary w-full"
            onClick={() => {
              setPassive(true)
              setActive(true)
            }}
          >
            Passive listening only
          </button>
        </div>
      </Shell>
    )
  }

  if (phase === 'done' || !card) {
    return (
      <Shell title="Commute" back="/">
        <p className="scripture text-[1.5rem] mt-10">That is the whole queue.</p>
        <button className="tap-huge tap-primary w-full mt-10" onClick={stop}>
          Done
        </button>
      </Shell>
    )
  }

  const phaseLabel =
    phase === 'cue' ? 'listen' : phase === 'silence' ? 'your turn' : passive ? 'playing' : 'check'

  // ── The running loop. Everything here is enormous and nothing is required. ──
  return (
    <div
      className="h-[100dvh] flex flex-col bg-ink-950"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-5 py-3">
        <button onClick={stop} className="min-h-[3rem] px-4 -ml-3 text-neutral-500 text-base">
          Stop
        </button>
        <span className="label">
          {i + 1} / {queue.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="label mb-5">{phaseLabel}</div>
        <div className="font-scripture text-[4.5rem] leading-none tracking-tight">{ref}</div>
        <div
          className={`mt-8 h-2 w-40 rounded-full ${
            phase === 'silence' ? 'bg-stability-working' : 'bg-ink-800'
          }`}
        />
      </div>

      {/* SAFE-1: huge targets, and neither is required for the loop to advance. */}
      {!passive ? (
        <div className="grid grid-cols-2 gap-3 px-4 pb-5">
          <button
            className="tap-huge bg-ink-800 border border-ink-700 text-neutral-100 min-h-[8rem]"
            onClick={() => grade('again')}
          >
            Missed
          </button>
          <button
            className="tap-huge bg-neutral-100 text-ink-950 min-h-[8rem]"
            onClick={() => grade('clean')}
          >
            Got it
          </button>
        </div>
      ) : (
        <div className="px-4 pb-5">
          <button className="tap-huge tap-secondary w-full min-h-[6rem]" onClick={() => setPassive(false)}>
            Switch to anticipate-then-check
          </button>
        </div>
      )}
    </div>
  )
}
