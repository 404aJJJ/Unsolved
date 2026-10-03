import { create } from 'zustand'
import type { FileId } from '../content/types'

export type AppId = 'files' | 'mail' | 'messages' | 'notes' | 'board' | 'report' | 'doc'

export interface Win {
  id: string
  app: AppId
  title: string
  x: number
  y: number
  w: number
  h: number
  z: number
  min: boolean
  max: boolean
  fileId?: FileId
}

export const APP_META: Record<AppId, { title: string; w: number; h: number }> = {
  files: { title: 'Case Files', w: 720, h: 460 },
  mail: { title: 'Mail', w: 820, h: 520 },
  messages: { title: 'Messages', w: 640, h: 480 },
  notes: { title: 'Notes', w: 460, h: 420 },
  board: { title: 'Case Board', w: 860, h: 560 },
  report: { title: 'Submit Report', w: 560, h: 440 },
  doc: { title: 'Case Viewer', w: 700, h: 560 },
}

interface WindowState {
  windows: Win[]
  topZ: number
  lockFor: FileId | null
  open: (app: AppId, opts?: { fileId?: FileId; title?: string }) => void
  focus: (id: string) => void
  close: (id: string) => void
  toggleMin: (id: string) => void
  toggleMax: (id: string) => void
  move: (id: string, x: number, y: number) => void
  showLock: (id: FileId | null) => void
  closeAll: () => void
}

let cascade = 0

export const useWindows = create<WindowState>((set, get) => ({
  windows: [],
  topZ: 10,
  lockFor: null,
  open: (app, opts = {}) => {
    const id = opts.fileId ? `${app}-${opts.fileId}` : app
    const existing = get().windows.find((w) => w.id === id)
    if (existing) {
      set((s) => ({
        topZ: s.topZ + 1,
        windows: s.windows.map((w) => (w.id === id ? { ...w, min: false, z: s.topZ + 1 } : w)),
      }))
      return
    }
    const meta = APP_META[app]
    const vw = window.innerWidth
    const vh = window.innerHeight - 40
    const w = Math.min(meta.w, vw - 40)
    const h = Math.min(meta.h, vh - 40)
    const offset = (cascade++ % 6) * 28
    const x = Math.max(10, Math.round((vw - w) / 2 - 120 + offset))
    const y = Math.max(10, Math.round((vh - h) / 2 - 60 + offset))
    set((s) => ({
      topZ: s.topZ + 1,
      windows: [
        ...s.windows,
        { id, app, title: opts.title ?? meta.title, x, y, w, h, z: s.topZ + 1, min: false, max: false, fileId: opts.fileId },
      ],
    }))
  },
  focus: (id) =>
    set((s) => {
      const win = s.windows.find((w) => w.id === id)
      if (!win || (win.z === s.topZ && !win.min)) return s
      return { topZ: s.topZ + 1, windows: s.windows.map((w) => (w.id === id ? { ...w, min: false, z: s.topZ + 1 } : w)) }
    }),
  close: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
  toggleMin: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, min: !w.min } : w)) })),
  toggleMax: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, max: !w.max } : w)) })),
  move: (id, x, y) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  showLock: (lockFor) => set({ lockFor }),
  closeAll: () => set({ windows: [], lockFor: null }),
}))
