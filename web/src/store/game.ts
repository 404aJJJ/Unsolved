import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Verdict } from '../api/client'
import type { FileDoc, FileId } from '../content/types'

export const TIME_LIMIT = 30 * 60 // seconds in timed mode
export type GameMode = 'timed' | 'untimed'

export type FiledReport = Verdict & { elapsed: number; accused: string; cited: string[]; timedOut: boolean }

export interface ReportDraft {
  culprit: string
  evidence: string[]
  theory: string
}

interface GameState {
  unlocked: Partial<Record<FileId, FileDoc>>
  attempts: Partial<Record<FileId, number>>
  hints: Partial<Record<FileId, string[]>>
  opened: FileId[]
  notes: string
  mode: GameMode
  started: boolean // a game is in progress (mode is locked)
  deadline: number | null // epoch ms while a timed game is on screen. Not saved: closing the game freezes time left
  timeUp: boolean
  elapsed: number // seconds spent on the case
  unlockedAt: Partial<Record<FileId, number>> // case time when each file was recovered
  suspectNotes: Record<string, string>
  draft: ReportDraft
  reportStarted: boolean
  result: FiledReport | null // the filed report; ends the case
  recordUnlock: (id: FileId, doc: FileDoc) => void
  syncUnlocked: (unlocked: Partial<Record<FileId, FileDoc>>) => void
  recordMiss: (id: FileId, hints: string[]) => void
  markOpened: (id: FileId) => void
  setNotes: (notes: string) => void
  startGame: (mode: GameMode) => void
  pauseClock: () => void
  resumeClock: () => void
  tick: () => void
  setSuspectNote: (id: string, note: string) => void
  setDraft: (d: Partial<ReportDraft>) => void
  setReportStarted: (v: boolean) => void
  relock: (id: FileId) => void
  clearResult: () => void
  recordReport: (v: Verdict, filed: { accused: string; cited: string[]; timedOut: boolean }) => void
  reset: () => void
}

const initial = { unlocked: {}, attempts: {}, hints: {}, opened: [] as FileId[], notes: '', mode: 'timed' as GameMode, started: false, deadline: null as number | null, timeUp: false, elapsed: 0, unlockedAt: {}, suspectNotes: {}, draft: { culprit: '', evidence: [], theory: '' } as ReportDraft, reportStarted: false, result: null as FiledReport | null }

export const useGame = create<GameState>()(
  persist(
    (set) => ({
      ...initial,
      syncUnlocked: (unlocked) => set((s) => ({
        unlocked,
        unlockedAt: Object.fromEntries(Object.entries(s.unlockedAt).filter(([id]) => unlocked[id as FileId])),
      })),
      recordUnlock: (id, doc) => set((s) => ({ unlocked: { ...s.unlocked, [id]: doc }, unlockedAt: { ...s.unlockedAt, [id]: s.elapsed } })),
      recordMiss: (id, hints) =>
        set((s) => ({ attempts: { ...s.attempts, [id]: (s.attempts[id] ?? 0) + 1 }, hints: { ...s.hints, [id]: hints } })),
      markOpened: (id) => set((s) => (s.opened.includes(id) ? s : { opened: [...s.opened, id] })),
      setNotes: (notes) => set({ notes }),
      startGame: (mode) =>
        set({ started: true, mode, deadline: mode === 'timed' ? Date.now() + TIME_LIMIT * 1000 : null, elapsed: 0, timeUp: false }),
      // Closing the tab, hiding it, or logging off freezes time left. The deadline is only a display aid while the game is open.
      pauseClock: () =>
        set((s) => {
          if (s.mode !== 'timed' || !s.deadline) return s
          const remaining = Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000))
          return { deadline: null, elapsed: TIME_LIMIT - remaining, timeUp: remaining === 0 }
        }),
      resumeClock: () =>
        set((s) => {
          if (s.mode !== 'timed' || !s.started || s.result || s.timeUp || s.deadline) return s
          const remaining = Math.max(0, TIME_LIMIT - s.elapsed)
          if (remaining === 0) return { timeUp: true }
          return { deadline: Date.now() + remaining * 1000 }
        }),
      // The clock stops once the report is filed. While a timed game is open, elapsed follows the deadline so the
      // countdown does not drift. Untimed mode counts seconds.
      tick: () =>
        set((s) => {
          if (s.result || !s.started) return s
          if (s.mode === 'timed' && s.deadline) {
            const remaining = Math.max(0, Math.ceil((s.deadline - Date.now()) / 1000))
            return { elapsed: TIME_LIMIT - remaining, timeUp: remaining === 0 }
          }
          if (s.mode === 'timed') return s
          return { elapsed: s.elapsed + 1 }
        }),
      setReportStarted: (reportStarted) => set({ reportStarted }),
      relock: (id) =>
        set((s) => {
          const unlocked = { ...s.unlocked }
          const unlockedAt = { ...s.unlockedAt }
          delete unlocked[id]
          delete unlockedAt[id]
          return { unlocked, unlockedAt }
        }),
      clearResult: () => set({ result: null }),
      setDraft: (d) => set((s) => ({ draft: { ...s.draft, ...d } })),
      recordReport: (v, filed) => set((s) => ({ result: { ...v, ...filed, elapsed: s.elapsed } })),
      setSuspectNote: (id, note) => set((s) => ({ suspectNotes: { ...s.suspectNotes, [id]: note } })),
      reset: () => set(initial),
    }),
    {
      name: 'unsolved-game',
      // v2: the report draft's evidence changed from an object to a list of record ids.
      version: 5,
      // The live deadline is not saved. Time left is `elapsed`, so closing the game does not burn the countdown.
      partialize: ({ deadline: _deadline, ...saved }) => saved,
      migrate: (state, version) => {
        const saved = state as GameState & { solved?: unknown }
        const fixed = version < 2 ? { ...saved, draft: { ...saved.draft, evidence: [] } } : saved
        // v3: the report is final (result replaces solved/reportAttempts); drop the old shapes.
        delete fixed.solved
        // v4: timed mode. Older saves keep playing untimed.
        if (version < 4) Object.assign(fixed, { mode: 'untimed', started: fixed.elapsed > 0, deadline: null, timeUp: false })
        // v5: drop a saved wall-clock deadline and keep the seconds already spent.
        if (version < 5) fixed.deadline = null
        delete (fixed as { briefPlayed?: boolean }).briefPlayed
        return fixed
      },
      // Belt and braces for any other stale save: never let a bad shape reach the form.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<GameState>) }
        if (!Array.isArray(merged.draft?.evidence)) merged.draft = { culprit: '', evidence: [], theory: '' }
        return merged
      },
    },
  ),
)
