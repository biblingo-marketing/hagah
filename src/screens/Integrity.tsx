import { useState } from 'react'
import { Shell } from '../components/Shell'
import { chunkById } from '../content/content'
import { setState, useStore } from '../storage/store'
import { applyVerdict, isoDay } from '../engine/scheduler'
import { encodedCards, integrityDue } from '../engine/planner'
import { integrityDays } from '../engine/params'
import { navigate } from '../nav'

type Verdict = 'clean' | 'hesitant' | 'again'

/**
 * SCH-3: the whole-passage integrity run, on the fixed expanding schedule
 * (14 / 28 / 56 / 90 days), deliberately not on FSRS. Maintenance is required
 * indefinitely — nothing in the evidence supports a passage "staying" unmaintained,
 * and section boundaries persist while interiors decay.
 *
 * Like the run card, it shows no text (RUN-1). It is a recitation, not a reading.
 */
export function Integrity() {
  const s = useStore()
  const today = isoDay(new Date())
  const milestone = integrityDue(s, today) ?? integrityDays[0]
  const items = encodedCards(s)
    .filter((c) => c.kind === 'chunk')
    .sort((a, b) => (a.encodedOn ?? '').localeCompare(b.encodedOn ?? ''))
  const [grading, setGrading] = useState(false)
  const [marks, setMarks] = useState<Record<string, Verdict>>({})
  const done = items.every((c) => marks[c.id])

  const submit = () => {
    setState((st) => {
      const cards = { ...st.cards }
      const reviews = [...st.reviews]
      const repair = new Set(st.repairQueue)
      for (const c of items) {
        const v = marks[c.id]
        if (!v) continue
        cards[c.id] = applyVerdict(cards[c.id], v)
        reviews.push({
          id: crypto.randomUUID(),
          cardId: c.id,
          at: new Date().toISOString(),
          mode: 'integrity' as const,
          grade: v === 'again' ? (1 as const) : v === 'hesitant' ? (2 as const) : (3 as const),
          accuracy: null,
          errors: [],
          hesitated: v === 'hesitant',
        })
        if (v !== 'clean') repair.add(c.id)
      }
      return {
        ...st,
        cards,
        reviews,
        repairQueue: [...repair],
        integrityDone: [...new Set([...st.integrityDone, milestone])],
      }
    })
    navigate('/')
  }

  if (grading) {
    return (
      <Shell title="How did it hold?" back="/">
        <ul className="space-y-4 pb-6 mt-4">
          {items.map((c) => {
            const chunk = chunkById.get(c.refId)
            return (
              <li key={c.id}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-ui font-semibold text-neutral-200">{chunk?.ref}</span>
                  <span className="text-xs text-neutral-600">{chunk?.landmark}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['clean', 'hesitant', 'again'] as Verdict[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setMarks((m) => ({ ...m, [c.id]: v }))}
                      className={`min-h-[3.5rem] rounded-xl text-sm font-semibold px-1 ${
                        marks[c.id] === v
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

  return (
    <Shell title={`Whole passage · day ${milestone}`} back="/">
      <p className="text-sm text-neutral-400 mb-6 mt-2 leading-relaxed">
        Everything you have, start to finish, in order, from memory. No text. This runs on
        its own schedule rather than card by card, because a passage holds together or it
        does not.
      </p>
      <ol className="space-y-1 mb-8">
        {items.map((c, n) => {
          const chunk = chunkById.get(c.refId)
          return (
            <li key={c.id} className="flex items-baseline gap-3 py-2.5 border-b border-ink-800">
              <span className="font-ui text-xs text-neutral-600 tabular-nums w-5 shrink-0">{n + 1}</span>
              <div>
                <div className="font-scripture text-2xl leading-tight">{chunk?.ref}</div>
                <div className="text-xs text-neutral-500 mt-0.5">{chunk?.landmark}</div>
              </div>
            </li>
          )
        })}
      </ol>
      <button className="tap-primary w-full mb-10" onClick={() => setGrading(true)}>
        Grade it
      </button>
    </Shell>
  )
}
