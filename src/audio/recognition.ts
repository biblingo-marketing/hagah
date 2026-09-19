/**
 * Web Speech API recognition.
 *
 * DIFF-4 is the hard rule here: speech scoring never gates progress. Everything this
 * module exposes can fail, be unsupported, or be denied, and every flow that uses it
 * has a typed path that always works. `supported()` returning false is a normal
 * outcome, not an error state — iOS Safari in particular is unreliable.
 */

type SRCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error?: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [i: number]: { isFinal: boolean; 0: { transcript: string } }
  }
}

function ctor(): SRCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SRCtor | null
}

export const supported = () => ctor() !== null

export type Listener = {
  stop: () => void
}

export function listen(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError?: (reason: string) => void,
): Listener | null {
  const C = ctor()
  if (!C) return null

  let rec: SpeechRecognitionLike
  try {
    rec = new C()
  } catch {
    onError?.('unavailable')
    return null
  }

  rec.lang = 'en-US'
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1

  let finalText = ''
  let stopped = false

  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript + ' '
      else interim += r[0].transcript + ' '
    }
    onTranscript((finalText + interim).trim(), false)
  }

  rec.onerror = (e) => {
    const reason = e?.error ?? 'error'
    // "no-speech" and "aborted" are ordinary, not failures worth surfacing.
    if (reason !== 'no-speech' && reason !== 'aborted') onError?.(reason)
  }

  rec.onend = () => {
    if (!stopped) {
      // Mobile browsers end the session on their own schedule; restart while listening.
      try {
        rec.start()
      } catch {
        /* already running, or the page lost the mic */
      }
    } else {
      onTranscript(finalText.trim(), true)
    }
  }

  try {
    rec.start()
  } catch {
    onError?.('start-failed')
    return null
  }

  return {
    stop: () => {
      stopped = true
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
      onTranscript(finalText.trim(), true)
    },
  }
}
