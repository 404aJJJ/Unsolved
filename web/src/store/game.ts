import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FileDoc, FileId } from '../content/types'

interface GameState {
  unlocked: Partial<Record<FileId, FileDoc>>
  attempts: Partial<Record<FileId, number>>
  hints: Partial<Record<FileId, string[]>>
  opened: FileId[]
  notes: string
  elapsed: number // seconds spent on the case
  unlockedAt: Partial<Record<FileId, number>> // case time when each file was recovered
  suspectNotes: Record<string, string>
  recordUnlock: (id: FileId, doc: FileDoc) => void
  syncUnlocked: (unlocked: Partial<Record<FileId, FileDoc>>) => void
  recordMiss: (id: FileId, hints: string[]) => void
  markOpened: (id: FileId) => void
  setNotes: (notes: string) => void
  tick: () => void
  setSuspectNote: (id: string, note: string) => void
  reset: () => void
}

const initial = { unlocked: {}, attempts: {}, hints: {}, opened: [] as FileId[], notes: '', elapsed: 0, unlockedAt: {}, suspectNotes: {} }

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
      tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),
      setSuspectNote: (id, note) => set((s) => ({ suspectNotes: { ...s.suspectNotes, [id]: note } })),
      reset: () => set(initial),
    }),
    { name: 'unsolved-game' },
  ),
)
