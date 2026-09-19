import { useState } from 'react'
import { Shell } from '../components/Shell'
import { getState, setState, useStore } from '../storage/store'
import type { Block, BlockKind } from '../storage/types'
import { hasNonScreenBlock, hasScreenBlock } from '../engine/planner'
import { ensureCards, isoDay } from '../engine/scheduler'
import { navigate } from '../nav'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const KIND_COPY: Record<BlockKind, { title: string; help: string }> = {
  screen: { title: 'Screen', help: 'Eyes and hands free, phone in hand. New material is introduced only here.' },
  audio: { title: 'Audio, hands-free', help: 'Driving, dishes, treadmill. Cue plays, you recite, the text answers.' },
  recall: { title: 'Recall, no device', help: 'Running, walking, showering. You read a card first, recite from memory, grade after.' },
}

function newBlock(): Block {
  return { id: crypto.randomUUID(), label: '', minutes: 15, days: [1, 2, 3, 4, 5], kind: 'screen' }
}

export function Blocks() {
  const s = useStore()
  const [drafts, setDrafts] = useState<Block[]>(() => (s.blocks.length ? s.blocks : [newBlock()]))

  const update = (id: string, patch: Partial<Block>) =>
    setDrafts((d) => d.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const toggleDay = (id: string, day: number) =>
    setDrafts((d) =>
      d.map((b) =>
        b.id === id
          ? { ...b, days: b.days.includes(day) ? b.days.filter((x) => x !== day) : [...b.days, day].sort() }
          : b,
      ),
    )

  const valid = drafts.filter((b) => b.days.length > 0 && b.minutes > 0)
  const screenOk = hasScreenBlock(valid)
  // PLAN-4: the app requires you to *consider* a non-screen block. It does not enforce one —
  // this is the product bet, so it is instrumented, not forced.
  const nonScreenOk = hasNonScreenBlock(valid)

  const save = () => {
    setState((st) => ({
      ...st,
      blocks: valid.map((b) => ({ ...b, label: b.label.trim() || KIND_COPY[b.kind].title })),
      onboarded: true,
      programStart: st.programStart ?? isoDay(new Date()),
      cards: ensureCards({ ...st, blocks: valid }),
    }))
    navigate('/plan')
  }

  return (
    <Shell title="Your week" back="/">
      <p className="text-sm text-neutral-400 leading-relaxed mb-6 max-w-prose">
        Tell the planner the time you actually have. For each block: how long, which days,
        and whether you will have a screen, only your ears, or no device at all.
      </p>

      <div className="space-y-5 pb-4">
        {drafts.map((b) => (
          <div key={b.id} className="rounded-2xl bg-ink-900 border border-ink-700 p-4 space-y-4">
            <input
              value={b.label}
              onChange={(e) => update(b.id, { label: e.target.value })}
              placeholder="Name it — “morning coffee”, “drive in”"
              className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-neutral-600"
            />

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(KIND_COPY) as BlockKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => update(b.id, { kind: k })}
                  className={`min-h-[3.5rem] rounded-xl text-sm font-semibold px-2 ${
                    b.kind === k ? 'bg-neutral-100 text-ink-950' : 'bg-ink-800 text-neutral-300 border border-ink-700'
                  }`}
                >
                  {KIND_COPY[k].title}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 leading-snug -mt-2">{KIND_COPY[b.kind].help}</p>

            <div>
              <div className="label mb-2">Days</div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(b.id, i)}
                    aria-label={DAY_NAMES[i]}
                    aria-pressed={b.days.includes(i)}
                    className={`h-12 rounded-xl text-sm font-bold ${
                      b.days.includes(i) ? 'bg-neutral-100 text-ink-950' : 'bg-ink-800 text-neutral-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="label mb-2">How long</div>
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 15, 20, 30, 40, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => update(b.id, { minutes: m })}
                    className={`min-h-[3rem] px-4 rounded-xl text-sm font-semibold ${
                      b.minutes === m ? 'bg-neutral-100 text-ink-950' : 'bg-ink-800 text-neutral-400'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {drafts.length > 1 && (
              <button
                onClick={() => setDrafts((d) => d.filter((x) => x.id !== b.id))}
                className="text-sm text-neutral-500 underline underline-offset-4"
              >
                Remove this block
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="tap-secondary w-full mb-6" onClick={() => setDrafts((d) => [...d, newBlock()])}>
        + Add another block
      </button>

      {!screenOk && (
        <p className="text-sm text-stability-fragile mb-4 leading-snug">
          You need at least one screen block. New material can only be introduced there —
          learning a chunk for the first time while driving does not work.
        </p>
      )}

      {/* PLAN-4: proceeding with no non-screen block shows what you lose, and lets you proceed. */}
      {screenOk && !nonScreenOk && (
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4 mb-4">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Every block you have is a screen block. That caps you at the time you can sit still
            with a phone. The commute and the run are where review time actually exists — without
            one, each chunk gets a single touch a day instead of three or four, and the passage
            takes proportionally longer to hold.
          </p>
          <p className="text-sm text-neutral-500 mt-2">You can start this way and add one later.</p>
        </div>
      )}

      <button className="tap-primary w-full mb-10" disabled={!screenOk} onClick={save}>
        {getState().blocks.length ? 'Save and re-plan' : 'Build my plan'}
      </button>
    </Shell>
  )
}
