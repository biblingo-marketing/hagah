import { Shell } from '../components/Shell'
import { exportJson, resetAll, setState, useStore } from '../storage/store'
import { tunables } from '../engine/params'
import { translation, program } from '../content/content'
import { setRate, speak, resolveVoice } from '../audio/voice'
import { navigate } from '../nav'

/**
 * Only the tunables protocol.md §10 marks per-user are exposed. The rest are fixed
 * for everyone and changing them is a protocol change, not a setting.
 */
const PER_USER = Object.entries(tunables).filter(([, t]) => t.perUser)

export function Settings() {
  const s = useStore()

  return (
    <Shell title="Settings" back="/">
      <div className="space-y-8 mt-4 pb-10">
        <section>
          <div className="label mb-3">Audio</div>
          <div className="rounded-2xl bg-ink-900 border border-ink-700 p-4">
            <div className="text-sm text-neutral-300 mb-3">Reading speed</div>
            <div className="flex gap-2 flex-wrap">
              {[0.7, 0.8, 0.85, 0.9, 1.0].map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`min-h-[3rem] px-4 rounded-xl text-sm font-semibold ${
                    Math.abs(s.voice.rate - r) < 0.001
                      ? 'bg-neutral-100 text-ink-950'
                      : 'bg-ink-800 text-neutral-400'
                  }`}
                >
                  {r.toFixed(2)}×
                </button>
              ))}
            </div>
            <button
              className="tap-secondary w-full mt-4"
              onClick={async () => {
                await resolveVoice()
                void speak('The righteous will live by faith.')
              }}
            >
              Hear it
            </button>
            <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
              One voice is pinned per program and not swapped mid-way. Browser speech
              synthesis is a placeholder for real recorded audio.
            </p>
          </div>
        </section>

        <section>
          <div className="label mb-3">Tuning</div>
          <div className="rounded-2xl bg-ink-900 border border-ink-700 p-4 space-y-4">
            {PER_USER.map(([key, t]) => {
              const current = (s.overrides[key] ?? t.default) as number | boolean
              if (typeof t.default === 'boolean') {
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-300">{LABELS[key] ?? key}</span>
                    <button
                      onClick={() =>
                        setState((st) => ({ ...st, overrides: { ...st.overrides, [key]: !current } }))
                      }
                      className={`min-h-[2.75rem] px-5 rounded-xl text-sm font-semibold ${
                        current ? 'bg-neutral-100 text-ink-950' : 'bg-ink-800 text-neutral-400'
                      }`}
                    >
                      {current ? 'On' : 'Off'}
                    </button>
                  </div>
                )
              }
              const min = 'min' in t ? (t.min as number) : 0
              const max = 'max' in t ? (t.max as number) : 1
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-neutral-300">{LABELS[key] ?? key}</span>
                    <span className="text-sm text-neutral-500 tabular-nums">{String(current)}</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={(max - min) / 20}
                    value={current as number}
                    onChange={(e) =>
                      setState((st) => ({
                        ...st,
                        overrides: { ...st.overrides, [key]: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-neutral-200 h-10"
                  />
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="label mb-3">Your data</div>
          <div className="space-y-3">
            <button
              className="tap-secondary w-full"
              onClick={() => {
                const blob = new Blob([exportJson()], { type: 'application/json' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `hagah-${program.id}-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
                URL.revokeObjectURL(a.href)
              }}
            >
              Export everything
            </button>
            <button
              className="tap-secondary w-full text-stability-fragile"
              onClick={() => {
                if (confirm('Erase all practice history on this device? This cannot be undone.')) {
                  resetAll()
                  navigate('/')
                }
              }}
            >
              Erase and start over
            </button>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Everything lives in this browser on this device. There is no account and no
              server, so nothing leaves the phone and nothing syncs.
            </p>
          </div>
        </section>

        <section>
          <div className="label mb-3">Text</div>
          <p className="text-xs text-neutral-500 leading-relaxed">{translation.attribution}</p>
        </section>
      </div>
    </Shell>
  )
}

const LABELS: Record<string, string> = {
  runEligibilityAccuracy: 'Accuracy needed to join the run',
  pausePerWord: 'Seconds of silence per word',
  maxNewChunksPerScreenDay: 'New chunks a screen day',
  playAnswerOnSuccess: 'Play the answer even when you got it',
  speakVerseNumbers: 'Speak verse numbers',
}
