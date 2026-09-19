import { chunks, program, translation, seams } from '../content/content'
import { Shell } from '../components/Shell'

/**
 * Boundary review screen.
 *
 * CHK-1 says boundaries are immutable once any review references the chunk —
 * which means they have to be right *before* practice starts. CLAUDE.md:
 * "Chunk boundaries are Nick's call, not yours. Propose them, show your work."
 * This screen is the showing-your-work.
 */
export function Boundaries() {
  return (
    <Shell title={`${program.title} — chunk boundaries`} tab="text">
      <p className="text-sm text-neutral-400 leading-relaxed mb-6 max-w-prose">
        {chunks.length} chunks covering {chunks[0].ref.split('–')[0]}–
        {chunks[chunks.length - 1].ref.split('–').pop()}. Each one is a discourse unit,
        not a verse. Read the seam note under each: it is the reason that chunk follows
        the one before it, and it is what you will be cued with.
      </p>

      <ol className="space-y-8 pb-10">
        {chunks.map((c, i) => (
          <li key={c.id}>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-ui text-sm font-bold text-neutral-100 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-ui text-sm text-neutral-300">{c.ref}</span>
              <span className="label ml-auto">{c.wordCount} words · {c.lines.length} units</span>
            </div>

            <div className="rounded-2xl bg-ink-900 border border-ink-700 p-4">
              {/* CHK-4: these line breaks are the layout. They do not reflow between sessions. */}
              <div className="scripture text-[1.25rem]">
                {c.lines.map((line, k) => (
                  <div key={k} className="mb-1">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="label mb-0.5">Cue</dt>
                <dd className="text-neutral-300 font-scripture">“{c.cue}”</dd>
              </div>
              <div>
                <dt className="label mb-0.5">Why it follows</dt>
                <dd className="text-neutral-400 leading-snug">{c.seamNote}</dd>
              </div>
              <div>
                <dt className="label mb-0.5">Landmark</dt>
                <dd className="text-neutral-500">{c.landmark}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>

      <div className="border-t border-ink-700 pt-5 pb-10 space-y-3">
        <p className="text-sm text-neutral-400">
          {seams.length} seam cards will be generated from these boundaries — one per join.
        </p>
        <p className="text-xs text-neutral-600 leading-relaxed">{translation.attribution}</p>
      </div>
    </Shell>
  )
}
