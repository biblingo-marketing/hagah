import type { State } from '../storage/types'
import {
  tunables,
  runEligibilityAccuracy,
  pausePerWord,
  maxNewChunksPerScreenDay,
  playAnswerOnSuccess,
  speakVerseNumbers,
} from './params'

/**
 * Resolves the per-user tunables from protocol.md §10.
 *
 * Only the params marked `perUser: true` may be overridden; everything else is fixed
 * for everyone, and changing it would be a protocol change rather than a setting.
 * Values are clamped to the published range, so a corrupted stored value cannot put
 * the engine outside what the protocol sanctions.
 */
export type PerUserKey =
  | 'runEligibilityAccuracy'
  | 'pausePerWord'
  | 'maxNewChunksPerScreenDay'
  | 'playAnswerOnSuccess'
  | 'speakVerseNumbers'

const DEFAULTS = {
  runEligibilityAccuracy,
  pausePerWord,
  maxNewChunksPerScreenDay,
  playAnswerOnSuccess,
  speakVerseNumbers,
} as const

export function resolve<K extends PerUserKey>(s: State, key: K): (typeof DEFAULTS)[K] {
  const spec = tunables[key] as { default: unknown; min?: number; max?: number; perUser: boolean }
  const fallback = DEFAULTS[key]
  if (!spec?.perUser) return fallback

  const stored = s.overrides?.[key]
  if (stored === undefined || stored === null) return fallback

  if (typeof fallback === 'boolean') {
    return (typeof stored === 'boolean' ? stored : fallback) as (typeof DEFAULTS)[K]
  }
  if (typeof stored !== 'number' || !Number.isFinite(stored)) return fallback

  const min = spec.min ?? Number.NEGATIVE_INFINITY
  const max = spec.max ?? Number.POSITIVE_INFINITY
  return Math.min(max, Math.max(min, stored)) as (typeof DEFAULTS)[K]
}

/** PLAN-2's cap is an integer number of chunks, whatever the slider hands back. */
export function newChunkCap(s: State): number {
  return Math.max(1, Math.round(resolve(s, 'maxNewChunksPerScreenDay')))
}
