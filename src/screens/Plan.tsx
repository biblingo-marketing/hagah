import { Shell } from '../components/Shell'
import { useStore } from '../storage/store'
import { projectPlan, finishDate, activityLabel } from '../engine/planner'
import { isoDay } from '../engine/scheduler'
import { chunkById } from '../content/content'
import { navigate } from '../nav'

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

const KIND_DOT: Record<string, string> = {
  screen: 'bg-neutral-300',
  audio: 'bg-stability-working',
  recall: 'bg-stability-firm',
}

export function Plan() {
  const s = useStore()
  const today = isoDay(new Date())
  const plan = projectPlan(s, today)
  const finish = finishDate(plan)

  if (!s.blocks.length) {
    return (
      <Shell title="Plan" back="/">
        <p className="text-neutral-400 mb-6">No blocks yet.</p>
        <button className="tap-primary w-full" onClick={() => navigate('/blocks')}>
          Set up my week
        </button>
      </Shell>
    )
  }

  return (
    <Shell title="Plan" back="/">
      <div className="rounded-2xl bg-ink-900 border border-ink-700 p-4 mb-6">
        {finish ? (
          <>
            <div className="label mb-1">Last new chunk lands</div>
            <div className="font-scripture text-2xl">{fmt(finish)}</div>
          </>
        ) : (
          <div className="text-neutral-300">Everything is introduced. This is maintenance.</div>
        )}
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
          The plan is recomputed from where you actually are, every time you open it.
          Miss a day and it simply shifts — nothing accumulates.
        </p>
      </div>

      <ol className="space-y-4 pb-10">
        {plan.map((d) => (
          <li key={d.date} className={d.date === today ? 'rounded-2xl bg-ink-900 border border-ink-700 p-3 -mx-1' : 'px-2'}>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="font-ui text-sm font-semibold text-neutral-200">{fmt(d.date)}</span>
              {d.date === today && <span className="label">today</span>}
              {d.newChunkId && (
                <span className="label ml-auto text-neutral-400">
                  new · {chunkById.get(d.newChunkId)?.ref}
                </span>
              )}
            </div>
            <ul className="space-y-1">
              {d.entries.map((e, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${KIND_DOT[e.block.kind]}`} />
                  <div>
                    <span className="text-neutral-300">{e.block.label}</span>
                    <span className="text-neutral-600"> · {e.block.minutes} min</span>
                    <div className="text-neutral-500 text-[0.8rem] leading-snug">
                      {e.activities.map(activityLabel).join(' · ')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <button className="tap-secondary w-full mb-10" onClick={() => navigate('/blocks')}>
        Change my week
      </button>
    </Shell>
  )
}
