import { getState, setState } from '../storage/store'
import { pausePerWord } from '../engine/params'

/**
 * Every audio setting lives here. Swapping the browser's speech synthesis for real
 * recorded audio later should mean replacing this file, and nothing else.
 *
 * AUD-4: one fixed voice and reading per program per language. Voices are never
 * swapped mid-program, so the first usable voice is pinned to storage and reused.
 * AUD-5 (a user's own recording preferred over TTS) is the eventual source order;
 * there is no recorder yet, so TTS is all this resolves to today.
 */

export const VOICE_DEFAULTS = {
  /** Slower than conversational. This is a text to recite with, not a podcast. */
  rate: 0.85,
  pitch: 1,
  volume: 1,
  lang: 'en-US',
} as const

export const supportsSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let cachedVoices: SpeechSynthesisVoice[] = []

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!supportsSpeech()) return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) {
    cachedVoices = now
    return Promise.resolve(now)
  }
  return new Promise((resolve) => {
    const done = () => {
      cachedVoices = speechSynthesis.getVoices()
      resolve(cachedVoices)
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1200) // some browsers never fire the event
  })
}

/** Prefer a local, natural English voice; then pin whatever we picked (AUD-4). */
export function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  const en = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  const pool = en.length ? en : voices
  const preferred = [
    /samantha/i, /serena/i, /daniel/i, /google us english/i, /google uk english/i, /natural/i,
  ]
  for (const re of preferred) {
    const hit = pool.find((v) => re.test(v.name))
    if (hit) return hit
  }
  return pool.find((v) => v.localService) ?? pool[0]
}

export async function resolveVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = cachedVoices.length ? cachedVoices : await loadVoices()
  const pinned = getState().voice.uri
  if (pinned) {
    const found = voices.find((v) => v.voiceURI === pinned)
    if (found) return found
  }
  const picked = pickVoice(voices)
  // AUD-4: pin it. The program keeps this voice from here on.
  if (picked && picked.voiceURI !== pinned) {
    setState((s) => ({ ...s, voice: { ...s.voice, uri: picked.voiceURI } }))
  }
  return picked
}

export function rate(): number {
  return getState().voice.rate || VOICE_DEFAULTS.rate
}

export function setRate(r: number) {
  setState((s) => ({ ...s, voice: { ...s.voice, rate: r } }))
}

export function cancelSpeech() {
  if (supportsSpeech()) speechSynthesis.cancel()
}

/** Speaks, and resolves when the utterance ends or is cancelled. Never rejects. */
export function speak(text: string, opts: { rate?: number } = {}): Promise<void> {
  if (!supportsSpeech() || !text.trim()) return Promise.resolve()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = opts.rate ?? rate()
    u.pitch = VOICE_DEFAULTS.pitch
    u.volume = VOICE_DEFAULTS.volume
    u.lang = VOICE_DEFAULTS.lang
    const voice = cachedVoices.find((v) => v.voiceURI === getState().voice.uri)
    if (voice) u.voice = voice
    let settled = false
    const finish = () => {
      if (!settled) {
        settled = true
        resolve()
      }
    }
    u.onend = finish
    u.onerror = finish
    // Some mobile browsers drop long utterances silently; a watchdog keeps the
    // commute loop moving rather than stalling at a red light.
    const words = text.trim().split(/\s+/).length
    setTimeout(finish, Math.max(4000, (words / (2.6 * (u.rate || 1))) * 1000 + 4000))
    speechSynthesis.speak(u)
  })
}

/** AUD-3: silence scales with chunk length. pausePerWord = 0.45 s. */
export function silenceMsFor(text: string, perWord = pausePerWord): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.round(words * perWord * 1000)
}

/** CHK-2: the spoken verse number is one component of the compound cue. */
export function spokenRef(ref: string): string {
  return ref.replace('–', ' to ').replace(':', ' ')
}
