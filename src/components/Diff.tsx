import type { Op } from '../engine/diff'

/**
 * The visible diff. Reading it should take a glance: what you said that was right,
 * what you swapped, what you dropped, what you added.
 */
export function DiffView({ ops }: { ops: Op[] }) {
  return (
    <p className="scripture text-[1.15rem] leading-[1.9]">
      {ops.map((o, i) => {
        if (o.op === 'match')
          return (
            <span key={i} className="text-neutral-200">
              {o.expected}{' '}
            </span>
          )
        if (o.op === 'omit')
          return (
            <span key={i} className="text-stability-fragile underline decoration-dotted underline-offset-4">
              {o.expected}{' '}
            </span>
          )
        if (o.op === 'insert')
          return (
            <span key={i} className="text-neutral-600 line-through">
              {o.got}{' '}
            </span>
          )
        return (
          <span key={i} className="whitespace-nowrap">
            <span className="text-neutral-600 line-through">{o.got}</span>{' '}
            <span className="text-stability-working font-semibold">{o.expected}</span>{' '}
          </span>
        )
      })}
    </p>
  )
}

export function DiffLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 mt-3">
      <span>
        <span className="text-stability-working font-semibold">amber</span> — swapped
      </span>
      <span>
        <span className="text-stability-fragile">red</span> — dropped
      </span>
      <span>
        <span className="line-through text-neutral-600">struck</span> — added
      </span>
    </div>
  )
}
