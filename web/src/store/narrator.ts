import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchNarration, MAX_NARRATION_CHARS } from '../api/narration'
import { useApi } from './api'

// One narrator for the whole desktop: server voice (ElevenLabs) when available, the browser's own voice as a fallback,
// so narration still works with every AI feature off.
type Status = 'idle' | 'loading' | 'playing'

interface NarratorState {
  muted: boolean
  auto: boolean // read the case brief, documents, emails and chats aloud as they open
  volume: number // 0..1
  playingId: string | null
  status: Status
  source: 'server' | 'browser' | null
  error: string
  speak: (id: string, text: string) => Promise<void>
  stop: () => void
  toggleMute: () => void
  setAuto: (auto: boolean) => void
  setVolume: (v: number) => void
}

let audio: HTMLAudioElement | null = null
let controller: AbortController | null = null

function browserVoiceAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Split long text so each request stays under the server limit, on sentence boundaries where possible.
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

export const useNarrator = create<NarratorState>()(
  persist(
    (set, get) => {
      const finish = (): void => {
        set({ playingId: null, status: 'idle', source: null })
      }

      const playChunks = async (id: string, chunks: string[], signal: AbortSignal) => {
        for (const chunk of chunks) {
          const res = await fetchNarration(chunk, signal)
          if (signal.aborted || get().playingId !== id) return 'stopped' as const
          if (!res.ok) return res.error
          const el = new Audio(res.url)
          el.volume = get().muted ? 0 : get().volume
          audio = el
          set({ status: 'playing', source: 'server' })
          await new Promise<void>((resolve) => {
            el.onended = () => resolve()
            el.onerror = () => resolve()
            el.onpause = () => resolve()
            el.play().catch(() => resolve())
          })
          if (get().playingId !== id) return 'stopped' as const
        }
        return 'done' as const
      }

      const speakInBrowser = (id: string, text: string) => {
        if (!browserVoiceAvailable()) {
          set({ error: 'Narration is not available on this device.', playingId: null, status: 'idle' })
          return
        }
        const u = new SpeechSynthesisUtterance(text)
        u.volume = get().muted ? 0 : get().volume
        u.onend = () => get().playingId === id && finish()
        u.onerror = () => get().playingId === id && finish()
        window.speechSynthesis.cancel()
        set({ status: 'playing', source: 'browser' })
        window.speechSynthesis.speak(u)
      }

      return {
        muted: false,
        auto: false, // opt-in: nothing plays until the player presses Listen (or turns auto-read on)
        volume: 0.9,
        playingId: null,
        status: 'idle',
        source: null,
        error: '',

        speak: async (id, text) => {
          get().stop()
          const clean = text.replace(/\s+/g, ' ').trim()
          if (!clean) return
          controller = new AbortController()
          const signal = controller.signal
          set({ playingId: id, status: 'loading', error: '', source: null })

          if (useApi.getState().features.narration) {
            const out = await playChunks(id, chunkText(clean), signal)
            if (out === 'stopped') return
            if (out === 'done') {
              finish()
              return
            }
            // Server voice failed (quota, outage): quietly fall back to the browser voice.
            if (get().playingId === id) speakInBrowser(id, clean)
            return
          }
          speakInBrowser(id, clean)
        },

        stop: () => {
          controller?.abort()
          controller = null
          if (audio) {
            audio.pause()
            audio = null
          }
          if (browserVoiceAvailable()) window.speechSynthesis.cancel()
          set({ playingId: null, status: 'idle', source: null })
        },

        setAuto: (auto) => {
          set({ auto })
          if (!auto) get().stop()
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
      partialize: (s) => ({ muted: s.muted, auto: s.auto, volume: s.volume }),
      // v2: auto-read became opt-in, so anyone who saved the old default (on) gets it switched off.
      version: 2,
      migrate: (state, version) => (version < 2 ? { ...(state as object), auto: false } : state) as NarratorState,
    },
  ),
)
