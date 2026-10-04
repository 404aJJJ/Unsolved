import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchNarration, MAX_NARRATION_CHARS } from '../api/narration'
import type { Segment } from '../content/narration'
import { useApi } from './api'

// Reads character speech aloud: the server voice (ElevenLabs, one voice per character) when it is available, the browser's
// own voice as a fallback, so it still works with every AI feature off. Nothing plays until the player presses Listen.
type Status = 'idle' | 'loading' | 'playing'

interface NarratorState {
  muted: boolean
  volume: number // 0..1
  playingId: string | null
  status: Status
  name: string // who is speaking right now
  index: number // which segment of the current script is playing (-1 when idle)
  source: 'server' | 'browser' | null
  speak: (id: string, segments: Segment[]) => Promise<void>
  stop: () => void
  toggleMute: () => void
  setVolume: (v: number) => void
}

let audio: HTMLAudioElement | null = null
let controller: AbortController | null = null

function browserVoiceAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Split very long speech on sentence boundaries so each request stays under the server limit.
export function chunkText(text: string, max = MAX_NARRATION_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  const parts: string[] = []
  let rest = clean
  while (rest.length > max) {
    const cut = Math.max(rest.lastIndexOf('. ', max), rest.lastIndexOf('? ', max), rest.lastIndexOf('! ', max))
    const at = cut > max * 0.5 ? cut + 1 : max
    parts.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }
  if (rest) parts.push(rest)
  return parts
}

// Browser fallback voices all sound alike, so vary the pitch a little per speaker to keep characters distinguishable.
const PITCH: Record<string, number> = { mw: 0.9, nb: 0.8, aw: 0.7, bm: 1.0, ow: 1.1, lj: 1.3, supervisor: 0.85, friend: 1.15 }

export const useNarrator = create<NarratorState>()(
  persist(
    (set, get) => {
      const idle = { playingId: null, status: 'idle' as Status, name: '', index: -1, source: null }

      const playUrl = (url: string, id: string) =>
        new Promise<void>((resolve) => {
          const el = new Audio(url)
          el.volume = get().muted ? 0 : get().volume
          audio = el
          el.onended = () => resolve()
          el.onerror = () => resolve()
          el.onpause = () => resolve()
          if (get().playingId !== id) return resolve()
          el.play().catch(() => resolve())
        })

      const speakInBrowser = (seg: Segment) =>
        new Promise<void>((resolve) => {
          if (!browserVoiceAvailable()) return resolve()
          const u = new SpeechSynthesisUtterance(seg.text)
          u.volume = get().muted ? 0 : get().volume
          u.pitch = PITCH[seg.speaker] ?? 1
          u.onend = () => resolve()
          u.onerror = () => resolve()
          window.speechSynthesis.speak(u)
        })

      return {
        muted: false,
        volume: 0.9,
        ...idle,

        speak: async (id, segments) => {
          get().stop()
          const lines = segments.map((s, i) => ({ ...s, i })).filter((s) => s.speaker && s.text.trim())
          if (lines.length === 0) return
          controller = new AbortController()
          const signal = controller.signal
          set({ playingId: id, status: 'loading', name: lines[0].name, index: lines[0].i, source: null })
          const server = useApi.getState().features.narration
          let serverOk = server

          // Fetch the next line while the current one plays, so a conversation flows without gaps.
          const fetchLine = (seg: Segment) => (serverOk ? fetchNarration(seg.text.slice(0, MAX_NARRATION_CHARS), seg.speaker, signal) : null)
          let pending = fetchLine(lines[0])

          for (let k = 0; k < lines.length; k++) {
            const seg = lines[k]
            if (get().playingId !== id || signal.aborted) return
            const res = pending ? await pending : null
            if (get().playingId !== id || signal.aborted) return
            pending = k + 1 < lines.length ? fetchLine(lines[k + 1]) : null
            set({ name: seg.name, index: seg.i })
            if (res?.ok) {
              set({ status: 'playing', source: 'server' })
              await playUrl(res.url, id)
            } else {
              // Server voice failed (quota, outage, voice missing): quietly use the browser voice from here on.
              serverOk = false
              pending = null
              set({ status: 'playing', source: 'browser' })
              await speakInBrowser(seg)
            }
          }
          if (get().playingId === id) set(idle)
        },

        stop: () => {
          controller?.abort()
          controller = null
          if (audio) {
            audio.pause()
            audio = null
          }
          if (browserVoiceAvailable()) window.speechSynthesis.cancel()
          set(idle)
        },

        toggleMute: () => {
          const muted = !get().muted
          set({ muted })
          if (audio) audio.volume = muted ? 0 : get().volume
        },

        setVolume: (volume) => {
          set({ volume, muted: false })
          if (audio) audio.volume = volume
        },
      }
    },
    {
      name: 'unsolved-narrator',
      partialize: (s) => ({ muted: s.muted, volume: s.volume }),
      // v3: auto-read was removed (narration is character speech only, started by the player); drop the old field.
      version: 3,
      migrate: (state) => {
        const { muted, volume } = (state ?? {}) as { muted?: boolean; volume?: number }
        return { muted: muted ?? false, volume: volume ?? 0.9 } as NarratorState
      },
    },
  ),
)
