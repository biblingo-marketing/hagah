import { useEffect, useState } from 'react'
import type { State } from './types'

const KEY = 'hagah.v1'

export const emptyState: State = {
  version: 1,
  onboarded: false,
  blocks: [],
  programStart: null,
  cards: {},
  reviews: [],
  repairQueue: [],
  integrityDone: [],
  overrides: {},
  voice: { uri: null, rate: 0.9 },
  lastRandomEntryDrill: null,
}

function read(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState
    const parsed = JSON.parse(raw) as State
    if (parsed.version !== 1) return emptyState
    // Revive FSRS Date fields, which JSON flattens to strings.
    for (const c of Object.values(parsed.cards)) {
      const f = c.fsrs as unknown as Record<string, unknown>
      for (const k of ['due', 'last_review']) {
        if (typeof f[k] === 'string') f[k] = new Date(f[k] as string)
      }
    }
    return { ...emptyState, ...parsed }
  } catch {
    return emptyState
  }
}

let state: State = typeof localStorage === 'undefined' ? emptyState : read()
const listeners = new Set<() => void>()

function write(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked (private mode). The session still works in memory;
    // losing it is better than crashing mid-recitation.
  }
  listeners.forEach((l) => l())
}

export function getState(): State {
  return state
}

export function setState(fn: (s: State) => State) {
  write(fn(state))
}

export function useStore(): State {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return state
}

export function resetAll() {
  write(emptyState)
}

/** Exported so the settings screen can hand Nick his data without a server. */
export function exportJson(): string {
  return JSON.stringify(state, null, 2)
}
