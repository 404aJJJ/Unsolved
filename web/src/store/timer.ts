import { create } from 'zustand'

// Countdown timer used by the Clock app. Lives outside the window so it keeps running when closed.
type Status = 'idle' | 'running' | 'paused' | 'done'

interface TimerState {
  status: Status
  duration: number // seconds
  endsAt: number // epoch ms, while running
  remaining: number // seconds, while paused
  now: number // epoch ms, advanced by one shared 250ms clock so every view of the countdown shows the same second
  start: (seconds: number) => void
  pause: () => void
  resume: () => void
  reset: () => void
  finish: () => void
}

export const useTimer = create<TimerState>((set, get) => ({
  status: 'idle',
  duration: 300,
  endsAt: 0,
  remaining: 0,
  now: Date.now(),
  start: (seconds) => set({ status: 'running', duration: seconds, endsAt: Date.now() + seconds * 1000, remaining: seconds, now: Date.now() }),
  pause: () => {
    const s = get()
    if (s.status !== 'running') return
    set({ status: 'paused', remaining: Math.max(0, Math.ceil((s.endsAt - Date.now()) / 1000)) })
  },
  resume: () => {
    const s = get()
    if (s.status === 'paused') set({ status: 'running', endsAt: Date.now() + s.remaining * 1000, now: Date.now() })
  },
  reset: () => set({ status: 'idle', remaining: 0 }),
  finish: () => set({ status: 'done', remaining: 0 }),
}))

export function secondsLeft(s: Pick<TimerState, 'status' | 'endsAt' | 'remaining' | 'duration'>, now = Date.now()) {
  if (s.status === 'running') return Math.max(0, Math.ceil((s.endsAt - now) / 1000))
  if (s.status === 'paused') return s.remaining
  if (s.status === 'done') return 0
  return s.duration
}
