import { useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { chunkById, seamById } from '../content/content'
import { setState, useStore } from '../storage/store'
import { applyVerdict, isoDay } from '../engine/scheduler'
import { runOrder } from '../engine/planner'
import { seamsPassMinutes } from '../engine/params'
import { resolve } from '../engine/settings'
import { navigate } from '../nav'

type Verdict = 'clean' | 'hesitant' | 'again'

/**
 * RUN-1: the run card is read-only. No text is shown, no interaction is expected
 * during the block, and grading happens afterwards. Showing the text would convert
 * free recall into restudy, which is the whole thing this mode exists to avoid —
 * so the card carries references and landmarks (CHK-6's content-addressable
 * hierarchy) and nothing you could read off.
 */
export function RunCard() {
  const s = useStore()
  const today = isoDay(new Date())
  const order = useMemo(() => runOrder(s, today), [s, today])
  const threshold = resolve(s, 'runEligibilityAccuracy')
  const [grading, setGrading] = useState(false)
  const [marks, setMarks] = useState<Record<string, Verdict>>({})

  // RUN-3 order: newest first, then consolidated, then fragile, then seams, then newest again.
  // The list is de-duplicated for display but keeps the repeat of the newest unit at the end,
  // which is the point — it gives the newest material two spaced retrievals in one session.
  const items = order.cardIds
  const seamItems = order.seamIds

  if (!items.length) {
    return (
      <Shell title="Run card" back="/">
        <p className="text-neutral-400 mt-6 leading-relaxed">
          Nothing is ready for a run yet. Material joins the run only once it recites at{' '}
          {Math.round(threshold * 100)}% clause accuracy or better — below that,
          free recall mostly fails, and a failed attempt without feedback teaches nothing.
        </p>
        <button className="tap-primary w-full mt-8" onClick={() => navigate('/')}>
          Back
        </button>
      </Shell>
    )
  }

  const labelFor = (cardId: string) => {
    const card = s.cards[cardId]
    if (!card) return { ref: '?', landmark: '' }
    if (card.kind === 'seam') {
      const seam = seamById.get(card.refId)
      const from = seam && chunkById.get(seam.fromId)
      const to = seam && chunkById.get(seam.toId)
      return { ref: `${from?.ref ?? ''} → ${to?.ref ?? ''}`, landmark: 'seam' }
    }
    const chunk = chunkById.get(card.refId)
    return { ref: chunk?.ref ?? '?', landmark: chunk?.landmark ?? '' }
  }

  // ── Grading, afterwards (RUN-1, RUN-4) ──
  if (grading) {
    const unique = [...new Set([...items, ...seamItems])]
    const done = unique.every((id) => marks[id])

    const submit = () => {
      setState((st) => {
        const cards = { ...st.cards }
        const reviews = [...st.reviews]
        const repair = new Set(st.repairQueue)
        for (const id of unique) {
          const v = marks[id]
          const card = cards[id]
          if (!v || !card) continue
          cards[id] = applyVerdict(card, v)
          reviews.push({
            id: crypto.randomUUID(),
            cardId: id,
            at: new Date().toISOString(),
            mode: 'run' as const,
            grade: v === 'again' ? (1 as const) : v === 'hesitant' ? (2 as const) : (3 as const),
            accuracy: null,
            errors: [],
            // RUN-4: hesitations are captured, not collapsed into pass/fail.
            hesitated: v === 'hesitant',
          })
          // RUN-4: anything flagged enters the next audio session's repair queue.
          if (v === 'hesitant' || v === 'again') repair.add(id)
          else repair.delete(id)
        }
        return { ...st, cards, reviews, repairQueue: [...repair] }
      })
      navigate('/')
    }

    return (
      <Shell title="How did the run go?" back="/">
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          Hesitations matter as much as failures. A chunk you got to eventually is a chunk
          that will go next week — mark it, and it goes into the next commute.
        </p>
        <ul className="space-y-4 pb-6">
          {unique.map((id) => {
            const { ref, landmark } = labelFor(id)
            return (
              <li key={id}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-ui font-semibold text-neutral-200">{ref}</span>
                  <span className="text-xs text-neutral-600">{landmark}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['clean', 'hesitant', 'again'] as Verdict[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setMarks((m) => ({ ...m, [id]: v }))}
                      className={`min-h-[3.5rem] rounded-xl text-sm font-semibold px-1 ${
                        marks[id] === v
                          ? 'bg-neutral-100 text-ink-950'
                          : 'bg-ink-800 text-neutral-400 border border-ink-700'
                      }`}
                    >
                      {v === 'clean' ? 'Clean' : v === 'hesitant' ? 'Hesitated' : 'Lost it'}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
        <button className="tap-primary w-full mb-10" disabled={!done} onClick={submit}>
          {done ? 'Save the run' : 'Mark every line'}
        </button>
      </Shell>
    )
  }

  // ── The card itself ──
  return (
    <Shell title="Run card" back="/">
      <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
        Read this before you set off. Recite in this order, from memory, out loud or
        under your breath. Grade it when you get back — not during.
      </p>

      <ol className="space-y-1 mb-8">
        {items.map((id, n) => {
          const { ref, landmark } = labelFor(id)
          const repeat = n === items.length - 1 && items.length > 1 && items[0] === id
          return (
            <li key={`${id}-${n}`} className="flex items-baseline gap-3 py-2.5 border-b border-ink-800">
              <span className="font-ui text-xs text-neutral-600 tabular-nums w-5 shrink-0">{n + 1}</span>
              <div className="min-w-0">
                <div className="font-scripture text-2xl leading-tight">{ref}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {landmark}
                  {repeat && <span className="text-neutral-400"> · again, to close</span>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* RUN-3: the seams-only pass. */}
      {seamItems.length > 0 && (
        <div className="mb-8">
          <div className="label mb-3">
            Seams only · {seamsPassMinutes} min
          </div>
          <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
            Just the joins. End of one, straight into the start of the next. Nothing in between.
          </p>
          <ul className="space-y-1">
            {seamItems.map((id) => {
              const { ref } = labelFor(id)
              return (
                <li key={id} className="font-scripture text-xl py-2 border-b border-ink-800 text-neutral-300">
                  {ref}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <button className="tap-primary w-full mb-10" onClick={() => setGrading(true)}>
        I&apos;m back — grade it
      </button>
    </Shell>
  )
}
